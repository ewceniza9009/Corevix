using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Hangfire;
using Hangfire.PostgreSql;
using Serilog;
using FluentValidation;
using Corevix.Common;
using Corevix.Infrastructure;
using Corevix.Persistence;
using Corevix.Application;
using Corevix.Api.Middleware;
using Corevix.Api.Hubs;
using Corevix.Api.Endpoints;
using MediatR;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Corevix.Application.Security;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, TenantProvider>();
builder.Services.AddScoped<TenantAndAuditSaveChangesInterceptor>();

var pgConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("PostgreSQL connection string not configured.");

builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var interceptor = sp.GetRequiredService<TenantAndAuditSaveChangesInterceptor>();
    options.UseNpgsql(pgConnectionString)
           .AddInterceptors(interceptor);
});
builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

var mongoConnectionString = builder.Configuration["MongoDb:ConnectionString"] 
    ?? throw new InvalidOperationException("MongoDB connection string not configured.");
var mongoDbName = builder.Configuration["MongoDb:DatabaseName"] ?? "corevix_auditing";

builder.Services.AddSingleton<MongoDbContext>(sp =>
    new MongoDbContext(mongoConnectionString, mongoDbName));

var redisConnectionString = builder.Configuration["Redis:ConnectionString"] ?? "localhost:31779";

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(redisConnectionString));
builder.Services.AddScoped<ICacheService, RedisCacheService>();
builder.Services.AddScoped<IComplianceScreeningService, Corevix.Infrastructure.MockComplianceScreeningService>();
builder.Services.AddScoped<IAuditLogService, Corevix.Infrastructure.MongoAuditLogService>();

builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? throw new InvalidOperationException("JWT SecretKey is not configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CorevixBanking";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "CorevixPortals";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        ClockSkew = TimeSpan.Zero
    };
});
builder.Services.AddAuthorization();

builder.Services.AddValidatorsFromAssembly(typeof(ICacheService).Assembly);

builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(ICacheService).Assembly);
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionLimitBehavior<,>));
    cfg.AddOpenBehavior(typeof(FraudDetectionBehavior<,>));
    cfg.AddOpenBehavior(typeof(IdempotencyBehavior<,>));
});

builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(pgConnectionString)));
builder.Services.AddHangfireServer();

builder.Services.AddScoped<OutboxProcessor>();

builder.Services.AddSignalR();

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self'; object-src 'none';");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("DefaultCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => new { Message = "Welcome to Corevix Banking API", Status = "Healthy", Version = "1.0.0" });
app.MapHealthChecks("/health");

app.MapHub<NotificationHub>("/hubs/notifications");

app.MapHangfireDashboard("/hangfire");

app.MapCustomerEndpoints();
app.MapAccountEndpoints();
app.MapTransactionEndpoints();
app.MapComplianceEndpoints();
app.MapAuthEndpoints();


using (var scope = app.Services.CreateScope())
{
    var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    
    recurringJobManager.AddOrUpdate<OutboxProcessor>(
        "OutboxMessageProcessor",
        processor => processor.ProcessPendingMessagesAsync(),
        "*/5 * * * * *"
    );

    recurringJobManager.AddOrUpdate<InterestCalculationJob>(
        "InterestCalculationProcessor",
        job => job.AccrueDailyInterestAsync(),
        Cron.Daily
    );
}

// Run database migrations and apply seed configurations dynamically on host startup
await DbInitializer.InitializeAsync(app.Services);

app.Run();
