using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record BillPaymentCommand(
        Guid SourceAccountId,
        string BillerCode,
        string ReferenceNumber,
        decimal Amount,
        string IdempotencyKey) : IRequest<Guid>, IIdempotentCommand, IFinancialCommand;

    public class BillPaymentCommandValidator : AbstractValidator<BillPaymentCommand>
    {
        private static readonly HashSet<string> ValidBillers = new(StringComparer.OrdinalIgnoreCase)
        {
            "MERALCO", "MANILA_WATER", "PLDT", "GLOBE", "SM_DEBT"
        };

        public BillPaymentCommandValidator()
        {
            RuleFor(x => x.SourceAccountId).NotEmpty();
            RuleFor(x => x.BillerCode)
                .NotEmpty()
                .Must(b => ValidBillers.Contains(b))
                .WithMessage("Unsupported biller code.");
            RuleFor(x => x.ReferenceNumber).NotEmpty().MinimumLength(6);
            RuleFor(x => x.Amount).GreaterThan(0);
            RuleFor(x => x.IdempotencyKey).NotEmpty();
        }
    }

    public class BillPaymentCommandHandler : IRequestHandler<BillPaymentCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ICacheService _cacheService;

        public BillPaymentCommandHandler(IApplicationDbContext dbContext, ICacheService cacheService)
        {
            _dbContext = dbContext;
            _cacheService = cacheService;
        }

        public async Task<Guid> Handle(BillPaymentCommand request, CancellationToken cancellationToken)
        {
            var sourceAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.SourceAccountId, cancellationToken);

            if (sourceAccount == null)
            {
                throw new KeyNotFoundException($"Source account with ID {request.SourceAccountId} was not found.");
            }

            if (sourceAccount.Status != AccountStatus.Active)
            {
                throw new InvalidOperationException("Source account is not active.");
            }

            if (sourceAccount.Balance < request.Amount)
            {
                throw new InvalidOperationException("Insufficient funds.");
            }

            // Deduct from source
            sourceAccount.Balance -= request.Amount;

            var transaction = new Transaction
            {
                ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                Amount = request.Amount,
                TransactionType = TransactionType.BillPayment,
                Status = TransactionStatus.Completed,
                SourceAccountId = sourceAccount.Id,
                Description = $"Bill Payment to {request.BillerCode.ToUpperInvariant()} - Ref: {request.ReferenceNumber}"
            };

            _dbContext.Transactions.Add(transaction);

            // Double-entry: Debit source account
            var sourceLedger = new LedgerEntry
            {
                AccountId = sourceAccount.Id,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = true
            };
            _dbContext.LedgerEntries.Add(sourceLedger);

            // Queue Domain Event via Outbox
            var domainEvent = new BillPaymentExecutedEvent(
                transaction.Id,
                sourceAccount.Id,
                request.BillerCode,
                request.ReferenceNumber,
                request.Amount,
                _dbContext.CurrentTenantId
            );

            var eventType = typeof(BillPaymentExecutedEvent);
            var outboxMessage = new OutboxMessage
            {
                Type = eventType.AssemblyQualifiedName ?? eventType.FullName ?? eventType.Name,
                Content = JsonSerializer.Serialize(domainEvent),
                OccurredOnUtc = DateTime.UtcNow
            };
            _dbContext.OutboxMessages.Add(outboxMessage);

            await _dbContext.SaveChangesAsync(cancellationToken);

            // Evict cache for balances
            await _cacheService.RemoveAsync($"accounts:{sourceAccount.Id}:details");
            await _cacheService.RemoveAsync($"accounts:{sourceAccount.AccountNumber}:details");

            return transaction.Id;
        }
    }
}
