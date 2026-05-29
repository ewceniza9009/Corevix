using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record AccountDetailsDto(
        Guid Id,
        string AccountNumber,
        AccountType AccountType,
        decimal Balance,
        string Currency,
        AccountStatus Status,
        Guid CustomerId);

    public record GetAccountDetailsQuery(Guid AccountId) : IRequest<AccountDetailsDto>;

    public record GetAccountByNumberQuery(string AccountNumber) : IRequest<AccountDetailsDto>;

    public record GetBalanceQuery(Guid AccountId) : IRequest<decimal>;

    public class GetAccountByNumberQueryHandler : IRequestHandler<GetAccountByNumberQuery, AccountDetailsDto>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ICacheService _cacheService;

        public GetAccountByNumberQueryHandler(IApplicationDbContext dbContext, ICacheService cacheService)
        {
            _dbContext = dbContext;
            _cacheService = cacheService;
        }

        public async Task<AccountDetailsDto> Handle(GetAccountByNumberQuery request, CancellationToken cancellationToken)
        {
            var cacheKey = $"accounts:{request.AccountNumber}:details";
            var cached = await _cacheService.GetAsync<AccountDetailsDto>(cacheKey);
            if (cached != null)
            {
                return cached;
            }

            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.AccountNumber == request.AccountNumber, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with number {request.AccountNumber} was not found.");
            }

            var dto = new AccountDetailsDto(
                account.Id,
                account.AccountNumber,
                account.AccountType,
                account.Balance,
                account.Currency,
                account.Status,
                account.CustomerId
            );

            await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
            await _cacheService.SetAsync($"accounts:{account.Id}:details", dto, TimeSpan.FromMinutes(10));

            return dto;
        }
    }

    public class GetAccountDetailsQueryHandler : IRequestHandler<GetAccountDetailsQuery, AccountDetailsDto>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ICacheService _cacheService;

        public GetAccountDetailsQueryHandler(IApplicationDbContext dbContext, ICacheService cacheService)
        {
            _dbContext = dbContext;
            _cacheService = cacheService;
        }

        public async Task<AccountDetailsDto> Handle(GetAccountDetailsQuery request, CancellationToken cancellationToken)
        {
            var cacheKey = $"accounts:{request.AccountId}:details";
            var cached = await _cacheService.GetAsync<AccountDetailsDto>(cacheKey);
            if (cached != null)
            {
                return cached;
            }

            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            var dto = new AccountDetailsDto(
                account.Id,
                account.AccountNumber,
                account.AccountType,
                account.Balance,
                account.Currency,
                account.Status,
                account.CustomerId
            );

            await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
            
            // Also cache under AccountNumber to make invalidation or retrieval flexible
            await _cacheService.SetAsync($"accounts:{account.AccountNumber}:details", dto, TimeSpan.FromMinutes(10));

            return dto;
        }
    }

    public class GetBalanceQueryHandler : IRequestHandler<GetBalanceQuery, decimal>
    {
        private readonly IMediator _mediator;

        public GetBalanceQueryHandler(IMediator mediator)
        {
            _mediator = mediator;
        }

        public async Task<decimal> Handle(GetBalanceQuery request, CancellationToken cancellationToken)
        {
            var details = await _mediator.Send(new GetAccountDetailsQuery(request.AccountId), cancellationToken);
            return details.Balance;
        }
    }
}
