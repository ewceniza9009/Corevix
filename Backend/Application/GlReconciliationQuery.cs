using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record GlReconciliationReport(
        decimal TotalAccountBalances,
        decimal TotalLedgerCredits,
        decimal TotalLedgerDebits,
        decimal NetLedgerPosition,
        decimal Discrepancy,
        bool IsReconciled,
        int TotalAccounts,
        int TotalLedgerEntries,
        DateTime ReportGeneratedAtUtc);

    public record GlReconciliationQuery() : IRequest<GlReconciliationReport>;

    public class GlReconciliationQueryHandler : IRequestHandler<GlReconciliationQuery, GlReconciliationReport>
    {
        private readonly IApplicationDbContext _dbContext;

        public GlReconciliationQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<GlReconciliationReport> Handle(GlReconciliationQuery request, CancellationToken cancellationToken)
        {
            // 1. Trial Balance Reconciliation (Total Debits must equal Total Credits in Ledger)
            var totalLedgerDebits = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => l.IsDebit)
                .SumAsync(l => l.Amount, cancellationToken);

            var totalLedgerCredits = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => !l.IsDebit)
                .SumAsync(l => l.Amount, cancellationToken);

            var trialBalanceDiscrepancy = Math.Abs(totalLedgerDebits - totalLedgerCredits);

            // 2. Sub-ledger Reconciliation: Customer Accounts vs GL Accounts
            
            // Customer Deposits (Savings + Checking + Time Deposits)
            var totalCustomerDeposits = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.AccountType != AccountType.Loan && a.Status == AccountStatus.Active)
                .SumAsync(a => a.Balance, cancellationToken);

            var depositsGlBalance = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => l.GlAccountCode == GlAccount.SavingsDeposits 
                         || l.GlAccountCode == GlAccount.CheckingDeposits 
                         || l.GlAccountCode == GlAccount.TimeDeposits)
                .SumAsync(l => l.IsDebit ? -l.Amount : l.Amount, cancellationToken);

            var depositsDiscrepancy = totalCustomerDeposits - depositsGlBalance;

            // Customer Loans (Loan Account Balances vs GL Loan Receivables)
            var totalCustomerLoans = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.AccountType == AccountType.Loan && a.Status == AccountStatus.Active)
                .SumAsync(a => a.Balance, cancellationToken);

            var loanAccountBalanceSum = Math.Abs(totalCustomerLoans);

            var loansGlBalance = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => l.GlAccountCode == GlAccount.LoanReceivable)
                .SumAsync(l => l.IsDebit ? l.Amount : -l.Amount, cancellationToken);

            var loansDiscrepancy = loanAccountBalanceSum - loansGlBalance;

            // Cumulative discrepancy
            var cumulativeDiscrepancy = trialBalanceDiscrepancy + Math.Abs(depositsDiscrepancy) + Math.Abs(loansDiscrepancy);

            var totalAccounts = await _dbContext.Accounts
                .AsNoTracking()
                .CountAsync(cancellationToken);

            var totalLedgerEntries = await _dbContext.LedgerEntries
                .AsNoTracking()
                .CountAsync(cancellationToken);

            return new GlReconciliationReport(
                TotalAccountBalances: totalCustomerDeposits,
                TotalLedgerCredits: totalLedgerCredits,
                TotalLedgerDebits: totalLedgerDebits,
                NetLedgerPosition: totalLedgerDebits - totalLedgerCredits,
                Discrepancy: cumulativeDiscrepancy,
                IsReconciled: cumulativeDiscrepancy == 0m,
                TotalAccounts: totalAccounts,
                TotalLedgerEntries: totalLedgerEntries,
                ReportGeneratedAtUtc: DateTime.UtcNow
            );
        }
    }
}
