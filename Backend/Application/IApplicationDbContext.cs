using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;
using Corevix.Core;

namespace Corevix.Application
{
    public interface IApplicationDbContext
    {
        DbSet<Customer> Customers { get; }
        DbSet<Account> Accounts { get; }
        DbSet<Transaction> Transactions { get; }
        DbSet<LedgerEntry> LedgerEntries { get; }
        DbSet<OutboxMessage> OutboxMessages { get; }
        DbSet<TransactionLimitPolicy> TransactionLimitPolicies { get; }
        DbSet<User> Users { get; }
        string CurrentTenantId { get; }
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
