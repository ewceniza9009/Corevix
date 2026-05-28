using System;

namespace Corevix.Application
{
    /// <summary>
    /// Marker interface for financial commands that involve money movement from a source account.
    /// Used by TransactionLimitBehavior and FraudDetectionBehavior to intercept and validate.
    /// </summary>
    public interface IFinancialCommand
    {
        Guid SourceAccountId { get; }
        decimal Amount { get; }
    }
}
