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

namespace Corevix.Tests
{
    public class AccountTests
    {
        private class TestTenantProvider : ITenantProvider
        {
            public string GetTenantId() => "test-tenant-id";
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
        public async Task OpenAccount_WithUnapprovedKyc_ShouldThrowException()
        {
            var dbContext = CreateDbContext();
            var customer = new Customer
            {
                FirstName = "Bob",
                LastName = "Jones",
                Email = "bob@example.com",
                KycStatus = KycStatus.Pending
            };
            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            var handler = new OpenAccountCommandHandler(dbContext);
            var command = new OpenAccountCommand(
                customer.Id,
                AccountType.Savings,
                100.00m,
                "PHP",
                "idemp-key-1"
            );

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task OpenAccount_WithValidKyc_ShouldCreateAccountAndPostLedger()
        {
            var dbContext = CreateDbContext();
            var customer = new Customer
            {
                FirstName = "Alice",
                LastName = "Smith",
                Email = "alice@example.com",
                KycStatus = KycStatus.Approved
            };
            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            var handler = new OpenAccountCommandHandler(dbContext);
            var command = new OpenAccountCommand(
                customer.Id,
                AccountType.Savings,
                500.00m,
                "PHP",
                "idemp-key-2"
            );

            var accountId = await handler.Handle(command, CancellationToken.None);

            var account = await dbContext.Accounts
                .Include(a => a.LedgerEntries)
                .FirstOrDefaultAsync(a => a.Id == accountId);

            Assert.NotNull(account);
            Assert.Equal(500.00m, account.Balance);
            Assert.Equal("PHP", account.Currency);
            Assert.Single(account.LedgerEntries);

            var ledgerEntry = account.LedgerEntries.First();
            Assert.Equal(500.00m, ledgerEntry.Amount);
            Assert.False(ledgerEntry.IsDebit);

            var transaction = await dbContext.Transactions.FindAsync(ledgerEntry.TransactionId);
            Assert.NotNull(transaction);
            Assert.Equal(TransactionType.Deposit, transaction.TransactionType);

            var outboxMessage = await dbContext.OutboxMessages.FirstOrDefaultAsync();
            Assert.NotNull(outboxMessage);
            Assert.Contains("AccountOpenedEvent", outboxMessage.Type);
        }

        [Fact]
        public async Task AccrueDailyInterest_OnSavingsAccounts_ShouldPostAccrual()
        {
            var dbContext = CreateDbContext();
            var customer = new Customer
            {
                FirstName = "John",
                LastName = "Doe",
                Email = "john@example.com",
                KycStatus = KycStatus.Approved
            };
            dbContext.Customers.Add(customer);

            var account1 = new Account
            {
                Customer = customer,
                AccountType = AccountType.Savings,
                AccountNumber = "1111111111",
                Balance = 1000.00m,
                Currency = "PHP",
                Status = AccountStatus.Active
            };
            var account2 = new Account
            {
                Customer = customer,
                AccountType = AccountType.Checking,
                AccountNumber = "2222222222",
                Balance = 1000.00m,
                Currency = "PHP",
                Status = AccountStatus.Active
            };
            dbContext.Accounts.AddRange(account1, account2);
            await dbContext.SaveChangesAsync();

            var job = new InterestCalculationJob(dbContext);
            await job.AccrueDailyInterestAsync();

            var updatedSavings = await dbContext.Accounts.FindAsync(account1.Id);
            var updatedChecking = await dbContext.Accounts.FindAsync(account2.Id);

            Assert.NotNull(updatedSavings);
            Assert.NotNull(updatedChecking);

            decimal expectedInterest = Math.Round(1000.00m * (0.015m / 365m), 4);
            Assert.Equal(1000.00m + expectedInterest, updatedSavings.Balance);
            Assert.Equal(1000.00m, updatedChecking.Balance);

            var interestTransaction = await dbContext.Transactions
                .FirstOrDefaultAsync(t => t.TransactionType == TransactionType.InterestAccrual);
            Assert.NotNull(interestTransaction);
            Assert.Equal(expectedInterest, interestTransaction.Amount);
        }
    }
}
