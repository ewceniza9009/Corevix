using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;
using Corevix.Persistence;
using Corevix.Application;
using Corevix.Infrastructure;
using Corevix.Common;
using MediatR;
using Xunit;

namespace Corevix.Tests
{
    public class ComplianceAndRiskTests
    {
        private class TestTenantProvider : ITenantProvider
        {
            public string GetTenantId() => "test-tenant-id";
        }

        private class TestCacheService : ICacheService
        {
            public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
            public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) => Task.CompletedTask;
            public Task RemoveAsync(string key) => Task.CompletedTask;
        }

        private class TestAuditLogService : IAuditLogService
        {
            public List<AuditLog> Logs { get; } = new();
            public Task WriteAsync(AuditLog auditLog, CancellationToken cancellationToken = default)
            {
                Logs.Add(auditLog);
                return Task.CompletedTask;
            }
        }

        private ApplicationDbContext CreateDbContext()
        {
            var tenantProvider = new TestTenantProvider();
            var interceptor = new TenantAndAuditSaveChangesInterceptor(tenantProvider);

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .AddInterceptors(interceptor)
                .Options;

            return new ApplicationDbContext(options, tenantProvider);
        }

        private async Task SeedLimitPolicies(ApplicationDbContext dbContext)
        {
            dbContext.TransactionLimitPolicies.AddRange(
                new TransactionLimitPolicy
                {
                    AccountType = AccountType.Savings,
                    PerTransactionLimit = 50_000m,
                    DailyLimit = 200_000m,
                    MonthlyLimit = 1_000_000m
                },
                new TransactionLimitPolicy
                {
                    AccountType = AccountType.Checking,
                    PerTransactionLimit = 100_000m,
                    DailyLimit = 500_000m,
                    MonthlyLimit = 2_000_000m
                }
            );
            await dbContext.SaveChangesAsync();
        }

        // ==================== TRANSACTION LIMIT TESTS ====================

        [Fact]
        public async Task TransactionLimit_ExceedsPerTransactionLimit_ShouldThrow()
        {
            var dbContext = CreateDbContext();
            await SeedLimitPolicies(dbContext);

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 100_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var behavior = new TransactionLimitBehavior<TransferCommand, Guid>(dbContext);

            var command = new TransferCommand(acc.Id, "9999999999", 60_000m, "Big transfer", true, "BDO", "key-1");

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                behavior.Handle(command, _ => Task.FromResult(Guid.NewGuid()), CancellationToken.None));

