using System;

namespace Corevix.Core
{
    public abstract class BaseEntity : ITenantEntity, IAuditableEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string TenantId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }
}
