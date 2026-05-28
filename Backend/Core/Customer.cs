using System;
using System.Collections.Generic;

namespace Corevix.Core
{
    public enum KycStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public class Customer : BaseEntity
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        
        // KYC fields
        public KycStatus KycStatus { get; set; } = KycStatus.Pending;
        public string? IdType { get; set; }
        public string? IdNumber { get; set; }
        public string? IdImageUri { get; set; }
        public string? SelfieImageUri { get; set; }

        // Navigation properties
        public ICollection<Account> Accounts { get; set; } = new List<Account>();
    }
}
