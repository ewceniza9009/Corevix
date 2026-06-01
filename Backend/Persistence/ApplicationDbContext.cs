using System;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;
using Corevix.Common;
using Corevix.Application;

namespace Corevix.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        private readonly ITenantProvider _tenantProvider;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            ITenantProvider tenantProvider) : base(options)
        {
            _tenantProvider = tenantProvider;
        }

        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Account> Accounts => Set<Account>();
        public DbSet<Transaction> Transactions => Set<Transaction>();
        public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
        public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
        public DbSet<TransactionLimitPolicy> TransactionLimitPolicies => Set<TransactionLimitPolicy>();
        public DbSet<User> Users => Set<User>();

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

            // Customer Configurations
            modelBuilder.Entity<Customer>(entity =>
            {
                entity.HasIndex(c => new { c.TenantId, c.Email }).IsUnique();
                entity.HasIndex(c => c.PhoneNumber);
            });

            // Account Configurations
            modelBuilder.Entity<Account>(entity =>
            {
                entity.HasIndex(a => new { a.TenantId, a.AccountNumber }).IsUnique();
                entity.Property(a => a.Balance).HasPrecision(18, 2);
                entity.HasOne(a => a.Customer)
                      .WithMany(c => c.Accounts)
                      .HasForeignKey(a => a.CustomerId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Transaction Configurations
            modelBuilder.Entity<Transaction>(entity =>
            {
                entity.HasIndex(t => new { t.TenantId, t.ReferenceNumber }).IsUnique();
                entity.Property(t => t.Amount).HasPrecision(18, 2);
            });

            // LedgerEntry Configurations
            modelBuilder.Entity<LedgerEntry>(entity =>
            {
                entity.Property(l => l.Amount).HasPrecision(18, 2);
                entity.Property(l => l.GlAccountCode).IsRequired().HasMaxLength(10);
                entity.Property(l => l.GlAccountName).IsRequired().HasMaxLength(100);
                
                entity.HasOne(l => l.Account)
                      .WithMany(a => a.LedgerEntries)
                      .HasForeignKey(l => l.AccountId)
                      .IsRequired(false)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(l => l.Transaction)
                      .WithMany(t => t.LedgerEntries)
                      .HasForeignKey(l => l.TransactionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // TransactionLimitPolicy Configurations
            modelBuilder.Entity<TransactionLimitPolicy>(entity =>
            {
                entity.HasIndex(p => p.AccountType).IsUnique();
                entity.Property(p => p.PerTransactionLimit).HasPrecision(18, 2);
                entity.Property(p => p.DailyLimit).HasPrecision(18, 2);
                entity.Property(p => p.MonthlyLimit).HasPrecision(18, 2);
            });

            // User Configurations
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
                
                entity.HasOne(u => u.Customer)
                      .WithOne()
                      .HasForeignKey<User>(u => u.CustomerId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }

        public string CurrentTenantId => _tenantProvider.GetTenantId();
    }
}
