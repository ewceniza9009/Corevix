using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Corevix.Core;
using Corevix.Common;

namespace Corevix.Persistence
{
    public class TenantAndAuditSaveChangesInterceptor : SaveChangesInterceptor
    {
        private readonly ITenantProvider _tenantProvider;

        public TenantAndAuditSaveChangesInterceptor(ITenantProvider tenantProvider)
        {
            _tenantProvider = tenantProvider;
        }

        public override InterceptionResult<int> SavingChanges(
            DbContextEventData eventData,
            InterceptionResult<int> result)
        {
            UpdateTenantAndAuditProperties(eventData.Context);
            return base.SavingChanges(eventData, result);
        }

        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            UpdateTenantAndAuditProperties(eventData.Context);
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        private void UpdateTenantAndAuditProperties(DbContext? context)
        {
            if (context == null) return;

            var tenantId = _tenantProvider.GetTenantId();
            var now = DateTime.UtcNow;

            foreach (var entry in context.ChangeTracker.Entries())
            {
                if (entry.Entity is ITenantEntity tenantEntity)
                {
                    if (entry.State == EntityState.Added)
                    {
                        tenantEntity.TenantId = tenantId;
                    }
                }

                if (entry.Entity is IAuditableEntity auditableEntity)
                {
                    if (entry.State == EntityState.Added)
                    {
                        auditableEntity.CreatedAt = now;
                        auditableEntity.CreatedBy = "system"; // Can be resolved from user principal if available
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        auditableEntity.UpdatedAt = now;
                        auditableEntity.UpdatedBy = "system";
                    }
                }
            }
        }
    }
}
