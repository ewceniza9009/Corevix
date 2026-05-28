using System;

namespace Corevix.Core
{
    public class TransactionLimitPolicy
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public AccountType AccountType { get; set; }
        public decimal PerTransactionLimit { get; set; }
        public decimal DailyLimit { get; set; }
        public decimal MonthlyLimit { get; set; }
    }
}
