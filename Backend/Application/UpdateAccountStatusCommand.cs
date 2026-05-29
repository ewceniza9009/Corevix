using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record UpdateAccountStatusCommand(
        Guid AccountId,
        AccountStatus? Status,
        decimal? LimitOverridePerTransaction,
        decimal? LimitOverrideDaily,
        decimal? LimitOverrideMonthly) : IRequest<bool>;

    public class UpdateAccountStatusCommandValidator : AbstractValidator<UpdateAccountStatusCommand>
    {
        public UpdateAccountStatusCommandValidator()
        {
            RuleFor(x => x.AccountId).NotEmpty();
        }
    }

    public class UpdateAccountStatusCommandHandler : IRequestHandler<UpdateAccountStatusCommand, bool>
    {
        private readonly IApplicationDbContext _dbContext;

        public UpdateAccountStatusCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> Handle(UpdateAccountStatusCommand request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            if (request.Status.HasValue)
            {
                account.Status = request.Status.Value;
            }

            if (request.LimitOverridePerTransaction.HasValue)
            {
                account.LimitOverridePerTransaction = request.LimitOverridePerTransaction.Value;
            }

            if (request.LimitOverrideDaily.HasValue)
            {
                account.LimitOverrideDaily = request.LimitOverrideDaily.Value;
            }

            if (request.LimitOverrideMonthly.HasValue)
            {
                account.LimitOverrideMonthly = request.LimitOverrideMonthly.Value;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
