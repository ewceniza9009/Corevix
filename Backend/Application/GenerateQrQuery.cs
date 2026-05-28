using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record GenerateQrQuery(Guid AccountId) : IRequest<string>;

    public class GenerateQrQueryHandler : IRequestHandler<GenerateQrQuery, string>
    {
        private readonly IApplicationDbContext _dbContext;

        public GenerateQrQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<string> Handle(GenerateQrQuery request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .Include(a => a.Customer)
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            var tenantId = _dbContext.CurrentTenantId;
            var accountName = Uri.EscapeDataString($"{account.Customer.FirstName} {account.Customer.LastName}");
            
            // Format: qr://corevix/account/{AccountNumber}?tenant={TenantId}&name={AccountName}
            return $"qr://corevix/account/{account.AccountNumber}?tenant={tenantId}&name={accountName}";
        }
    }
}
