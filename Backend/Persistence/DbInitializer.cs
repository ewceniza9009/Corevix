using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Corevix.Core;
using Corevix.Application;
using Corevix.Application.Security;
using Bogus;

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

            // 2. Seed Default Users if empty (staff, approver, default customer)
            const string defaultPassword = "Password123!";
            var (hash, salt) = passwordHasher.HashPassword(defaultPassword);

            if (!await dbContext.Users.AnyAsync(u => u.Role == UserRole.Staff || u.Role == UserRole.Approver))
            {
                var systemUsers = new List<User>
                {
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

                await dbContext.Users.AddRangeAsync(systemUsers);
                await dbContext.SaveChangesAsync();
            }

            // 3. Seed Mock Customers, Users, Accounts, Transactions, and LedgerEntries using Bogus
            if (!await dbContext.Customers.AnyAsync())
            {
                Randomizer.Seed = new Random(8675309);
                var faker = new Faker();

                var customerFaker = new Faker<Customer>()
                    .RuleFor(c => c.Id, f => Guid.NewGuid())
                    .RuleFor(c => c.TenantId, f => "test-tenant-id")
                    .RuleFor(c => c.FirstName, f => f.Name.FirstName())
                    .RuleFor(c => c.LastName, f => f.Name.LastName())
                    .RuleFor(c => c.Email, (f, c) => f.Internet.Email(c.FirstName, c.LastName).ToLowerInvariant())
                    .RuleFor(c => c.PhoneNumber, f => f.Phone.PhoneNumber("+639#########"))
                    .RuleFor(c => c.KycStatus, f => f.PickRandom<KycStatus>())
                    .RuleFor(c => c.IdType, f => f.PickRandom(new[] { "Passport", "DriversLicense", "UMID", "NationalID" }))
                    .RuleFor(c => c.IdNumber, f => f.Random.Replace("###-###-###"))
                    .RuleFor(c => c.IdImageUri, f => "https://example.com/ids/" + f.Random.Guid() + ".jpg")
                    .RuleFor(c => c.SelfieImageUri, f => "https://example.com/selfies/" + f.Random.Guid() + ".jpg")
                    .RuleFor(c => c.CreatedAt, f => f.Date.Past(1));

                var customers = customerFaker.Generate(10);

                // Add one stable default customer first for login testing
                var defaultCustomer = new Customer
                {
                    Id = Guid.Parse("b1b2c3d4-0001-0001-0001-000000000001"),
                    TenantId = "test-tenant-id",
                    FirstName = "John",
                    LastName = "Doe",
                    Email = "customer@corevix.com",
                    PhoneNumber = "+639171234567",
                    KycStatus = KycStatus.Approved,
                    IdType = "Passport",
                    IdNumber = "PASSPORT-12345",
                    IdImageUri = "https://example.com/mock-id.jpg",
                    SelfieImageUri = "https://example.com/mock-selfie.jpg",
                    CreatedAt = DateTime.UtcNow.AddMonths(-6)
                };
                customers.Insert(0, defaultCustomer);

                await dbContext.Customers.AddRangeAsync(customers);
                await dbContext.SaveChangesAsync();

                // Create User records for all customers
                var users = customers.Select(c => new User
                {
                    Id = Guid.NewGuid(),
                    TenantId = c.TenantId,
                    Email = c.Email,
                    PasswordHash = hash,
                    PasswordSalt = salt,
                    Role = UserRole.Customer,
                    CustomerId = c.Id,
                    IsActive = true,
                    CreatedAt = c.CreatedAt
                }).ToList();

                await dbContext.Users.AddRangeAsync(users);
                await dbContext.SaveChangesAsync();

                // Generate accounts & transactions
                var branchCodes = new[] { "0001", "0002", "0003" };
                var accountList = new List<Account>();

                foreach (var customer in customers)
                {
                    // Create Savings Account
                    var savings = new Account
                    {
                        Id = Guid.NewGuid(),
                        TenantId = customer.TenantId,
                        AccountNumber = "10" + faker.Random.Number(10000000, 99999999),
                        BranchCode = faker.PickRandom(branchCodes),
                        AccountType = AccountType.Savings,
                        Balance = 0, // Will be updated by seeding transactions below
                        Currency = "PHP",
                        Status = AccountStatus.Active,
                        CustomerId = customer.Id,
                        CreatedAt = customer.CreatedAt
                    };
                    accountList.Add(savings);

                    // Create Checking Account optionally
                    if (faker.Random.Bool())
                    {
                        var checking = new Account
                        {
                            Id = Guid.NewGuid(),
                            TenantId = customer.TenantId,
                            AccountNumber = "20" + faker.Random.Number(10000000, 99999999),
                            BranchCode = savings.BranchCode,
                            AccountType = AccountType.Checking,
                            Balance = 0,
                            Currency = "PHP",
                            Status = AccountStatus.Active,
                            CustomerId = customer.Id,
                            CreatedAt = customer.CreatedAt
                        };
                        accountList.Add(checking);
                    }
                }

                await dbContext.Accounts.AddRangeAsync(accountList);
                await dbContext.SaveChangesAsync();

                // Generate transactions to populate balances and ledger entries
                foreach (var account in accountList)
                {
                    // 1. Initial Deposit to establish some funds
                    var initialAmount = faker.Finance.Amount(10000, 200000);
                    var initialTx = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        TenantId = account.TenantId,
                        ReferenceNumber = "DEP-" + faker.Random.Replace("######-####").ToUpperInvariant(),
                        Amount = initialAmount,
                        TransactionType = TransactionType.Deposit,
                        Status = TransactionStatus.Completed,
                        DestinationAccountId = account.Id,
                        Description = "Initial Account Opening Deposit",
                        CreatedAt = account.CreatedAt
                    };
                    dbContext.Transactions.Add(initialTx);

                    var initialLedger = new LedgerEntry
                    {
                        Id = Guid.NewGuid(),
                        TenantId = account.TenantId,
                        AccountId = account.Id,
                        TransactionId = initialTx.Id,
                        Amount = initialAmount,
                        IsDebit = false, // Credit increases deposit balance
                        CreatedAt = account.CreatedAt
                    };
                    dbContext.LedgerEntries.Add(initialLedger);
                    account.Balance += initialAmount;

                    // 2. Generate random transaction history
                    int txCount = faker.Random.Number(3, 8);
                    for (int i = 0; i < txCount; i++)
                    {
                        var type = faker.PickRandom<TransactionType>();
                        var txTime = account.CreatedAt.AddDays(faker.Random.Number(1, 30));
                        if (txTime > DateTime.UtcNow) txTime = DateTime.UtcNow;

                        if (type == TransactionType.Deposit)
                        {
                            var depAmt = faker.Finance.Amount(1000, 50000);
                            var tx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                ReferenceNumber = "DEP-" + faker.Random.Replace("######-####").ToUpperInvariant(),
                                Amount = depAmt,
                                TransactionType = TransactionType.Deposit,
                                Status = TransactionStatus.Completed,
                                DestinationAccountId = account.Id,
                                Description = "OTC Teller Cash Deposit",
                                CreatedAt = txTime
                            };
                            dbContext.Transactions.Add(tx);

                            dbContext.LedgerEntries.Add(new LedgerEntry
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                AccountId = account.Id,
                                TransactionId = tx.Id,
                                Amount = depAmt,
                                IsDebit = false, // Credit
                                CreatedAt = txTime
                            });
                            account.Balance += depAmt;
                        }
                        else if (type == TransactionType.Withdrawal && account.Balance > 5000)
                        {
                            var wthAmt = faker.Finance.Amount(500, 4000);
                            // Ensure it is integer/hundred bills
                            wthAmt = Math.Floor(wthAmt / 100) * 100;
                            if (wthAmt <= 0) wthAmt = 100;

                            var tx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                ReferenceNumber = "ATM-" + faker.Random.Replace("######-####").ToUpperInvariant(),
                                Amount = wthAmt,
                                TransactionType = TransactionType.Withdrawal,
                                Status = TransactionStatus.Completed,
                                SourceAccountId = account.Id,
                                Description = "ATM Withdrawal",
                                CreatedAt = txTime
                            };
                            dbContext.Transactions.Add(tx);

                            dbContext.LedgerEntries.Add(new LedgerEntry
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                AccountId = account.Id,
                                TransactionId = tx.Id,
                                Amount = wthAmt,
                                IsDebit = true, // Debit
                                CreatedAt = txTime
                            });
                            account.Balance -= wthAmt;
                        }
                        else if (type == TransactionType.BillPayment && account.Balance > 10000)
                        {
                            var billAmt = faker.Finance.Amount(500, 5000);
                            var billers = new[] { "Meralco", "PLDT", "Maynilad", "Globe Telecom" };
                            var biller = faker.PickRandom(billers);

                            var tx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                ReferenceNumber = "BIL-" + faker.Random.Replace("######-####").ToUpperInvariant(),
                                Amount = billAmt,
                                TransactionType = TransactionType.BillPayment,
                                Status = TransactionStatus.Completed,
                                SourceAccountId = account.Id,
                                Description = $"Utility Settlement to {biller}",
                                CreatedAt = txTime
                            };
                            dbContext.Transactions.Add(tx);

                            dbContext.LedgerEntries.Add(new LedgerEntry
                            {
                                Id = Guid.NewGuid(),
                                TenantId = account.TenantId,
                                AccountId = account.Id,
                                TransactionId = tx.Id,
                                Amount = billAmt,
                                IsDebit = true,
                                CreatedAt = txTime
                            });
                            account.Balance -= billAmt;
                        }
                    }
                }

                await dbContext.SaveChangesAsync();
            }
        }
    }
}
