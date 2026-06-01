using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Corevix.Core;

namespace Corevix.Application
{
    public class InterestCalculationJob
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly IConfiguration? _configuration;

        public InterestCalculationJob(IApplicationDbContext dbContext, IConfiguration? configuration = null)
        {
            _dbContext = dbContext;
            _configuration = configuration;
        }

        public async Task AccrueDailyInterestAsync()
        {
            // 1. Savings Interest Accrual (loaded dynamically, default 1.5% p.a.)
            var activeSavingsAccounts = await _dbContext.Accounts
                .Where(a => a.AccountType == AccountType.Savings && a.Status == AccountStatus.Active)
                .ToListAsync();

            decimal savingsAnnualRate = 0.015m;
            if (_configuration != null)
            {
                var val = _configuration["InterestRates:Savings"];
                if (decimal.TryParse(val, out var parsed)) savingsAnnualRate = parsed;
            }
            decimal savingsDailyRate = savingsAnnualRate / 365m;

            foreach (var account in activeSavingsAccounts)
            {
                if (account.Balance <= 0) continue;
                decimal interestAmount = Math.Round(account.Balance * savingsDailyRate, 4);
                if (interestAmount <= 0) continue;

                account.Balance += interestAmount;

                var transaction = new Transaction
                {
                    ReferenceNumber = $"INT-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}",
                    Amount = interestAmount,
                    TransactionType = TransactionType.InterestAccrual,
                    Status = TransactionStatus.Completed,
                    DestinationAccountId = account.Id,
                    Description = $"Daily Savings Interest Accrual at {savingsAnnualRate * 100}% p.a."
                };
                _dbContext.Transactions.Add(transaction);
                
                // Debit: Interest Expense
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = null,
                    GlAccountCode = GlAccount.InterestExpense,
                    GlAccountName = "Interest & Rebate Expense",
                    TransactionId = transaction.Id,
                    Amount = interestAmount,
                    IsDebit = true
                });

