using System;

namespace Corevix.Core
{
    public enum UserRole
    {
        Customer,
        Staff,
        Approver
    }

    public class User : BaseEntity
    {
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PasswordSalt { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public Guid? CustomerId { get; set; }
        public Customer? Customer { get; set; }
        
        // Refresh token settings
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        // MFA settings (preps for TOTP)
        public bool IsMfaEnabled { get; set; }
        public string? MfaSecret { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
