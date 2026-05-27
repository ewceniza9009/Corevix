using System;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;
using Corevix.Common;

namespace Corevix.Persistence
{
    public class ApplicationDbContext : DbContext
    {
        private readonly ITenantProvider _tenantProvider;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ITenantProvider tenantProvider) : base(options)
        {
            _tenantProvider = tenantProvider;
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure global query filter for multi-tenancy
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
                {
                    var parameter = Expression.Parameter(entityType.ClrType, "e");
                    var tenantIdProperty = Expression.Property(parameter, nameof(ITenantEntity.TenantId));
                    var compareExpression = Expression.Equal(
                        tenantIdProperty,
                        Expression.Property(Expression.Constant(this), nameof(CurrentTenantId))
                    );
                    var filter = Expression.Lambda(compareExpression, parameter);

                    modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
                }
            }
        }

        public string CurrentTenantId => _tenantProvider.GetTenantId();
    }
}
