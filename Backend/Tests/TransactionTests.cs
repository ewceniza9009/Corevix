using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;
using Corevix.Persistence;
using Corevix.Application;
using Corevix.Common;
using Xunit;
using MediatR;
using Moq;

namespace Corevix.Tests
{
    public class TransactionTests
    {
        private class TestTenantProvider : ITenantProvider
        {
            public string GetTenantId() => "test-tenant-id";
        }

        private class TestCacheService : ICacheService
        {
            public Dictionary<string, object> Cache { get; } = new();

            public Task<T?> GetAsync<T>(string key)
            {
                if (Cache.TryGetValue(key, out var val))
                {
                    return Task.FromResult((T?)val);
                }
                return Task.FromResult<T?>(default);
            }

            public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
            {
                Cache[key] = value!;
                return Task.CompletedTask;
            }

            public Task RemoveAsync(string key)
            {
                Cache.Remove(key);
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

        [Fact]
        public async Task IntraBankTransfer_ShouldSucceed_AndPostLedgerEntries()
        {
            var dbContext = CreateDbContext();
            var cacheService = new TestCacheService();

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);

            var acc1 = new Account { Customer = customer, AccountNumber = "1234567890", Balance = 1000.00m, Status = AccountStatus.Active };
            var acc2 = new Account { Customer = customer, AccountNumber = "0987654321", Balance = 500.00m, Status = AccountStatus.Active };
            dbContext.Accounts.AddRange(acc1, acc2);
            await dbContext.SaveChangesAsync();

            // Set initial cache
            await cacheService.SetAsync($"accounts:{acc1.Id}:details", new AccountDetailsDto(acc1.Id, acc1.AccountNumber, acc1.AccountType, acc1.Balance, acc1.Currency, acc1.Status, customer.Id, false, null, null));
            await cacheService.SetAsync($"accounts:{acc2.Id}:details", new AccountDetailsDto(acc2.Id, acc2.AccountNumber, acc2.AccountType, acc2.Balance, acc2.Currency, acc2.Status, customer.Id, false, null, null));

            var handler = new TransferCommandHandler(dbContext, cacheService);
            var command = new TransferCommand(
                acc1.Id,
                acc2.AccountNumber,
                200.00m,
                "Intra-bank Transfer test",
                IsExternal: false,
                ExternalBankName: null,
                "idemp-key-1"
            );

            var txId = await handler.Handle(command, CancellationToken.None);

            var updatedAcc1 = await dbContext.Accounts.FindAsync(acc1.Id);
            var updatedAcc2 = await dbContext.Accounts.FindAsync(acc2.Id);

            Assert.Equal(800.00m, updatedAcc1!.Balance);
            Assert.Equal(700.00m, updatedAcc2!.Balance);

            // Verify Ledger entries
            var ledgerEntries = await dbContext.LedgerEntries.Where(l => l.TransactionId == txId).ToListAsync();
            Assert.Equal(2, ledgerEntries.Count);
            
            var debitEntry = ledgerEntries.First(l => l.AccountId == acc1.Id);
            Assert.True(debitEntry.IsDebit);
            Assert.Equal(200.00m, debitEntry.Amount);

            var creditEntry = ledgerEntries.First(l => l.AccountId == acc2.Id);
            Assert.False(creditEntry.IsDebit);
            Assert.Equal(200.00m, creditEntry.Amount);

            // Verify Cache evicted
            Assert.False(cacheService.Cache.ContainsKey($"accounts:{acc1.Id}:details"));
            Assert.False(cacheService.Cache.ContainsKey($"accounts:{acc2.Id}:details"));

            // Verify Outbox message
            var outbox = await dbContext.OutboxMessages.FirstOrDefaultAsync();
            Assert.NotNull(outbox);
            Assert.Contains("TransferExecutedEvent", outbox.Type);
        }

        [Fact]
        public async Task ExternalTransfer_ShouldSucceed_AndDebitOnlySource()
        {
            var dbContext = CreateDbContext();
            var cacheService = new TestCacheService();

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);

