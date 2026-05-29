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
    public record ApplyForLoanCommand(
        Guid CustomerId,
        decimal PrincipalAmount,
        int TermMonths,
        Guid DisbursalAccountId) : IRequest<Guid>;

    public class ApplyForLoanCommandValidator : AbstractValidator<ApplyForLoanCommand>
    {
        public ApplyForLoanCommandValidator()
        {
            RuleFor(x => x.CustomerId).NotEmpty();
            RuleFor(x => x.PrincipalAmount).GreaterThan(0);
            RuleFor(x => x.TermMonths).GreaterThan(0);
            RuleFor(x => x.DisbursalAccountId).NotEmpty();
        }
    }

    public class ApplyForLoanCommandHandler : IRequestHandler<ApplyForLoanCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;

        public ApplyForLoanCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Guid> Handle(ApplyForLoanCommand request, CancellationToken cancellationToken)
        {
            var customer = await _dbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            // If CustomerId is Guid.Empty, let's find the customer who owns the disbursal account
            if (request.CustomerId == Guid.Empty)
            {
                var disbursalAcc = await _dbContext.Accounts
                    .Include(a => a.Customer)
                    .FirstOrDefaultAsync(a => a.Id == request.DisbursalAccountId, cancellationToken);
                if (disbursalAcc != null)
                {
                    customer = disbursalAcc.Customer;
                }
            }

            if (customer == null)
            {
                throw new KeyNotFoundException("Customer was not found.");
            }

            var disbursalAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.DisbursalAccountId, cancellationToken);

            if (disbursalAccount == null)
            {
                throw new KeyNotFoundException($"Disbursal account with ID {request.DisbursalAccountId} was not found.");
            }

            var loanAccount = new Account
            {
                CustomerId = customer.Id,
                AccountType = AccountType.Loan,
                Balance = -request.PrincipalAmount,
                Currency = "PHP",
                Status = AccountStatus.Frozen,
                BranchCode = disbursalAccount.BranchCode,
                AccountNumber = "LN" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()
            };

            _dbContext.Accounts.Add(loanAccount);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return loanAccount.Id;
        }
    }

    public record ApproveLoanCommand(Guid LoanAccountId, bool Approved) : IRequest<bool>;

    public class ApproveLoanCommandHandler : IRequestHandler<ApproveLoanCommand, bool>
    {
        private readonly IApplicationDbContext _dbContext;

        public ApproveLoanCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> Handle(ApproveLoanCommand request, CancellationToken cancellationToken)
        {
            var loanAccount = await _dbContext.Accounts
                .Include(a => a.Customer)
                .FirstOrDefaultAsync(a => a.Id == request.LoanAccountId, cancellationToken);

            if (loanAccount == null || loanAccount.AccountType != AccountType.Loan)
            {
                throw new KeyNotFoundException($"Loan account with ID {request.LoanAccountId} was not found.");
            }

            if (loanAccount.Status == AccountStatus.Active || loanAccount.Status == AccountStatus.Closed)
            {
                throw new InvalidOperationException("Loan is already processed.");
            }

            if (!request.Approved)
            {
                loanAccount.Status = AccountStatus.Closed; // Rejected
                await _dbContext.SaveChangesAsync(cancellationToken);
                return true;
            }

            var targetAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.CustomerId == loanAccount.CustomerId && a.AccountType == AccountType.Savings && a.Status == AccountStatus.Active, cancellationToken);

            if (targetAccount == null)
            {
                throw new InvalidOperationException("No active savings account found for disbursal.");
            }

            decimal loanAmount = Math.Abs(loanAccount.Balance);
            targetAccount.Balance += loanAmount;
            loanAccount.Status = AccountStatus.Active;

            var transaction = new Transaction
            {
                ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                Amount = loanAmount,
                TransactionType = TransactionType.Transfer,
                Status = TransactionStatus.Completed,
                SourceAccountId = loanAccount.Id,
                DestinationAccountId = targetAccount.Id,
                Description = $"Disbursal of loan {loanAccount.AccountNumber}"
            };

            _dbContext.Transactions.Add(transaction);

            var debitEntry = new LedgerEntry
            {
                AccountId = loanAccount.Id,
                TransactionId = transaction.Id,
                Amount = loanAmount,
                IsDebit = true
            };

            var creditEntry = new LedgerEntry
            {
                AccountId = targetAccount.Id,
                TransactionId = transaction.Id,
                Amount = loanAmount,
                IsDebit = false
            };

            _dbContext.LedgerEntries.Add(debitEntry);
            _dbContext.LedgerEntries.Add(creditEntry);

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
    }

    public record OpenTimeDepositCommand(
        Guid CustomerId,
        Guid SourceAccountId,
        decimal Amount,
        int TermDays) : IRequest<Guid>;

    public class OpenTimeDepositCommandHandler : IRequestHandler<OpenTimeDepositCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;

        public OpenTimeDepositCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Guid> Handle(OpenTimeDepositCommand request, CancellationToken cancellationToken)
        {
            var sourceAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.SourceAccountId, cancellationToken);

            if (sourceAccount == null)
            {
                throw new KeyNotFoundException($"Source account with ID {request.SourceAccountId} was not found.");
            }

            if (sourceAccount.Balance < request.Amount)
            {
                throw new InvalidOperationException("Insufficient funds to open Time Deposit.");
            }

            sourceAccount.Balance -= request.Amount;

            var tdAccount = new Account
            {
                CustomerId = sourceAccount.CustomerId,
                AccountType = AccountType.TimeDeposit,
                Balance = request.Amount,
                Currency = sourceAccount.Currency,
                Status = AccountStatus.Active,
                BranchCode = sourceAccount.BranchCode,
                AccountNumber = "TD" + Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()
            };

            _dbContext.Accounts.Add(tdAccount);

            var transaction = new Transaction
            {
                ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                Amount = request.Amount,
                TransactionType = TransactionType.Transfer,
                Status = TransactionStatus.Completed,
                SourceAccountId = sourceAccount.Id,
                DestinationAccountId = tdAccount.Id,
                Description = $"Open Time Deposit for {request.TermDays} days"
            };

            _dbContext.Transactions.Add(transaction);

            var debitEntry = new LedgerEntry
            {
                AccountId = sourceAccount.Id,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = true
            };

            var creditEntry = new LedgerEntry
            {
                AccountId = tdAccount.Id,
                TransactionId = transaction.Id,
                Amount = request.Amount,
                IsDebit = false
            };

            _dbContext.LedgerEntries.Add(debitEntry);
            _dbContext.LedgerEntries.Add(creditEntry);

            await _dbContext.SaveChangesAsync(cancellationToken);
            return tdAccount.Id;
        }
    }
}
