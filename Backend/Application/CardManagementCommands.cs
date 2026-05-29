using System;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record ToggleCardLockCommand(Guid AccountId) : IRequest<bool>;

    public class ToggleCardLockCommandHandler : IRequestHandler<ToggleCardLockCommand, bool>
    {
        private readonly IApplicationDbContext _dbContext;

        public ToggleCardLockCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> Handle(ToggleCardLockCommand request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            account.IsCardLocked = !account.IsCardLocked;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return account.IsCardLocked;
        }
    }

    public record UpdateCardLimitsCommand(
        Guid AccountId,
        decimal LimitOverridePerTransaction,
        decimal LimitOverrideDaily) : IRequest<bool>;

    public class UpdateCardLimitsCommandHandler : IRequestHandler<UpdateCardLimitsCommand, bool>
    {
        private readonly IApplicationDbContext _dbContext;

        public UpdateCardLimitsCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<bool> Handle(UpdateCardLimitsCommand request, CancellationToken cancellationToken)
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken);

            if (account == null)
            {
                throw new KeyNotFoundException($"Account with ID {request.AccountId} was not found.");
            }

            account.LimitOverridePerTransaction = request.LimitOverridePerTransaction;
            account.LimitOverrideDaily = request.LimitOverrideDaily;

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
