using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Hangfire;
using Hangfire.PostgreSql;
using Corevix.Common;
using Corevix.Infrastructure;
using Corevix.Persistence;
using Corevix.Application;
using Corevix.Api.Middleware;
using Corevix.Api.Hubs;
using MediatR;

var builder = WebApplication.CreateBuilder(args);

// 1. Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:8100", "https://localhost:4200", "https://localhost:8100")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 2. Add IHttpContextAccessor & Tenant Provider
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantProvider, TenantProvider>();

// 3. Add Entity Framework Core with Tenant and Audit Interceptor
builder.Services.AddScoped<TenantAndAuditSaveChangesInterceptor>();
builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
{
    var interceptor = sp.GetRequiredService<TenantAndAuditSaveChangesInterceptor>();
    options.UseNpgsql("Host=localhost;Port=5432;Database=corevix_db;Username=postgres;Password=postgres")
           .AddInterceptors(interceptor);
});

// 4. Add Redis Caching
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect("localhost:6379"));
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// 5. Add MediatR & Pipeline Behaviors
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(ICacheService).Assembly); // Registers from Application assembly (where ICacheService resides)
    cfg.AddOpenBehavior(typeof(IdempotencyBehavior<,>));
});

// 6. Add Hangfire Background Jobs
builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection("Host=localhost;Port=5432;Database=corevix_db;Username=postgres;Password=postgres")));
builder.Services.AddHangfireServer();

// 7. Add SignalR
builder.Services.AddSignalR();

// 8. OpenAPI & Health Checks
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

// 9. Exception Handling
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Basic Security Headers Middleware
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

// Map Endpoints
app.MapGet("/", () => new { Message = "Welcome to Corevix Banking API", Status = "Healthy", Version = "1.0.0" });
app.MapHealthChecks("/health");

// Map Real-time SignalR Hubs
app.MapHub<NotificationHub>("/hubs/notifications");

// Map Hangfire Dashboard (Basic local or dev mode availability)
app.MapHangfireDashboard("/hangfire");

app.Run();
