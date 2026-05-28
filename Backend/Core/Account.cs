using System;
using System.Collections.Generic;

namespace Corevix.Core
{
    public enum AccountType
    {
        Savings,
        Checking,
        TimeDeposit
    }

    public enum AccountStatus
    {
        Active,
        Frozen,
        Closed
    }

    public class Account : BaseEntity
    {
        public string AccountNumber { get; set; } = string.Empty;
        public AccountType AccountType { get; set; } = AccountType.Savings;
        public decimal Balance { get; set; } = 0.00m;
        public string Currency { get; set; } = "PHP";
        public AccountStatus Status { get; set; } = AccountStatus.Active;

        // Foreign Key
        public Guid CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        // Navigation properties
        public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
    }
}