            var acc = new Account { Customer = customer, AccountNumber = "1234567890", Balance = 1000.00m, Status = AccountStatus.Active };
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var handler = new TransferCommandHandler(dbContext, cacheService);
            var command = new TransferCommand(
                acc.Id,
                "9999999999",
                300.00m,
                "To External Bank",
                IsExternal: true,
                ExternalBankName: "BDO",
                "idemp-key-2"
            );

            var txId = await handler.Handle(command, CancellationToken.None);

            var updatedAcc = await dbContext.Accounts.FindAsync(acc.Id);
            Assert.Equal(700.00m, updatedAcc!.Balance);

            var ledgerEntries = await dbContext.LedgerEntries.Where(l => l.TransactionId == txId).ToListAsync();
            Assert.Equal(2, ledgerEntries.Count);
            
            var debit = ledgerEntries.Single(l => l.IsDebit);
            Assert.Equal(300.00m, debit.Amount);
            Assert.Equal(acc.Id, debit.AccountId);

            var credit = ledgerEntries.Single(l => !l.IsDebit);
            Assert.Equal(300.00m, credit.Amount);
            Assert.Null(credit.AccountId);
            Assert.Equal(GlAccount.CentralBankReserve, credit.GlAccountCode);
        }

        [Fact]
        public async Task BillPayment_ShouldSucceed_ForValidBiller()
        {
            var dbContext = CreateDbContext();
            var cacheService = new TestCacheService();

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);

            var acc = new Account { Customer = customer, AccountNumber = "1234567890", Balance = 1000.00m, Status = AccountStatus.Active };
            dbContext.Accounts.Add(acc);
            await dbContext.SaveChangesAsync();

            var handler = new BillPaymentCommandHandler(dbContext, cacheService);
            var command = new BillPaymentCommand(
                acc.Id,
                "MERALCO",
                "123456789",
                150.00m,
                "idemp-key-3"
            );

            var txId = await handler.Handle(command, CancellationToken.None);

            var updatedAcc = await dbContext.Accounts.FindAsync(acc.Id);
            Assert.Equal(851.50m, updatedAcc!.Balance); // 1000 - 150 + 1.50 (1% rebate)

            var ledgerEntries = await dbContext.LedgerEntries.Where(l => l.TransactionId == txId).ToListAsync();
            Assert.Equal(2, ledgerEntries.Count);

            var debit = ledgerEntries.Single(l => l.IsDebit);
            Assert.Equal(150.00m, debit.Amount);
            Assert.Equal(acc.Id, debit.AccountId);

            var credit = ledgerEntries.Single(l => !l.IsDebit);
            Assert.Equal(150.00m, credit.Amount);
            Assert.Null(credit.AccountId);
            Assert.Equal(GlAccount.BillerClearing, credit.GlAccountCode);

            var outbox = await dbContext.OutboxMessages.FirstOrDefaultAsync();
            Assert.NotNull(outbox);
            Assert.Contains("BillPaymentExecutedEvent", outbox.Type);
        }

        [Fact]
        public async Task ProcessQrPayment_ShouldDelegateToTransfer()
        {
            var mockMediator = new Mock<IMediator>();
            var dbContext = CreateDbContext();

            var customer = new Customer { FirstName = "A", LastName = "B", Email = "a@b.com", KycStatus = KycStatus.Approved };
            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            var sourceId = Guid.NewGuid();
            var destinationAccountNumber = "1234567890";
            var qrCode = $"qr://corevix/account/{destinationAccountNumber}?tenant=test-tenant-id&name=A+B";

            mockMediator.Setup(m => m.Send(It.IsAny<TransferCommand>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(Guid.NewGuid());

            var handler = new ProcessQrPaymentCommandHandler(mockMediator.Object, dbContext);
            var command = new ProcessQrPaymentCommand(
                sourceId,
                qrCode,
                100.00m,
                "QR Transfer",
                "idemp-key-4"
            );

            await handler.Handle(command, CancellationToken.None);

            mockMediator.Verify(m => m.Send(It.Is<TransferCommand>(c => 
                c.SourceAccountId == sourceId &&
                c.DestinationAccountNumber == destinationAccountNumber &&
                c.Amount == 100.00m &&
                !c.IsExternal), It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
