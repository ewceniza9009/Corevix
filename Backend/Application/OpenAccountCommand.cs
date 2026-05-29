using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record OpenAccountCommand(
        Guid CustomerId,
        AccountType AccountType,
        decimal InitialDepositAmount,
        string Currency,
        string IdempotencyKey,
        string BranchCode = "0001") : IRequest<Guid>, IIdempotentCommand;

    public class OpenAccountCommandValidator : AbstractValidator<OpenAccountCommand>
    {
        public OpenAccountCommandValidator()
        {
            RuleFor(x => x.CustomerId).NotEmpty();
            RuleFor(x => x.InitialDepositAmount).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Currency).NotEmpty().Length(3);
        }
    }

    public class OpenAccountCommandHandler : IRequestHandler<OpenAccountCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;

        public OpenAccountCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<Guid> Handle(OpenAccountCommand request, CancellationToken cancellationToken)
        {
            var customer = await _dbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            if (customer == null)
            {
                throw new KeyNotFoundException($"Customer with ID {request.CustomerId} was not found.");
            }

            if (customer.KycStatus != KycStatus.Approved)
            {
                throw new InvalidOperationException("Customer KYC status must be Approved before opening an account.");
            }

            string accountNumber = await GenerateUniqueAccountNumberAsync(cancellationToken);

            var account = new Account
            {
                CustomerId = request.CustomerId,
                AccountType = request.AccountType,
                AccountNumber = accountNumber,
                BranchCode = request.BranchCode,
                Currency = request.Currency,
                Balance = request.InitialDepositAmount,
                Status = AccountStatus.Active
            };

            _dbContext.Accounts.Add(account);

            if (request.InitialDepositAmount > 0)
            {
                var transaction = new Transaction
                {
                    ReferenceNumber = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant(),
                    Amount = request.InitialDepositAmount,
                    TransactionType = TransactionType.Deposit,
                    Status = TransactionStatus.Completed,
                    DestinationAccountId = account.Id,
                    Description = "Initial Account Deposit"
                };

                _dbContext.Transactions.Add(transaction);

                var ledgerEntry = new LedgerEntry
                {
                    AccountId = account.Id,
                    TransactionId = transaction.Id,
                    Amount = request.InitialDepositAmount,
                    IsDebit = false
                };

                _dbContext.LedgerEntries.Add(ledgerEntry);
            }

            var domainEvent = new AccountOpenedEvent(
                account.Id,
                customer.Id,
                account.AccountNumber,
                _dbContext.CurrentTenantId
            );

            var eventType = typeof(AccountOpenedEvent);
            var outboxMessage = new OutboxMessage
            {
                Type = eventType.AssemblyQualifiedName ?? eventType.FullName ?? eventType.Name,
                Content = JsonSerializer.Serialize(domainEvent),
                OccurredOnUtc = DateTime.UtcNow
            };

            _dbContext.OutboxMessages.Add(outboxMessage);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return account.Id;
        }

        private async Task<string> GenerateUniqueAccountNumberAsync(CancellationToken cancellationToken)
        {
            var random = new Random();
            while (true)
            {
                var builder = new StringBuilder();
                for (int i = 0; i < 10; i++)
                {
                    builder.Append(random.Next(0, 10));
                }
                string candidate = builder.ToString();

                var exists = await _dbContext.Accounts
                    .AnyAsync(a => a.AccountNumber == candidate, cancellationToken);

                if (!exists)
                {
                    return candidate;
                }
            }
        }
    }
}
