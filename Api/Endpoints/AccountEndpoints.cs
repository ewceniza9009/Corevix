using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using MediatR;
using System;
using System.Threading.Tasks;
using Corevix.Application;

namespace Corevix.Api.Endpoints
{
    public static class AccountEndpoints
    {
        public static void MapAccountEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/accounts");

            group.MapPost("/", async (OpenAccountCommand command, IMediator mediator) =>
            {
                var accountId = await mediator.Send(command);
                return Results.Ok(new { AccountId = accountId });
            });

            group.MapGet("/{id:guid}", async (Guid id, IMediator mediator) =>
            {
                var details = await mediator.Send(new GetAccountDetailsQuery(id));
                return Results.Ok(details);
            });

            group.MapGet("/{id:guid}/balance", async (Guid id, IMediator mediator) =>
            {
                var balance = await mediator.Send(new GetBalanceQuery(id));
                return Results.Ok(new { Balance = balance });
            });
        }
    }
}
