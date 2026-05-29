using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using MediatR;
using System;
using System.Threading.Tasks;
using Corevix.Application;

namespace Corevix.Api.Endpoints
{
    public static class CustomerEndpoints
    {
        public static void MapCustomerEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/customers");

            group.MapGet("/", async (IMediator mediator) =>
            {
                var customers = await mediator.Send(new GetAllCustomersQuery());
                return Results.Ok(customers);
            })
            .RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));

            group.MapPost("/register", async (RegisterCustomerCommand command, IMediator mediator) =>
            {
                var customerId = await mediator.Send(command);
                return Results.Ok(new { CustomerId = customerId });
            })
            .AllowAnonymous();

            group.MapPost("/{id:guid}/approve-kyc", async (Guid id, IMediator mediator) =>
            {
                await mediator.Send(new ApproveKycCommand(id));
                return Results.Ok(new { Message = "KYC status approved successfully." });
            })
            .RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));

            group.MapGet("/{id:guid}/accounts", async (Guid id, IMediator mediator) =>
            {
                var accounts = await mediator.Send(new GetCustomerAccountsQuery(id));
                return Results.Ok(accounts);
            })
            .RequireAuthorization(policy => policy.RequireRole("Customer", "Staff", "Approver"));

            group.MapGet("/pending-kyc", async (IMediator mediator) =>
            {
                var customers = await mediator.Send(new GetPendingKycCustomersQuery());
                return Results.Ok(customers);
            })
            .RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));
        }
    }
}
