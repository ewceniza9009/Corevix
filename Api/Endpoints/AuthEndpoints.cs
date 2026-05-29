using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using MediatR;
using Corevix.Application.Security;

namespace Corevix.Api.Endpoints
{
    public static class AuthEndpoints
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/auth").WithTags("Authentication");

            group.MapPost("/login", async (LoginCommand command, IMediator mediator) =>
            {
                try
                {
                    var result = await mediator.Send(command);
                    return Results.Ok(result);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
                }
            })
            .WithName("Login")
            .WithOpenApi();

            group.MapPost("/refresh", async (RefreshTokenCommand command, IMediator mediator) =>
            {
                try
                {
                    var result = await mediator.Send(command);
                    return Results.Ok(result);
                }
                catch (UnauthorizedAccessException ex)
                {
                    return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
                }
            })
            .WithName("RefreshToken")
            .WithOpenApi();
        }
    }
}
