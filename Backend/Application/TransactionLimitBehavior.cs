using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    /// <summary>
    /// MediatR pipeline behavior that enforces per-transaction, daily, and monthly
    /// cumulative limits on any command implementing IFinancialCommand.
    /// </summary>
    public class TransactionLimitBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly IApplicationDbContext _dbContext;

        public TransactionLimitBehavior(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            if (request is not IFinancialCommand financialCommand)
            {
                return await next();
            }

            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == financialCommand.SourceAccountId, cancellationToken);

            if (account == null)
            {
                // Let the handler itself throw the proper KeyNotFoundException
                return await next();
            }

            var policy = await _dbContext.TransactionLimitPolicies
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.AccountType == account.AccountType, cancellationToken);

            var perTxLimit = account.LimitOverridePerTransaction ?? policy?.PerTransactionLimit ?? 1_000_000_000m;
            var dailyLimitCap = account.LimitOverrideDaily ?? policy?.DailyLimit ?? 1_000_000_000m;
            var monthlyLimitCap = account.LimitOverrideMonthly ?? policy?.MonthlyLimit ?? 1_000_000_000m;

            // 1. Per-transaction limit
            if (financialCommand.Amount > perTxLimit)
            {
                throw new InvalidOperationException(
                    $"Transaction amount ₱{financialCommand.Amount:N2} exceeds the per-transaction limit of ₱{perTxLimit:N2} for this account.");
            }

            // 2. Daily cumulative limit
            var todayUtc = DateTime.UtcNow.Date;
            var dailyTotal = await _dbContext.Transactions
                .AsNoTracking()
                .Where(t => t.SourceAccountId == account.Id
                         && t.Status == TransactionStatus.Completed
                         && t.CreatedAt >= todayUtc)
                .SumAsync(t => t.Amount, cancellationToken);

            if (dailyTotal + financialCommand.Amount > dailyLimitCap)
            {
                throw new InvalidOperationException(
                    $"This transaction would bring today's total to ₱{(dailyTotal + financialCommand.Amount):N2}, exceeding the daily limit of ₱{dailyLimitCap:N2}.");
            }

            // 3. Monthly cumulative limit
            var firstOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthlyTotal = await _dbContext.Transactions
                .AsNoTracking()
                .Where(t => t.SourceAccountId == account.Id
                         && t.Status == TransactionStatus.Completed
                         && t.CreatedAt >= firstOfMonth)
                .SumAsync(t => t.Amount, cancellationToken);

            if (monthlyTotal + financialCommand.Amount > monthlyLimitCap)
            {
                throw new InvalidOperationException(
                    $"This transaction would bring this month's total to ₱{(monthlyTotal + financialCommand.Amount):N2}, exceeding the monthly limit of ₱{monthlyLimitCap:N2}.");
            }

            return await next();
        }
    }
}
