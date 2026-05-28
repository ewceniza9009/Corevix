using System.Threading;
using System.Threading.Tasks;
using Corevix.Core;

namespace Corevix.Application
{
    /// <summary>
    /// Abstracts audit log persistence so the Application layer doesn't depend on MongoDB directly.
    /// </summary>
    public interface IAuditLogService
    {
        Task WriteAsync(AuditLog auditLog, CancellationToken cancellationToken = default);
    }
}
