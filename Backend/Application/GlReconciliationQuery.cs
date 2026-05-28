using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;

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
            var totalAccountBalances = await _dbContext.Accounts
                .AsNoTracking()
                .SumAsync(a => a.Balance, cancellationToken);

            var totalAccounts = await _dbContext.Accounts
                .AsNoTracking()
                .CountAsync(cancellationToken);

            var totalLedgerEntries = await _dbContext.LedgerEntries
                .AsNoTracking()
                .CountAsync(cancellationToken);

            var totalLedgerCredits = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => !l.IsDebit)
                .SumAsync(l => l.Amount, cancellationToken);

            var totalLedgerDebits = await _dbContext.LedgerEntries
                .AsNoTracking()
                .Where(l => l.IsDebit)
                .SumAsync(l => l.Amount, cancellationToken);

            var netLedgerPosition = totalLedgerCredits - totalLedgerDebits;
            var discrepancy = totalAccountBalances - netLedgerPosition;

            return new GlReconciliationReport(
                TotalAccountBalances: totalAccountBalances,
                TotalLedgerCredits: totalLedgerCredits,
                TotalLedgerDebits: totalLedgerDebits,
                NetLedgerPosition: netLedgerPosition,
                Discrepancy: discrepancy,
                IsReconciled: discrepancy == 0m,
                TotalAccounts: totalAccounts,
                TotalLedgerEntries: totalLedgerEntries,
                ReportGeneratedAtUtc: DateTime.UtcNow
            );
        }
    }
}
