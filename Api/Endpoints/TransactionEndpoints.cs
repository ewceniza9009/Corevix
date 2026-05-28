using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using System;
using System.Threading.Tasks;
using Corevix.Application;
using Corevix.Core;

namespace Corevix.Api.Endpoints
{
    public static class TransactionEndpoints
    {
        public static void MapTransactionEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/accounts/{id:guid}");

            group.MapPost("/transfers", async (Guid id, [FromBody] TransferRequest request, IMediator mediator) =>
            {
                var command = new TransferCommand(
                    id,
                    request.DestinationAccountNumber,
                    request.Amount,
                    request.Description,
                    request.IsExternal,
                    request.ExternalBankName,
                    request.IdempotencyKey
                );
                var transactionId = await mediator.Send(command);
                return Results.Ok(new { TransactionId = transactionId });
            });

            group.MapPost("/bill-payments", async (Guid id, [FromBody] BillPaymentRequest request, IMediator mediator) =>
            {
                var command = new BillPaymentCommand(
                    id,
                    request.BillerCode,
                    request.ReferenceNumber,
                    request.Amount,
                    request.IdempotencyKey
                );
                var transactionId = await mediator.Send(command);
                return Results.Ok(new { TransactionId = transactionId });
            });

            group.MapGet("/qr", async (Guid id, IMediator mediator) =>
            {
                var qrString = await mediator.Send(new GenerateQrQuery(id));
                return Results.Ok(new { QrCodeString = qrString });
            });

            group.MapPost("/qr-pay", async (Guid id, [FromBody] QrPaymentRequest request, IMediator mediator) =>
            {
                var command = new ProcessQrPaymentCommand(
                    id,
                    request.QrCodeString,
                    request.Amount,
                    request.Description,
                    request.IdempotencyKey
                );
                var transactionId = await mediator.Send(command);
                return Results.Ok(new { TransactionId = transactionId });
            });

            group.MapGet("/transactions", async (
                Guid id,
                [FromQuery] int? pageNumber,
                [FromQuery] int? pageSize,
                [FromQuery] TransactionType? type,
                [FromQuery] DateTime? startDate,
                [FromQuery] DateTime? endDate,
                IMediator mediator) =>
            {
                var query = new GetTransactionHistoryQuery(
                    id,
                    pageNumber ?? 1,
                    pageSize ?? 10,
                    type,
                    startDate,
                    endDate
                );
                var result = await mediator.Send(query);
                return Results.Ok(result);
            });

            group.MapGet("/transactions/export", async (
                Guid id,
                [FromQuery] TransactionType? type,
                [FromQuery] DateTime? startDate,
                [FromQuery] DateTime? endDate,
                IMediator mediator) =>
            {
                var query = new ExportTransactionHistoryQuery(id, type, startDate, endDate);
                var csvBytes = await mediator.Send(query);
                return Results.File(csvBytes, "text/csv", $"transactions-{id}.csv");
            });
        }
    }

    public record TransferRequest(
        string DestinationAccountNumber,
        decimal Amount,
        string Description,
        bool IsExternal,
        string? ExternalBankName,
        string IdempotencyKey);

    public record BillPaymentRequest(
        string BillerCode,
        string ReferenceNumber,
        decimal Amount,
        string IdempotencyKey);

    public record QrPaymentRequest(
        string QrCodeString,
        decimal Amount,
        string Description,
        string IdempotencyKey);
}