            Assert.Contains("per-transaction limit", ex.Message);
        }

        [Fact]
        public async Task TransactionLimit_WithinLimits_ShouldSucceed()
        {
            var dbContext = CreateDbContext();
            await SeedLimitPolicies(dbContext);

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 100_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var behavior = new TransactionLimitBehavior<TransferCommand, Guid>(dbContext);

            var expectedId = Guid.NewGuid();
            var command = new TransferCommand(acc.Id, "9999999999", 10_000m, "Small transfer", true, "BDO", "key-1");

            var result = await behavior.Handle(command, _ => Task.FromResult(expectedId), CancellationToken.None);

            Assert.Equal(expectedId, result);
        }

        [Fact]
        public async Task TransactionLimit_DailyLimitBreach_ShouldThrow()
        {
            var dbContext = CreateDbContext();
            await SeedLimitPolicies(dbContext);

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 500_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            dbContext.Accounts.Add(acc);

            // Add transactions summing up to ₱180,000 today
            for (int i = 0; i < 4; i++)
            {
                dbContext.Transactions.Add(new Transaction
                {
                    ReferenceNumber = $"REF{i:0000}",
                    Amount = 45_000m,
                    TransactionType = TransactionType.Transfer,
                    Status = TransactionStatus.Completed,
                    SourceAccountId = acc.Id,
                    Description = "Previous transfer"
                });
            }
            await dbContext.SaveChangesAsync();

            var behavior = new TransactionLimitBehavior<TransferCommand, Guid>(dbContext);

            // This ₱30,000 would bring daily total to ₱210,000 (exceeds ₱200,000 daily limit)
            var command = new TransferCommand(acc.Id, "9999999999", 30_000m, "Over limit", true, "BDO", "key-1");

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                behavior.Handle(command, _ => Task.FromResult(Guid.NewGuid()), CancellationToken.None));

            Assert.Contains("daily limit", ex.Message);
        }

        // ==================== AML / COMPLIANCE SCREENING TESTS ====================

        [Fact]
        public async Task AmlScreening_SanctionedName_ShouldRejectRegistration()
        {
            var dbContext = CreateDbContext();
            var auditLogService = new TestAuditLogService();
            var complianceService = new MockComplianceScreeningService();

            var handler = new RegisterCustomerCommandHandler(dbContext, complianceService, auditLogService);

            var command = new RegisterCustomerCommand(
                "Janet Lim", "Napoles",
                "janet@example.com", "+1234567890",
                "Passport", "P999999",
                "https://example.com/id.jpg", "https://example.com/selfie.jpg",
                "key-aml-1"
            );

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                handler.Handle(command, CancellationToken.None));

            Assert.Contains("SANCTIONS", ex.Message);

            // Verify AML_BLOCKED was logged
            Assert.Single(auditLogService.Logs);
            Assert.Equal("AML_BLOCKED", auditLogService.Logs[0].Action);
        }

        [Fact]
        public async Task AmlScreening_CleanName_ShouldAllowRegistration()
        {
            var dbContext = CreateDbContext();
            var auditLogService = new TestAuditLogService();
            var complianceService = new MockComplianceScreeningService();

            var handler = new RegisterCustomerCommandHandler(dbContext, complianceService, auditLogService);

            var command = new RegisterCustomerCommand(
                "Maria Clara", "Reyes",
                "maria.clara@example.com", "+1234567890",
                "Passport", "P123456",
                "https://example.com/id.jpg", "https://example.com/selfie.jpg",
                "key-aml-2"
            );

            var customerId = await handler.Handle(command, CancellationToken.None);

            Assert.NotEqual(Guid.Empty, customerId);
            Assert.Empty(auditLogService.Logs);
        }

        // ==================== FRAUD DETECTION TESTS ====================

        [Fact]
        public async Task FraudDetection_LowRisk_ShouldPass()
        {
            var dbContext = CreateDbContext();
            var auditLogService = new TestAuditLogService();
            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            // Account created long ago to avoid new account score (20 pts)
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 100_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            acc.CreatedAt = DateTime.UtcNow.AddDays(-10);
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var behavior = new FraudDetectionBehavior<TransferCommand, Guid>(dbContext, auditLogService);
            var command = new TransferCommand(acc.Id, "9999999999", 5_000m, "Low risk transfer", true, "BDO", "key-fraud-1");

            var expectedId = Guid.NewGuid();
            var result = await behavior.Handle(command, _ => Task.FromResult(expectedId), CancellationToken.None);

            Assert.Equal(expectedId, result);
            Assert.Empty(auditLogService.Logs);
        }

        [Fact]
        public async Task FraudDetection_MediumRisk_ShouldFlag()
        {
            var dbContext = CreateDbContext();
            var auditLogService = new TestAuditLogService();
            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            // New account -> +20 pts
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 100_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            acc.CreatedAt = DateTime.UtcNow;
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var behavior = new FraudDetectionBehavior<TransferCommand, Guid>(dbContext, auditLogService);
            // Transfer ₱30,000 -> High amount (+20 pts) and Round amount (+10 pts) -> total = 50 pts (flags, but doesn't block)
            var command = new TransferCommand(acc.Id, "9999999999", 30_000m, "Medium risk transfer", true, "BDO", "key-fraud-2");

            var expectedId = Guid.NewGuid();
            var result = await behavior.Handle(command, _ => Task.FromResult(expectedId), CancellationToken.None);

            Assert.Equal(expectedId, result);
            Assert.Single(auditLogService.Logs);
            Assert.Equal("FRAUD_FLAG", auditLogService.Logs[0].Action);
        }

        [Fact]
        public async Task FraudDetection_HighRisk_ShouldBlock()
        {
            var dbContext = CreateDbContext();
            var auditLogService = new TestAuditLogService();
            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            // New account -> +20 pts
            var acc = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 100_000m, Status = AccountStatus.Active, AccountType = AccountType.Savings };
            acc.CreatedAt = DateTime.UtcNow;
            dbContext.Accounts.Add(acc);

            // Rapid velocity: 6 transactions in last hour -> +30 pts
            for (int i = 0; i < 6; i++)
            {
                dbContext.Transactions.Add(new Transaction
                {
                    ReferenceNumber = $"REF{i:0000}",
                    Amount = 100m,
                    TransactionType = TransactionType.Transfer,
                    Status = TransactionStatus.Completed,
                    SourceAccountId = acc.Id,
                    Description = "Vel check",
                    CreatedAt = DateTime.UtcNow
                });
            }
            await dbContext.SaveChangesAsync();

            var behavior = new FraudDetectionBehavior<TransferCommand, Guid>(dbContext, auditLogService);
            // Transfer ₱30,000 -> High amount (+20 pts) and Round amount (+10 pts) + New account (+20 pts) + Velocity (+30 pts) = 80 pts (blocks)
            var command = new TransferCommand(acc.Id, "9999999999", 30_000m, "High risk transfer", true, "BDO", "key-fraud-3");

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                behavior.Handle(command, _ => Task.FromResult(Guid.NewGuid()), CancellationToken.None));

            Assert.Contains("blocked by fraud detection", ex.Message);
            Assert.Single(auditLogService.Logs);
            Assert.Equal("FRAUD_BLOCKED", auditLogService.Logs[0].Action);
        }

        // ==================== GL RECONCILIATION TESTS ====================

        [Fact]
        public async Task GlReconciliation_AfterTransactions_ShouldShowZeroDiscrepancy()
        {
            var dbContext = CreateDbContext();
            var cacheService = new TestCacheService();

            // Setup customer and accounts
            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);

            var acc1 = new Account { Customer = customer, AccountNumber = "1111111111", Balance = 0m, Status = AccountStatus.Active };
            var acc2 = new Account { Customer = customer, AccountNumber = "2222222222", Balance = 0m, Status = AccountStatus.Active };
            dbContext.Accounts.AddRange(acc1, acc2);
            await dbContext.SaveChangesAsync();

            // 1. Initial deposit of ₱10,000 into acc1
            var openHandler = new OpenAccountCommandHandler(dbContext);
            // Simulate manually since OpenAccountCommand sets balance directly
            acc1.Balance = 10_000m;
            var depositTx = new Transaction
            {
                ReferenceNumber = "DEP001",
                Amount = 10_000m,
                TransactionType = TransactionType.Deposit,
                Status = TransactionStatus.Completed,
                DestinationAccountId = acc1.Id,
                Description = "Initial Deposit"
            };
            dbContext.Transactions.Add(depositTx);
            dbContext.LedgerEntries.Add(new LedgerEntry { AccountId = acc1.Id, TransactionId = depositTx.Id, Amount = 10_000m, IsDebit = false });

            // 2. Transfer ₱3,000 from acc1 to acc2
            acc1.Balance -= 3_000m;
            acc2.Balance += 3_000m;
            var transferTx = new Transaction
            {
                ReferenceNumber = "TRF001",
                Amount = 3_000m,
                TransactionType = TransactionType.Transfer,
                Status = TransactionStatus.Completed,
                SourceAccountId = acc1.Id,
                DestinationAccountId = acc2.Id,
                Description = "Transfer"
            };
            dbContext.Transactions.Add(transferTx);
            dbContext.LedgerEntries.Add(new LedgerEntry { AccountId = acc1.Id, TransactionId = transferTx.Id, Amount = 3_000m, IsDebit = true });
            dbContext.LedgerEntries.Add(new LedgerEntry { AccountId = acc2.Id, TransactionId = transferTx.Id, Amount = 3_000m, IsDebit = false });

            // 3. Bill payment of ₱1,000 from acc2
            acc2.Balance -= 1_000m;
            var billTx = new Transaction
            {
                ReferenceNumber = "BILL001",
                Amount = 1_000m,
                TransactionType = TransactionType.BillPayment,
                Status = TransactionStatus.Completed,
                SourceAccountId = acc2.Id,
                Description = "Bill Payment"
            };
            dbContext.Transactions.Add(billTx);
            dbContext.LedgerEntries.Add(new LedgerEntry { AccountId = acc2.Id, TransactionId = billTx.Id, Amount = 1_000m, IsDebit = true });

            await dbContext.SaveChangesAsync();

            // Verify GL reconciliation
            var glHandler = new GlReconciliationQueryHandler(dbContext);
            var report = await glHandler.Handle(new GlReconciliationQuery(), CancellationToken.None);

            // acc1: 7000, acc2: 2000 → total = 9000
            Assert.Equal(9_000m, report.TotalAccountBalances);
            // Credits: 10000 (deposit) + 3000 (transfer credit) = 13000
            Assert.Equal(13_000m, report.TotalLedgerCredits);
            // Debits: 3000 (transfer debit) + 1000 (bill debit) = 4000
            Assert.Equal(4_000m, report.TotalLedgerDebits);
            // Net: 13000 - 4000 = 9000
            Assert.Equal(9_000m, report.NetLedgerPosition);
            Assert.Equal(0m, report.Discrepancy);
            Assert.True(report.IsReconciled);
        }
    }
}
