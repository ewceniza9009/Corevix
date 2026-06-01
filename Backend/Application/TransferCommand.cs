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
    public record TransferCommand(
        Guid SourceAccountId,
        string DestinationAccountNumber,
        decimal Amount,
        string Description,
        bool IsExternal,
        string? ExternalBankName,
        string IdempotencyKey) : IRequest<Guid>, IIdempotentCommand, IFinancialCommand;

    public class TransferCommandValidator : AbstractValidator<TransferCommand>
    {
        public TransferCommandValidator()
        {
            RuleFor(x => x.SourceAccountId).NotEmpty();
            RuleFor(x => x.DestinationAccountNumber).NotEmpty();
            RuleFor(x => x.Amount).GreaterThan(0);
            RuleFor(x => x.IdempotencyKey).NotEmpty();
            
            RuleFor(x => x.ExternalBankName)
                .NotEmpty()
                .When(x => x.IsExternal)
                .WithMessage("External bank name is required for external transfers.");
        }
    }

    public class TransferCommandHandler : IRequestHandler<TransferCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ICacheService _cacheService;

        public TransferCommandHandler(IApplicationDbContext dbContext, ICacheService cacheService)
        {
            _dbContext = dbContext;
            _cacheService = cacheService;
        }

        public async Task<Guid> Handle(TransferCommand request, CancellationToken cancellationToken)
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

            Guid? destinationAccountId = null;
            Account? destinationAccount = null;

            if (!request.IsExternal)
            {
                destinationAccount = await _dbContext.Accounts
                    .FirstOrDefaultAsync(a => a.AccountNumber == request.DestinationAccountNumber, cancellationToken);

                if (destinationAccount == null)
                {
                    throw new KeyNotFoundException($"Destination account with number {request.DestinationAccountNumber} was not found.");
                }

                if (destinationAccount.Id == sourceAccount.Id)
                {
                    throw new InvalidOperationException("Source and destination accounts must be different.");
                }

                if (destinationAccount.Status != AccountStatus.Active)
                {
                    throw new InvalidOperationException("Destination account is not active.");
                }

                destinationAccountId = destinationAccount.Id;
            }

            // Deduct from source
            sourceAccount.Balance -= request.Amount;

            if (destinationAccount != null)
            {
                // Add to destination for intra-bank
                destinationAccount.Balance += request.Amount;
            }

            var transaction = new Transaction
            {
                ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                Amount = request.Amount,
                TransactionType = TransactionType.Transfer,
                Status = TransactionStatus.Completed,
                SourceAccountId = sourceAccount.Id,
                DestinationAccountId = destinationAccountId,
                Description = request.IsExternal 
                    ? $"{request.Description} (To {request.ExternalBankName} - {request.DestinationAccountNumber})"
                    : (destinationAccount != null && sourceAccount.BranchCode != destinationAccount.BranchCode)
                        ? $"Inter-Branch ({sourceAccount.BranchCode} -> {destinationAccount.BranchCode}) | {request.Description}"
                        : request.Description
            };

            _dbContext.Transactions.Add(transaction);

            // Double-entry Ledger Entries
            (string sourceGlCode, string sourceGlName) = sourceAccount.AccountType switch
            {
                AccountType.Savings => (GlAccount.SavingsDeposits, "Customer Savings Deposits"),
                AccountType.Checking => (GlAccount.CheckingDeposits, "Customer Checking Deposits"),
                AccountType.TimeDeposit => (GlAccount.TimeDeposits, "Customer Time Deposits"),
                AccountType.Loan => (GlAccount.LoanReceivable, "Customer Loan Receivables"),
                _ => throw new InvalidOperationException("Unsupported account type.")
            };

            var sourceLedger = new LedgerEntry
            {
                AccountId = sourceAccount.Id,
                GlAccountCode = sourceGlCode,
                GlAccountName = sourceGlName,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = true
            };
            _dbContext.LedgerEntries.Add(sourceLedger);

            if (destinationAccount != null)
            {
                (string destGlCode, string destGlName) = destinationAccount.AccountType switch
                {
                    AccountType.Savings => (GlAccount.SavingsDeposits, "Customer Savings Deposits"),
                    AccountType.Checking => (GlAccount.CheckingDeposits, "Customer Checking Deposits"),
                    AccountType.TimeDeposit => (GlAccount.TimeDeposits, "Customer Time Deposits"),
                    AccountType.Loan => (GlAccount.LoanReceivable, "Customer Loan Receivables"),
                    _ => throw new InvalidOperationException("Unsupported account type.")
                };

                var destinationLedger = new LedgerEntry
                {
                    AccountId = destinationAccount.Id,
                    GlAccountCode = destGlCode,
                    GlAccountName = destGlName,
                    TransactionId = transaction.Id,
                    Amount = request.Amount,
                    IsDebit = false
                };
                _dbContext.LedgerEntries.Add(destinationLedger);
            }
            else
            {
                // External Transfer: Credit Central Bank Reserve Account
                var externalLedger = new LedgerEntry
                {
                    AccountId = null,
                    GlAccountCode = GlAccount.CentralBankReserve,
                    GlAccountName = "Central Bank Reserve (Interbank Settlement)",
                    TransactionId = transaction.Id,
                    Amount = request.Amount,
                    IsDebit = false
                };
                _dbContext.LedgerEntries.Add(externalLedger);
            }

            // Queue Domain Event via Outbox
            var domainEvent = new TransferExecutedEvent(
                transaction.Id,
                sourceAccount.Id,
                destinationAccountId,
                request.Amount,
                transaction.ReferenceNumber,
                _dbContext.CurrentTenantId
            );

            var eventType = typeof(TransferExecutedEvent);
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
            if (destinationAccount != null)
            {
                await _cacheService.RemoveAsync($"accounts:{destinationAccount.Id}:details");
                await _cacheService.RemoveAsync($"accounts:{destinationAccount.AccountNumber}:details");
            }

            return transaction.Id;
        }
    }
}