                // Credit: Customer Savings Deposit
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = account.Id,
                    GlAccountCode = GlAccount.SavingsDeposits,
                    GlAccountName = "Customer Savings Deposits",
                    TransactionId = transaction.Id,
                    Amount = interestAmount,
                    IsDebit = false
                });
            }

            // 2. Loan Interest Charge Accrual (loaded dynamically, default 6.0% p.a. - increases debt)
            var activeLoans = await _dbContext.Accounts
                .Where(a => a.AccountType == AccountType.Loan && a.Status == AccountStatus.Active)
                .ToListAsync();

            decimal loanAnnualRate = 0.06m;
            if (_configuration != null)
            {
                var val = _configuration["InterestRates:Loan"];
                if (decimal.TryParse(val, out var parsed)) loanAnnualRate = parsed;
            }
            decimal loanDailyRate = loanAnnualRate / 365m;

            foreach (var loan in activeLoans)
            {
                if (loan.Balance <= 0) continue;
                decimal interestCharge = Math.Round(loan.Balance * loanDailyRate, 4);
                if (interestCharge <= 0) continue;

                loan.Balance += interestCharge; // Increases debt

                var transaction = new Transaction
                {
                    ReferenceNumber = $"LINT-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}",
                    Amount = interestCharge,
                    TransactionType = TransactionType.InterestAccrual,
                    Status = TransactionStatus.Completed,
                    SourceAccountId = loan.Id,
                    Description = $"Daily Loan Interest Charge at {loanAnnualRate * 100}% p.a."
                };
                _dbContext.Transactions.Add(transaction);

                // Debit: Customer Loan Receivable
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = loan.Id,
                    GlAccountCode = GlAccount.LoanReceivable,
                    GlAccountName = "Customer Loan Receivables",
                    TransactionId = transaction.Id,
                    Amount = interestCharge,
                    IsDebit = true
                });

                // Credit: Interest Income
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    AccountId = null,
                    GlAccountCode = GlAccount.InterestIncome,
                    GlAccountName = "Interest Income",
                    TransactionId = transaction.Id,
                    Amount = interestCharge,
                    IsDebit = false
                });
            }

            // 3. Time Deposits Interest Accrual (loaded dynamically, default 4.5% p.a.) & Maturity payouts
            var activeTDs = await _dbContext.Accounts
                .Where(a => a.AccountType == AccountType.TimeDeposit && a.Status == AccountStatus.Active)
                .ToListAsync();

            decimal tdAnnualRate = 0.045m;
            if (_configuration != null)
            {
                var val = _configuration["InterestRates:TimeDeposit"];
                if (decimal.TryParse(val, out var parsed)) tdAnnualRate = parsed;
            }
            decimal tdDailyRate = tdAnnualRate / 365m;

            foreach (var td in activeTDs)
            {
                decimal interestAmount = Math.Round(td.Balance * tdDailyRate, 4);
                if (interestAmount > 0)
                {
                    td.Balance += interestAmount;
                    var transaction = new Transaction
                    {
                        ReferenceNumber = $"TDINT-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}",
                        Amount = interestAmount,
                        TransactionType = TransactionType.InterestAccrual,
                        Status = TransactionStatus.Completed,
                        DestinationAccountId = td.Id,
                        Description = $"Daily Time Deposit Interest Accrual at {tdAnnualRate * 100}% p.a."
                    };
                    _dbContext.Transactions.Add(transaction);

                    // Debit: Interest Expense
                    _dbContext.LedgerEntries.Add(new LedgerEntry
                    {
                        AccountId = null,
                        GlAccountCode = GlAccount.InterestExpense,
                        GlAccountName = "Interest & Rebate Expense",
                        TransactionId = transaction.Id,
                        Amount = interestAmount,
                        IsDebit = true
                    });

                    // Credit: Customer Time Deposit
                    _dbContext.LedgerEntries.Add(new LedgerEntry
                    {
                        AccountId = td.Id,
                        GlAccountCode = GlAccount.TimeDeposits,
                        GlAccountName = "Customer Time Deposits",
                        TransactionId = transaction.Id,
                        Amount = interestAmount,
                        IsDebit = false
                    });
                }

                // Check Maturity
                var termDays = (int)(td.LimitOverrideDaily ?? 90);
                if (td.CreatedAt.AddDays(termDays) <= DateTime.UtcNow)
                {
                    var savings = await _dbContext.Accounts
                        .FirstOrDefaultAsync(a => a.CustomerId == td.CustomerId && a.AccountType == AccountType.Savings && a.Status == AccountStatus.Active);

                    if (savings != null)
                    {
                        decimal totalPayout = td.Balance;
                        td.Balance = 0;
                        td.Status = AccountStatus.Closed;
                        savings.Balance += totalPayout;

                        var payoutTx = new Transaction
                        {
                            ReferenceNumber = $"TDM-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpperInvariant()}",
                            Amount = totalPayout,
                            TransactionType = TransactionType.Transfer,
                            Status = TransactionStatus.Completed,
                            SourceAccountId = td.Id,
                            DestinationAccountId = savings.Id,
                            Description = $"Matured Time Deposit Payout (Principal + Interest)"
                        };
                        _dbContext.Transactions.Add(payoutTx);

                        // Debit: Customer Time Deposit (reduces TD liability)
                        _dbContext.LedgerEntries.Add(new LedgerEntry
                        {
                            AccountId = td.Id,
                            GlAccountCode = GlAccount.TimeDeposits,
                            GlAccountName = "Customer Time Deposits",
                            TransactionId = payoutTx.Id,
                            Amount = totalPayout,
                            IsDebit = true
                        });

                        // Credit: Customer Savings Deposit (increases Savings liability)
                        _dbContext.LedgerEntries.Add(new LedgerEntry
                        {
                            AccountId = savings.Id,
                            GlAccountCode = GlAccount.SavingsDeposits,
                            GlAccountName = "Customer Savings Deposits",
                            TransactionId = payoutTx.Id,
                            Amount = totalPayout,
                            IsDebit = false
                        });
                    }
                }
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
