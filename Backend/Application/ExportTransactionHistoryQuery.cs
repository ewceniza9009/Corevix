using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record ExportTransactionHistoryQuery(
        Guid AccountId,
        TransactionType? TransactionType = null,
        DateTime? StartDate = null,
        DateTime? EndDate = null) : IRequest<byte[]>;

    public class ExportTransactionHistoryQueryHandler : IRequestHandler<ExportTransactionHistoryQuery, byte[]>
    {
        private readonly IApplicationDbContext _dbContext;

        public ExportTransactionHistoryQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<byte[]> Handle(ExportTransactionHistoryQuery request, CancellationToken cancellationToken)
        {
            var query = _dbContext.Transactions.AsNoTracking();

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

            var transactions = await query
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync(cancellationToken);

            using var memoryStream = new MemoryStream();
            using (var writer = new StreamWriter(memoryStream, Encoding.UTF8))
            {
                // Write Header
                await writer.WriteLineAsync("ReferenceNumber,Amount,Type,Status,Description,Date");

                foreach (var t in transactions)
                {
                    var line = $"\"{t.ReferenceNumber}\",{t.Amount},\"{t.TransactionType}\",\"{t.Status}\",\"{t.Description.Replace("\"", "\"\"")}\",\"{t.CreatedAt:yyyy-MM-dd HH:mm:ss}\"";
                    await writer.WriteLineAsync(line);
                }
            }

            return memoryStream.ToArray();
        }
    }
}
