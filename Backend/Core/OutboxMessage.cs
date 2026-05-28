using System;

namespace Corevix.Core
{
    public class OutboxMessage : BaseEntity
    {
        public string Type { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime OccurredOnUtc { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedOnUtc { get; set; }
        public string? Error { get; set; }
    }
}
