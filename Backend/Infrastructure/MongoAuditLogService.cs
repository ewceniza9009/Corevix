using System.Threading;
using System.Threading.Tasks;
using Corevix.Core;
using Corevix.Application;
using Corevix.Persistence;

namespace Corevix.Infrastructure
{
    public class MongoAuditLogService : IAuditLogService
    {
        private readonly MongoDbContext _mongoDbContext;

        public MongoAuditLogService(MongoDbContext mongoDbContext)
        {
            _mongoDbContext = mongoDbContext;
        }

        public async Task WriteAsync(AuditLog auditLog, CancellationToken cancellationToken = default)
        {
            await _mongoDbContext.AuditLogs.InsertOneAsync(auditLog, cancellationToken: cancellationToken);
        }
    }
}
