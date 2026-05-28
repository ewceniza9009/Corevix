using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;
using Corevix.Persistence;
using Corevix.Application;
using Corevix.Common;
using Xunit;
using System.Collections.Generic;

namespace Corevix.Tests
{
    public class CustomerTests
    {
        private class TestTenantProvider : ITenantProvider
        {
            public string GetTenantId() => "test-tenant-id";
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

        [Fact]
        public async Task RegisterCustomer_WithValidData_ShouldCreateCustomerAndOutboxMessage()
        {
            var dbContext = CreateDbContext();
            var handler = new RegisterCustomerCommandHandler(dbContext, new Corevix.Infrastructure.MockComplianceScreeningService(), new TestAuditLogService());
            var command = new RegisterCustomerCommand(
                "John",
                "Doe",
                "john.doe@example.com",
                "+1234567890",
                "Passport",
                "P123456",
                "https://example.com/id.jpg",
                "https://example.com/selfie.jpg",
                "idemp-key-1"
            );

            var customerId = await handler.Handle(command, CancellationToken.None);

            var customer = await dbContext.Customers.FindAsync(customerId);
            Assert.NotNull(customer);
            Assert.Equal("John", customer.FirstName);
            Assert.Equal("Doe", customer.LastName);
            Assert.Equal("john.doe@example.com", customer.Email);
            Assert.Equal(KycStatus.Pending, customer.KycStatus);

            var outboxMessage = await dbContext.OutboxMessages.FirstOrDefaultAsync();
            Assert.NotNull(outboxMessage);
            Assert.Contains("CustomerRegisteredEvent", outboxMessage.Type);
        }

        [Fact]
        public async Task RegisterCustomer_WithDuplicateEmail_ShouldThrowException()
        {
            var dbContext = CreateDbContext();
            var handler = new RegisterCustomerCommandHandler(dbContext, new Corevix.Infrastructure.MockComplianceScreeningService(), new TestAuditLogService());
            var command1 = new RegisterCustomerCommand(
                "John",
                "Doe",
                "duplicate@example.com",
                "+1234567890",
                "Passport",
                "P123456",
                "https://example.com/id.jpg",
                "https://example.com/selfie.jpg",
                "idemp-key-1"
            );
            await handler.Handle(command1, CancellationToken.None);

            var command2 = new RegisterCustomerCommand(
                "Jane",
                "Doe",
                "duplicate@example.com",
                "+1234567891",
                "DriversLicense",
                "DL98765",
                "https://example.com/id2.jpg",
                "https://example.com/selfie2.jpg",
                "idemp-key-2"
            );

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                handler.Handle(command2, CancellationToken.None));
        }

        [Fact]
        public async Task RegisterCustomer_WithInvalidEmailOrPhone_ValidationShouldFail()
        {
            var validator = new RegisterCustomerCommandValidator();
            
            var invalidEmailCommand = new RegisterCustomerCommand(
                "John", "Doe", "invalid-email", "+1234567890", 
                "Passport", "P123456", "https://example.com/id.jpg", 
                "https://example.com/selfie.jpg", "key"
            );
            var emailResult = await validator.ValidateAsync(invalidEmailCommand);
            Assert.False(emailResult.IsValid);

            var invalidPhoneCommand = new RegisterCustomerCommand(
                "John", "Doe", "john.doe@example.com", "not-a-phone", 
                "Passport", "P123456", "https://example.com/id.jpg", 
                "https://example.com/selfie.jpg", "key"
            );
            var phoneResult = await validator.ValidateAsync(invalidPhoneCommand);
            Assert.False(phoneResult.IsValid);
        }

        [Fact]
        public async Task ApproveKyc_WithValidCustomerId_ShouldUpdateStatusToApproved()
        {
            var dbContext = CreateDbContext();
            var customer = new Customer
            {
                FirstName = "Alice",
                LastName = "Smith",
                Email = "alice@example.com",
                PhoneNumber = "+1234567899",
                KycStatus = KycStatus.Pending
            };
            dbContext.Customers.Add(customer);
            await dbContext.SaveChangesAsync();

            var handler = new ApproveKycCommandHandler(dbContext);
            await handler.Handle(new ApproveKycCommand(customer.Id), CancellationToken.None);

            var updatedCustomer = await dbContext.Customers.FindAsync(customer.Id);
            Assert.NotNull(updatedCustomer);
            Assert.Equal(KycStatus.Approved, updatedCustomer.KycStatus);
        }

        [Fact]
        public async Task ApproveKyc_WithNonExistentCustomerId_ShouldThrowKeyNotFoundException()
        {
            var dbContext = CreateDbContext();
            var handler = new ApproveKycCommandHandler(dbContext);

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                handler.Handle(new ApproveKycCommand(Guid.NewGuid()), CancellationToken.None));
        }
    }
}
