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
    public record TransactionDto(
        Guid Id,
        string ReferenceNumber,
        decimal Amount,
        TransactionType TransactionType,
        TransactionStatus Status,
        Guid? SourceAccountId,
        Guid? DestinationAccountId,
        string Description,
        DateTime CreatedAt);

    public record PagedList<T>(List<T> Items, int PageNumber, int PageSize, int TotalCount)
    {
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    public record GetTransactionHistoryQuery(
        Guid AccountId,
        int PageNumber = 1,
        int PageSize = 10,
        TransactionType? TransactionType = null,
        DateTime? StartDate = null,
        DateTime? EndDate = null) : IRequest<PagedList<TransactionDto>>;

    public class GetTransactionHistoryQueryHandler : IRequestHandler<GetTransactionHistoryQuery, PagedList<TransactionDto>>
    {
        private readonly IApplicationDbContext _dbContext;

        public GetTransactionHistoryQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<PagedList<TransactionDto>> Handle(GetTransactionHistoryQuery request, CancellationToken cancellationToken)
        {
            var query = _dbContext.Transactions.AsNoTracking();

            // Filter transactions involving this account as source or destination
            query = query.Where(t => t.SourceAccountId == request.AccountId || t.DestinationAccountId == request.AccountId);

            if (request.TransactionType.HasValue)
            {
                query = query.Where(t => t.TransactionType == request.TransactionType.Value);
            }

            if (request.StartDate.HasValue)
            {
                query = query.Where(t => t.CreatedAt >= request.StartDate.Value);
            }

            if (request.EndDate.HasValue)
            {
                query = query.Where(t => t.CreatedAt <= request.EndDate.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(t => new TransactionDto(
                    t.Id,
                    t.ReferenceNumber,
                    t.Amount,
                    t.TransactionType,
                    t.Status,
                    t.SourceAccountId,
                    t.DestinationAccountId,
                    t.Description,
                    t.CreatedAt
                ))
                .ToListAsync(cancellationToken);

            return new PagedList<TransactionDto>(items, request.PageNumber, request.PageSize, totalCount);
        }
    }
}
