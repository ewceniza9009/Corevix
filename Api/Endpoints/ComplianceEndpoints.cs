using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using MediatR;
using System.Threading.Tasks;
using Corevix.Application;

namespace Corevix.Api.Endpoints
{
    public static class ComplianceEndpoints
    {
        public static void MapComplianceEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/compliance").RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));

            group.MapGet("/gl-reconciliation", async (IMediator mediator) =>
            {
                var report = await mediator.Send(new GlReconciliationQuery());
                return Results.Ok(report);
            });
        }
    }
}
