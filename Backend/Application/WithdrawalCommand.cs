using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record WithdrawalCommand(
        Guid AccountId,
        decimal Amount,
        string Description,
        string IdempotencyKey) : IRequest<Guid>, IIdempotentCommand, IFinancialCommand
    {
        public Guid SourceAccountId => AccountId;
    }

    public class WithdrawalCommandValidator : AbstractValidator<WithdrawalCommand>
    {
        public WithdrawalCommandValidator()
        {
            RuleFor(x => x.AccountId).NotEmpty();
            RuleFor(x => x.Amount).GreaterThan(0);
            RuleFor(x => x.IdempotencyKey).NotEmpty();
        }
    }

    public class WithdrawalCommandHandler : IRequestHandler<WithdrawalCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;

        public WithdrawalCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Guid> Handle(WithdrawalCommand request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            if (account.Status != AccountStatus.Active)
            {
                throw new InvalidOperationException("Account is not active.");
            }

            if (account.Balance < request.Amount)
            {
                throw new InvalidOperationException("Insufficient funds.");
            }

            account.Balance -= request.Amount;

            var transaction = new Transaction
            {
                ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                Amount = request.Amount,
                TransactionType = TransactionType.Withdrawal,
                Status = TransactionStatus.Completed,
                SourceAccountId = account.Id,
                Description = request.Description
            };

            _dbContext.Transactions.Add(transaction);

            string glCode;
            string glName;
            switch (account.AccountType)
            {
                case AccountType.Savings:
                    glCode = GlAccount.SavingsDeposits;
                    glName = "Customer Savings Deposits";
                    break;
                case AccountType.Checking:
                    glCode = GlAccount.CheckingDeposits;
                    glName = "Customer Checking Deposits";
                    break;
                case AccountType.TimeDeposit:
                    glCode = GlAccount.TimeDeposits;
                    glName = "Customer Time Deposits";
                    break;
                case AccountType.Loan:
                    glCode = GlAccount.LoanReceivable;
                    glName = "Customer Loan Receivables";
                    break;
                default:
                    throw new InvalidOperationException("Unsupported account type.");
            }

            // Debit Customer Account
            var debitEntry = new LedgerEntry
            {
                AccountId = account.Id,
                GlAccountCode = glCode,
                GlAccountName = glName,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = true
            };

            // Credit Cash Vault
            var creditEntry = new LedgerEntry
            {
                AccountId = null,
                GlAccountCode = GlAccount.CashVault,
                GlAccountName = "Cash Asset (Vault)",
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = false
            };

            _dbContext.LedgerEntries.Add(debitEntry);
            _dbContext.LedgerEntries.Add(creditEntry);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return transaction.Id;
        }
    }
}
