using System;
using System.Collections.Generic;

namespace Corevix.Core
{
    public enum TransactionType
    {
        Deposit,
        Withdrawal,
        Transfer,
        BillPayment,
        InterestAccrual
    }

    public enum TransactionStatus
    {
        Pending,
        Completed,
        Failed
    }

    public class Transaction : BaseEntity
    {
        public string ReferenceNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public TransactionType TransactionType { get; set; }
        public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
        
        public Guid? SourceAccountId { get; set; }
        public Guid? DestinationAccountId { get; set; }
        public string Description { get; set; } = string.Empty;

        // Navigation properties
        public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
    }
}
