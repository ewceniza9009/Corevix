using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Corevix.Application;
using Corevix.Core;

namespace Corevix.Api.Endpoints
{
    public static class TransactionEndpoints
    {
        public static void MapTransactionEndpoints(this IEndpointRouteBuilder routes)
        {
            var group = routes.MapGroup("/accounts/{id:guid}").RequireAuthorization(policy => policy.RequireRole("Customer", "Staff", "Approver"));

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

            // --- Deposits & Withdrawals ---
            group.MapPost("/deposit", async (Guid id, [FromBody] DepositRequest request, IMediator mediator) =>
            {
                var command = new DepositCommand(id, request.Amount, request.Description, request.IdempotencyKey);
                var transactionId = await mediator.Send(command);
                return Results.Ok(new { TransactionId = transactionId });
            });

            group.MapPost("/withdraw", async (Guid id, [FromBody] WithdrawRequest request, IMediator mediator) =>
            {
                var command = new WithdrawalCommand(id, request.Amount, request.Description, request.IdempotencyKey);
                var transactionId = await mediator.Send(command);
                return Results.Ok(new { TransactionId = transactionId });
            });

            // --- Passbook & Statements ---
            group.MapGet("/passbook", async (Guid id, IMediator mediator) =>
            {
                var lines = await mediator.Send(new GetPassbookQuery(id));
                return Results.Ok(lines);
            });

            // --- Status Override ---
            group.MapPost("/status", async (Guid id, [FromBody] UpdateStatusRequest request, IMediator mediator) =>
            {
                var command = new UpdateAccountStatusCommand(
                    id,
                    request.Status,
                    request.LimitOverridePerTransaction,
                    request.LimitOverrideDaily,
                    request.LimitOverrideMonthly
                );
                var success = await mediator.Send(command);
                return Results.Ok(new { Success = success });
            })
            .RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));

            // --- Time Deposits & Loans ---
            group.MapPost("/time-deposits", async (Guid id, [FromBody] TimeDepositRequest request, IMediator mediator) =>
            {
                // Note: 'id' here is the source savings/checking account to fund it
                var command = new OpenTimeDepositCommand(Guid.Empty, id, request.Amount, request.TermDays);
                // We resolve customer ID in handler or pass via token. For simplicity, we bypass sourceCustomerId validation if the source account belongs to them.
                // Let's pass the customerId as Guid.Empty and resolve it inside the command.
                var tdId = await mediator.Send(command);
                return Results.Ok(new { TimeDepositAccountId = tdId });
            });

            group.MapPost("/loans", async (Guid id, [FromBody] LoanRequest request, IMediator mediator) =>
            {
                // 'id' is the disbursal savings/checking account
                var command = new ApplyForLoanCommand(Guid.Empty, request.PrincipalAmount, request.TermMonths, id);
                var loanId = await mediator.Send(command);
                return Results.Ok(new { LoanAccountId = loanId });
            });

            routes.MapPost("/accounts/{loanId:guid}/loans/approve", async (Guid loanId, [FromBody] ApproveLoanRequest request, IMediator mediator) =>
            {
                var command = new ApproveLoanCommand(loanId, request.Approved);
                var success = await mediator.Send(command);
                return Results.Ok(new { Success = success });
            })
            .RequireAuthorization(policy => policy.RequireRole("Staff", "Approver"));

            // --- Card Management ---
            group.MapPost("/cards/lock", async (Guid id, IMediator mediator) =>
            {
                var command = new ToggleCardLockCommand(id);
                var isLocked = await mediator.Send(command);
                return Results.Ok(new { IsCardLocked = isLocked });
            });

            group.MapPost("/cards/limits", async (Guid id, [FromBody] CardLimitsRequest request, IMediator mediator) =>
            {
                var command = new UpdateCardLimitsCommand(id, request.PerTransactionLimit, request.DailyLimit);
                var success = await mediator.Send(command);
                return Results.Ok(new { Success = success });
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

            // --- Global PayMongo Webhook Endpoint ---
            routes.MapPost("/api/webhooks/paymongo", async (
                HttpContext context,
                [FromBody] JsonElement payload,
                IMediator mediator) =>
            {
                if (!context.Request.Headers.ContainsKey("paymongo-signature"))
                {
                    return Results.BadRequest("Missing PayMongo signature.");
                }

                try
                {
                    var data = payload.GetProperty("data");
                    var attributes = data.GetProperty("attributes");
                    var payloadData = attributes.GetProperty("data");
                    var subAttributes = payloadData.GetProperty("attributes");
                    
                    var amountCents = subAttributes.GetProperty("amount").GetDecimal();
                    var amount = amountCents / 100m;
                    
                    var billingDesc = subAttributes.GetProperty("description").GetString() ?? "";
                    if (Guid.TryParse(billingDesc, out var accountId))
                    {
                        var command = new DepositCommand(
                            accountId,
                            amount,
                            "GCash Cash-In via PayMongo",
                            Guid.NewGuid().ToString()
                        );
                        var txId = await mediator.Send(command);
                        return Results.Ok(new { success = true, TransactionId = txId });
                    }
                    return Results.BadRequest("Invalid account ID in payment description.");
                }
                catch (Exception ex)
                {
                    return Results.BadRequest($"Error processing webhook: {ex.Message}");
                }
            })
            .AllowAnonymous();
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

    public record DepositRequest(
        decimal Amount,
        string Description,
        string IdempotencyKey);

    public record WithdrawRequest(
        decimal Amount,
        string Description,
        string IdempotencyKey);

    public record UpdateStatusRequest(
        AccountStatus? Status,
        decimal? LimitOverridePerTransaction,
        decimal? LimitOverrideDaily,
        decimal? LimitOverrideMonthly);

    public record TimeDepositRequest(
        decimal Amount,
        int TermDays);

    public record LoanRequest(
        decimal PrincipalAmount,
        int TermMonths);

    public record ApproveLoanRequest(
        bool Approved);

    public record CardLimitsRequest(
        decimal PerTransactionLimit,
        decimal DailyLimit);
}
