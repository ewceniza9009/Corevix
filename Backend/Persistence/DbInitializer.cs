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
            // Clear existing customer data in dev environment to force the fresh high-fidelity chronological seed
            if (await dbContext.Customers.AnyAsync())
            {
                var ledgerEntries = await dbContext.LedgerEntries.ToListAsync();
                dbContext.LedgerEntries.RemoveRange(ledgerEntries);

                var transactions = await dbContext.Transactions.ToListAsync();
                dbContext.Transactions.RemoveRange(transactions);

                var accounts = await dbContext.Accounts.ToListAsync();
                dbContext.Accounts.RemoveRange(accounts);

                var customerUsers = await dbContext.Users.Where(u => u.Role == UserRole.Customer).ToListAsync();
                dbContext.Users.RemoveRange(customerUsers);

                var customers = await dbContext.Customers.ToListAsync();
                dbContext.Customers.RemoveRange(customers);

                await dbContext.SaveChangesAsync();
            }

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

                    // Create Time Deposit Account (100% chance for John Doe customer@corevix.com, 50% for others)
                    if (customer.Id == defaultCustomer.Id || faker.Random.Bool(0.5f))
                    {
                        var timeDeposit = new Account
                        {
                            Id = Guid.NewGuid(),
                            TenantId = customer.TenantId,
                            AccountNumber = "30" + faker.Random.Number(10000000, 99999999),
                            BranchCode = savings.BranchCode,
                            AccountType = AccountType.TimeDeposit,
                            Balance = 0,
                            Currency = "PHP",
                            Status = AccountStatus.Active,
                            CustomerId = customer.Id,
                            CreatedAt = customer.CreatedAt
                        };
                        accountList.Add(timeDeposit);
                    }
                }

                await dbContext.Accounts.AddRangeAsync(accountList);
                await dbContext.SaveChangesAsync();

                // 1. Initial Opening Deposit for all accounts to establish funds
                foreach (var account in accountList)
                {
                    var initialAmount = faker.Finance.Amount(50000, 200000);
                    initialAmount = Math.Floor(initialAmount / 1000) * 1000; // clean thousands
                    
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

                    var glCode = account.AccountType switch
                    {
                        AccountType.Checking => GlAccount.CheckingDeposits,
                        AccountType.TimeDeposit => GlAccount.TimeDeposits,
                        _ => GlAccount.SavingsDeposits
                    };
                    var glName = account.AccountType switch
                    {
                        AccountType.Checking => "Customer Checking Deposits",
                        AccountType.TimeDeposit => "Customer Time Deposits",
                        _ => "Customer Savings Deposits"
                    };

                    // Debit: Cash Asset
                    dbContext.LedgerEntries.Add(new LedgerEntry
                    {
                        Id = Guid.NewGuid(),
                        TenantId = account.TenantId,
                        AccountId = null,
                        GlAccountCode = GlAccount.CashVault,
                        GlAccountName = "Cash Asset (Vault)",
                        TransactionId = initialTx.Id,
                        Amount = initialAmount,
                        IsDebit = true,
                        CreatedAt = account.CreatedAt
                    });

                    // Credit: Customer Account
                    dbContext.LedgerEntries.Add(new LedgerEntry
                    {
                        Id = Guid.NewGuid(),
                        TenantId = account.TenantId,
                        AccountId = account.Id,
                        GlAccountCode = glCode,
                        GlAccountName = glName,
                        TransactionId = initialTx.Id,
                        Amount = initialAmount,
                        IsDebit = false,
                        CreatedAt = account.CreatedAt
                    });

                    account.Balance = initialAmount;
                }

                await dbContext.SaveChangesAsync();

                // 2. Generate chronological transaction history over the last 30 days
                var transactionFaker = new Faker();
                var startDay = DateTime.UtcNow.AddDays(-29);

                for (int dayOffset = 0; dayOffset <= 29; dayOffset++)
                {
                    var currentDay = startDay.AddDays(dayOffset);

                    // Daily transaction density increases near the end of the month
                    int dailyTxCount = transactionFaker.Random.Number(1, 2);
                    if (dayOffset >= 23) // Generate more events in the last 7 days for rich graph data
                    {
                        dailyTxCount = transactionFaker.Random.Number(3, 5);
                    }

                    for (int tIndex = 0; tIndex < dailyTxCount; tIndex++)
                    {
                        var txTime = currentDay.AddHours(transactionFaker.Random.Number(0, 23))
                                               .AddMinutes(transactionFaker.Random.Number(0, 59));
                        if (txTime > DateTime.UtcNow) txTime = DateTime.UtcNow;

                        // Select a random checking/savings account from the active accounts pool
                        var srcAccount = transactionFaker.PickRandom(accountList.Where(a => a.AccountType == AccountType.Savings || a.AccountType == AccountType.Checking).ToList());
                        var srcGlCode = srcAccount.AccountType == AccountType.Checking ? GlAccount.CheckingDeposits : GlAccount.SavingsDeposits;
                        var srcGlName = srcAccount.AccountType == AccountType.Checking ? "Customer Checking Deposits" : "Customer Savings Deposits";

                        var type = transactionFaker.PickRandom<TransactionType>();

                        if (type == TransactionType.Deposit)
                        {
                            var depAmt = transactionFaker.Finance.Amount(2000, 30000);
                            depAmt = Math.Floor(depAmt / 100) * 100; // clean values

                            var tx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                TenantId = srcAccount.TenantId,
                                ReferenceNumber = "DEP-" + transactionFaker.Random.Replace("######-####").ToUpperInvariant(),
                                Amount = depAmt,
                                TransactionType = TransactionType.Deposit,
                                Status = TransactionStatus.Completed,
                                DestinationAccountId = srcAccount.Id,
                                Description = "OTC Teller Cash Deposit",
                                CreatedAt = txTime
                            };
                            dbContext.Transactions.Add(tx);

                            // Debit Cash
                            dbContext.LedgerEntries.Add(new LedgerEntry
                            {
                                Id = Guid.NewGuid(),
                                TenantId = srcAccount.TenantId,
                                AccountId = null,
                                GlAccountCode = GlAccount.CashVault,
                                GlAccountName = "Cash Asset (Vault)",
                                TransactionId = tx.Id,
                                Amount = depAmt,
                                IsDebit = true,
                                CreatedAt = txTime
                            });

                            // Credit Customer
                            dbContext.LedgerEntries.Add(new LedgerEntry
                            {
                                Id = Guid.NewGuid(),
                                TenantId = srcAccount.TenantId,
                                AccountId = srcAccount.Id,
                                GlAccountCode = srcGlCode,
                                GlAccountName = srcGlName,
                                TransactionId = tx.Id,
                                Amount = depAmt,
                                IsDebit = false,
                                CreatedAt = txTime
                            });

                            srcAccount.Balance += depAmt;
                        }
                        else if (type == TransactionType.Withdrawal)
                        {
                            var wthAmt = transactionFaker.Finance.Amount(1000, 10000);
                            wthAmt = Math.Floor(wthAmt / 500) * 500; // ATM round bills
                            if (wthAmt <= 0) wthAmt = 500;

                            if (srcAccount.Balance >= wthAmt)
                            {
                                var tx = new Transaction
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    ReferenceNumber = "ATM-" + transactionFaker.Random.Replace("######-####").ToUpperInvariant(),
                                    Amount = wthAmt,
                                    TransactionType = TransactionType.Withdrawal,
                                    Status = TransactionStatus.Completed,
                                    SourceAccountId = srcAccount.Id,
                                    Description = "ATM Cash Withdrawal",
                                    CreatedAt = txTime
                                };
                                dbContext.Transactions.Add(tx);

                                // Debit Customer
                                dbContext.LedgerEntries.Add(new LedgerEntry
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    AccountId = srcAccount.Id,
                                    GlAccountCode = srcGlCode,
                                    GlAccountName = srcGlName,
                                    TransactionId = tx.Id,
                                    Amount = wthAmt,
                                    IsDebit = true,
                                    CreatedAt = txTime
                                });

                                // Credit Cash
                                dbContext.LedgerEntries.Add(new LedgerEntry
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    AccountId = null,
                                    GlAccountCode = GlAccount.CashVault,
                                    GlAccountName = "Cash Asset (Vault)",
                                    TransactionId = tx.Id,
                                    Amount = wthAmt,
                                    IsDebit = false,
                                    CreatedAt = txTime
                                });

                                srcAccount.Balance -= wthAmt;
                            }
                        }
                        else if (type == TransactionType.BillPayment)
                        {
                            var billAmt = transactionFaker.Finance.Amount(500, 5000);
                            billAmt = Math.Round(billAmt, 2);

                            if (srcAccount.Balance >= billAmt)
                            {
                                var billers = new[] { "Meralco", "PLDT", "Maynilad", "Globe Telecom", "Manila Water" };
                                var biller = transactionFaker.PickRandom(billers);

                                var tx = new Transaction
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    ReferenceNumber = "BIL-" + transactionFaker.Random.Replace("######-####").ToUpperInvariant(),
                                    Amount = billAmt,
                                    TransactionType = TransactionType.BillPayment,
                                    Status = TransactionStatus.Completed,
                                    SourceAccountId = srcAccount.Id,
                                    Description = $"Utility Payment to {biller}",
                                    CreatedAt = txTime
                                };
                                dbContext.Transactions.Add(tx);

                                // Debit Customer
                                dbContext.LedgerEntries.Add(new LedgerEntry
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    AccountId = srcAccount.Id,
                                    GlAccountCode = srcGlCode,
                                    GlAccountName = srcGlName,
                                    TransactionId = tx.Id,
                                    Amount = billAmt,
                                    IsDebit = true,
                                    CreatedAt = txTime
                                });

                                // Credit Biller Clearing
                                dbContext.LedgerEntries.Add(new LedgerEntry
                                {
                                    Id = Guid.NewGuid(),
                                    TenantId = srcAccount.TenantId,
                                    AccountId = null,
                                    GlAccountCode = GlAccount.BillerClearing,
                                    GlAccountName = "Biller Settlement Clearing",
                                    TransactionId = tx.Id,
                                    Amount = billAmt,
                                    IsDebit = false,
                                    CreatedAt = txTime
                                });

                                srcAccount.Balance -= billAmt;
                            }
                        }
                        else if (type == TransactionType.Transfer)
                        {
                            var trfAmt = transactionFaker.Finance.Amount(1000, 15000);
                            trfAmt = Math.Floor(trfAmt / 100) * 100;

                            if (srcAccount.Balance >= trfAmt)
                            {
                                bool isExternal = transactionFaker.Random.Bool(0.3f); // 30% external, 70% internal

                                if (isExternal)
                                {
                                    var extBanks = new[] { "BDO Unibank", "BPI", "Metrobank", "GCash", "Maya" };
                                    var targetBank = transactionFaker.PickRandom(extBanks);
                                    var mockAccNum = transactionFaker.Random.Replace("09#########");

                                    var tx = new Transaction
                                    {
                                        Id = Guid.NewGuid(),
                                        TenantId = srcAccount.TenantId,
                                        ReferenceNumber = "TRF-" + transactionFaker.Random.Replace("######-####").ToUpperInvariant(),
                                        Amount = trfAmt,
                                        TransactionType = TransactionType.Transfer,
                                        Status = TransactionStatus.Completed,
                                        SourceAccountId = srcAccount.Id,
                                        Description = $"InstaPay Transfer to {targetBank} - {mockAccNum}",
                                        CreatedAt = txTime
                                    };
                                    dbContext.Transactions.Add(tx);

                                    // Debit Customer
                                    dbContext.LedgerEntries.Add(new LedgerEntry
                                    {
                                        Id = Guid.NewGuid(),
                                        TenantId = srcAccount.TenantId,
                                        AccountId = srcAccount.Id,
                                        GlAccountCode = srcGlCode,
                                        GlAccountName = srcGlName,
                                        TransactionId = tx.Id,
                                        Amount = trfAmt,
                                        IsDebit = true,
                                        CreatedAt = txTime
                                    });

                                    // Credit Central Bank Reserve
                                    dbContext.LedgerEntries.Add(new LedgerEntry
                                    {
                                        Id = Guid.NewGuid(),
                                        TenantId = srcAccount.TenantId,
                                        AccountId = null,
                                        GlAccountCode = GlAccount.CentralBankReserve,
                                        GlAccountName = "Central Bank Reserve (Interbank Settlement)",
                                        TransactionId = tx.Id,
                                        Amount = trfAmt,
                                        IsDebit = false,
                                        CreatedAt = txTime
                                    });

                                    srcAccount.Balance -= trfAmt;
                                }
                                else
                                {
                                    // Internal Transfer: pick a destination account from other accounts in the list
                                    var destAccount = accountList.FirstOrDefault(a => a.Id != srcAccount.Id);
                                    if (destAccount != null)
                                    {
                                        var destGlCode = destAccount.AccountType == AccountType.Checking ? GlAccount.CheckingDeposits : GlAccount.SavingsDeposits;
                                        var destGlName = destAccount.AccountType == AccountType.Checking ? "Customer Checking Deposits" : "Customer Savings Deposits";

                                        var tx = new Transaction
                                        {
                                            Id = Guid.NewGuid(),
                                            TenantId = srcAccount.TenantId,
                                            ReferenceNumber = "TRF-" + transactionFaker.Random.Replace("######-####").ToUpperInvariant(),
                                            Amount = trfAmt,
                                            TransactionType = TransactionType.Transfer,
                                            Status = TransactionStatus.Completed,
                                            SourceAccountId = srcAccount.Id,
                                            DestinationAccountId = destAccount.Id,
                                            Description = $"Fund Transfer to Account {destAccount.AccountNumber}",
                                            CreatedAt = txTime
                                        };
                                        dbContext.Transactions.Add(tx);

                                        // Debit Source Customer
                                        dbContext.LedgerEntries.Add(new LedgerEntry
                                        {
                                            Id = Guid.NewGuid(),
                                            TenantId = srcAccount.TenantId,
                                            AccountId = srcAccount.Id,
                                            GlAccountCode = srcGlCode,
                                            GlAccountName = srcGlName,
                                            TransactionId = tx.Id,
                                            Amount = trfAmt,
                                            IsDebit = true,
                                            CreatedAt = txTime
                                        });

                                        // Credit Destination Customer
                                        dbContext.LedgerEntries.Add(new LedgerEntry
                                        {
                                            Id = Guid.NewGuid(),
                                            TenantId = destAccount.TenantId,
                                            AccountId = destAccount.Id,
                                            GlAccountCode = destGlCode,
                                            GlAccountName = destGlName,
                                            TransactionId = tx.Id,
                                            Amount = trfAmt,
                                            IsDebit = false,
                                            CreatedAt = txTime
                                        });

                                        srcAccount.Balance -= trfAmt;
                                        destAccount.Balance += trfAmt;
                                    }
                                }
                            }
                        }
                    }
                }

                await dbContext.SaveChangesAsync();
            }
        }
    }
}
// Seeding overhauled successfully
