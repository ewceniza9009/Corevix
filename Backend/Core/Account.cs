using System;
using System.Collections.Generic;

namespace Corevix.Core
{
    public enum AccountType
    {
        Savings,
        Checking,
        TimeDeposit,
        Loan
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
        public string BranchCode { get; set; } = "0001"; // e.g., "0001" = Makati, "0002" = Cebu, "0003" = Manila
        public AccountType AccountType { get; set; } = AccountType.Savings;
        public decimal Balance { get; set; } = 0.00m;
        public string Currency { get; set; } = "PHP";
        public AccountStatus Status { get; set; } = AccountStatus.Active;

        // Custom individual overrides
        public decimal? LimitOverridePerTransaction { get; set; }
        public decimal? LimitOverrideDaily { get; set; }
        public decimal? LimitOverrideMonthly { get; set; }
        public bool IsCardLocked { get; set; } = false;

        // Foreign Key
        public Guid CustomerId { get; set; }
        public Customer Customer { get; set; } = null!;

        // Navigation properties
        public ICollection<LedgerEntry> LedgerEntries { get; set; } = new List<LedgerEntry>();
    }
}
