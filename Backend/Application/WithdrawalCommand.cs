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

            var ledgerEntry = new LedgerEntry
            {
                AccountId = account.Id,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = true // Debit
            };

            _dbContext.LedgerEntries.Add(ledgerEntry);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return transaction.Id;
        }
    }
}
