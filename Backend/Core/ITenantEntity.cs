namespace Corevix.Core
{
    public interface ITenantEntity
    {
        string TenantId { get; set; }
    }

    public interface IAuditableEntity
    {
        DateTime CreatedAt { get; set; }
        string? CreatedBy { get; set; }
        DateTime? UpdatedAt { get; set; }
        string? UpdatedBy { get; set; }
    }
}
