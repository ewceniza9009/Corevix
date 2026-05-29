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
    public record PassbookLineDto(
        int Sequence,
        DateTime Date,
        string Code, // DEP, WTH, TRF, BIL, INT
        decimal? Debit,
        decimal? Credit,
        decimal Balance,
        string Description);

    public record GetPassbookQuery(Guid AccountId) : IRequest<List<PassbookLineDto>>;

    public class GetPassbookQueryHandler : IRequestHandler<GetPassbookQuery, List<PassbookLineDto>>
    {
        private readonly IApplicationDbContext _dbContext;

        public GetPassbookQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<PassbookLineDto>> Handle(GetPassbookQuery request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            var transactions = await _dbContext.Transactions
                .Where(t => t.SourceAccountId == request.AccountId || t.DestinationAccountId == request.AccountId)
                .OrderBy(t => t.CreatedAt)
                .ToListAsync(cancellationToken);

            var lines = new List<PassbookLineDto>();
            decimal runningBalance = 0;
            int sequence = 1;

            foreach (var t in transactions)
            {
                decimal? debit = null;
                decimal? credit = null;
                string code = "TRF";

                if (t.TransactionType == TransactionType.Deposit)
                {
                    credit = t.Amount;
                    runningBalance += t.Amount;
                    code = "DEP";
                }
                else if (t.TransactionType == TransactionType.Withdrawal)
                {
                    debit = t.Amount;
                    runningBalance -= t.Amount;
                    code = "WTH";
                }
                else if (t.TransactionType == TransactionType.BillPayment)
                {
                    debit = t.Amount;
                    runningBalance -= t.Amount;
                    code = "BIL";
                }
                else // Transfer
                {
                    if (t.SourceAccountId == request.AccountId)
                    {
                        debit = t.Amount;
                        runningBalance -= t.Amount;
                        code = "TRF";
                    }
                    else
                    {
                        credit = t.Amount;
                        runningBalance += t.Amount;
                        code = "TRF";
                    }
                }

                lines.Add(new PassbookLineDto(
                    sequence++,
                    t.CreatedAt,
                    code,
                    debit,
                    credit,
                    runningBalance,
                    t.Description ?? ""
                ));
            }

            return lines;
        }
    }
}
