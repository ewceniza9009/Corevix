using System;

namespace Corevix.Core
{
    public class LedgerEntry : BaseEntity
    {
        public Guid AccountId { get; set; }
        public Account Account { get; set; } = null!;

        public Guid TransactionId { get; set; }
        public Transaction Transaction { get; set; } = null!;

        public decimal Amount { get; set; }
        public bool IsDebit { get; set; }
    }
}
