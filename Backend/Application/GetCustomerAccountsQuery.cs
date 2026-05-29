using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record GetCustomerAccountsQuery(Guid CustomerId) : IRequest<List<AccountDetailsDto>>;

    public class GetCustomerAccountsQueryHandler : IRequestHandler<GetCustomerAccountsQuery, List<AccountDetailsDto>>
    {
        private readonly IApplicationDbContext _dbContext;

        public GetCustomerAccountsQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<AccountDetailsDto>> Handle(GetCustomerAccountsQuery request, CancellationToken cancellationToken)
        {
            var accounts = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.CustomerId == request.CustomerId)
                .Select(account => new AccountDetailsDto(
                    account.Id,
                    account.AccountNumber,
                    account.AccountType,
                    account.Balance,
                    account.Currency,
                    account.Status,
                    account.CustomerId
                ))
                .ToListAsync(cancellationToken);

            return accounts;
        }
    }
}
