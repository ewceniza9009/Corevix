using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record ApproveKycCommand(Guid CustomerId) : IRequest;

    public class ApproveKycCommandHandler : IRequestHandler<ApproveKycCommand>
    {
        private readonly IApplicationDbContext _dbContext;

        public ApproveKycCommandHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task Handle(ApproveKycCommand request, CancellationToken cancellationToken)
        {
            var customer = await _dbContext.Customers
                .FirstOrDefaultAsync(c => c.Id == request.CustomerId, cancellationToken);

            if (customer == null)
            {
                throw new KeyNotFoundException($"Customer with ID {request.CustomerId} was not found.");
            }

            customer.KycStatus = KycStatus.Approved;

            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
