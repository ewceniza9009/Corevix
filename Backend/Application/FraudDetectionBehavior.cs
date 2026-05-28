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
    /// MediatR pipeline behavior that assigns a fraud risk score to financial transactions.
    /// Scores >= 70 are blocked. Scores >= 40 are flagged in the audit log for manual review.
    /// </summary>
    public class FraudDetectionBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly IAuditLogService _auditLogService;

        public FraudDetectionBehavior(IApplicationDbContext dbContext, IAuditLogService auditLogService)
        {
            _dbContext = dbContext;
            _auditLogService = auditLogService;
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

            int score = 0;
            var reasons = new System.Collections.Generic.List<string>();

            // Rule 1: High amount (> ₱25,000)
            if (financialCommand.Amount > 25_000m)
            {
                score += 20;
                reasons.Add($"High amount: ₱{financialCommand.Amount:N2}");
            }

            // Rule 2: Rapid velocity (>5 transactions in last hour from same account)
            var oneHourAgo = DateTime.UtcNow.AddHours(-1);
            var recentTxCount = await _dbContext.Transactions
                .AsNoTracking()
                .CountAsync(t => t.SourceAccountId == financialCommand.SourceAccountId
                              && t.CreatedAt >= oneHourAgo, cancellationToken);

            if (recentTxCount > 5)
            {
                score += 30;
                reasons.Add($"Rapid velocity: {recentTxCount} transactions in last hour");
            }

            // Rule 3: Off-hours (00:00-05:00 UTC+8, which is 16:00-21:00 UTC previous day)
            var utcNow = DateTime.UtcNow;
            var localHour = (utcNow.Hour + 8) % 24;
            if (localHour >= 0 && localHour < 5)
            {
                score += 15;
                reasons.Add($"Off-hours transaction at {localHour:00}:00 local time");
            }

            // Rule 4: New account (opened < 7 days ago)
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == financialCommand.SourceAccountId, cancellationToken);

            if (account != null && (DateTime.UtcNow - account.CreatedAt).TotalDays < 7)
            {
                score += 20;
                reasons.Add("New account (less than 7 days old)");
            }

            // Rule 5: Round amount (exact multiples of ₱10,000)
            if (financialCommand.Amount >= 10_000m && financialCommand.Amount % 10_000m == 0)
            {
                score += 10;
                reasons.Add($"Round amount: ₱{financialCommand.Amount:N2}");
            }

            // Decision
            if (score >= 70)
            {
                var blockedLog = new AuditLog
                {
                    TenantId = _dbContext.CurrentTenantId,
                    Action = "FRAUD_BLOCKED",
                    EntityName = "Transaction",
                    EntityId = financialCommand.SourceAccountId.ToString(),
                    Payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        Score = score,
                        Amount = financialCommand.Amount,
                        Reasons = reasons
                    }),
                    Timestamp = DateTime.UtcNow
                };
                await _auditLogService.WriteAsync(blockedLog, cancellationToken);

                throw new InvalidOperationException(
                    $"Transaction blocked by fraud detection (risk score: {score}/100). Reasons: {string.Join("; ", reasons)}");
            }

            if (score >= 40)
            {
                var flagLog = new AuditLog
                {
                    TenantId = _dbContext.CurrentTenantId,
                    Action = "FRAUD_FLAG",
                    EntityName = "Transaction",
                    EntityId = financialCommand.SourceAccountId.ToString(),
                    Payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        Score = score,
                        Amount = financialCommand.Amount,
                        Reasons = reasons
                    }),
                    Timestamp = DateTime.UtcNow
                };
                await _auditLogService.WriteAsync(flagLog, cancellationToken);
            }

            return await next();
        }
    }
}
