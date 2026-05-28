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

            group.MapPost("/register", async (RegisterCustomerCommand command, IMediator mediator) =>
            {
                var customerId = await mediator.Send(command);
                return Results.Ok(new { CustomerId = customerId });
            });

            group.MapPost("/{id:guid}/approve-kyc", async (Guid id, IMediator mediator) =>
            {
                await mediator.Send(new ApproveKycCommand(id));
                return Results.Ok(new { Message = "KYC status approved successfully." });
            });
        }
    }
}
