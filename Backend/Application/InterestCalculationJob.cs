using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public class InterestCalculationJob
    {
        private readonly IApplicationDbContext _dbContext;

        public InterestCalculationJob(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task AccrueDailyInterestAsync()
        {
            var activeSavingsAccounts = await _dbContext.Accounts
                .Where(a => a.AccountType == AccountType.Savings && a.Status == AccountStatus.Active)
                .ToListAsync();

            decimal annualRate = 0.015m;
            decimal dailyRate = annualRate / 365m;

            foreach (var account in activeSavingsAccounts)
            {
                if (account.Balance <= 0) continue;

                decimal interestAmount = Math.Round(account.Balance * dailyRate, 4);
                if (interestAmount <= 0) continue;

                account.Balance += interestAmount;

                var transaction = new Transaction
                {
                    ReferenceNumber = $"INT-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}",
                    Amount = interestAmount,
                    TransactionType = TransactionType.InterestAccrual,
                    Status = TransactionStatus.Completed,
                    DestinationAccountId = account.Id,
                    Description = $"Daily Interest Accrual at {annualRate * 100}% p.a."
                };

                _dbContext.Transactions.Add(transaction);

                var ledgerEntry = new LedgerEntry
                {
                    AccountId = account.Id,
                    TransactionId = transaction.Id,
                    Amount = interestAmount,
                    IsDebit = false
                };

                _dbContext.LedgerEntries.Add(ledgerEntry);
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
