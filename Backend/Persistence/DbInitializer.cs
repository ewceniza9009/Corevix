using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Corevix.Core;
using Corevix.Application;
using Corevix.Application.Security;

namespace Corevix.Persistence
{
    public static class DbInitializer
    {
        public static async Task InitializeAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var dbContext = (ApplicationDbContext)scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            // Ensure database is created and migrations are applied
            await dbContext.Database.MigrateAsync();

            // 1. Seed Limit Policies if empty
            if (!await dbContext.TransactionLimitPolicies.AnyAsync())
            {
                var policies = new List<TransactionLimitPolicy>
                {
                    new()
                    {
                        Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000001"),
                        AccountType = AccountType.Savings,
                        PerTransactionLimit = 50_000m,
                        DailyLimit = 200_000m,
                        MonthlyLimit = 1_000_000m
                    },
                    new()
                    {
                        Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000002"),
                        AccountType = AccountType.Checking,
                        PerTransactionLimit = 100_000m,
                        DailyLimit = 500_000m,
                        MonthlyLimit = 2_000_000m
                    },
                    new()
                    {
                        Id = Guid.Parse("a1b2c3d4-0001-0001-0001-000000000003"),
                        AccountType = AccountType.TimeDeposit,
                        PerTransactionLimit = 500_000m,
                        DailyLimit = 1_000_000m,
                        MonthlyLimit = 5_000_000m
                    }
                };

                await dbContext.TransactionLimitPolicies.AddRangeAsync(policies);
                await dbContext.SaveChangesAsync();
            }

            // 2. Seed Default Users if empty
            if (!await dbContext.Users.AnyAsync())
            {
                const string defaultPassword = "Password123!";
                var (hash, salt) = passwordHasher.HashPassword(defaultPassword);

                var users = new List<User>
                {
                    new()
                    {
                        Id = Guid.Parse("b1b2c3d4-0001-0001-0001-000000000001"),
                        TenantId = "test-tenant-id",
                        Email = "customer@corevix.com",
                        PasswordHash = hash,
                        PasswordSalt = salt,
                        Role = UserRole.Customer,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Id = Guid.Parse("b1b2c3d4-0001-0001-0001-000000000002"),
                        TenantId = "test-tenant-id",
                        Email = "staff@corevix.com",
                        PasswordHash = hash,
                        PasswordSalt = salt,
                        Role = UserRole.Staff,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Id = Guid.Parse("b1b2c3d4-0001-0001-0001-000000000003"),
                        TenantId = "test-tenant-id",
                        Email = "approver@corevix.com",
                        PasswordHash = hash,
                        PasswordSalt = salt,
                        Role = UserRole.Approver,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await dbContext.Users.AddRangeAsync(users);
                await dbContext.SaveChangesAsync();
            }
        }
    }
}
