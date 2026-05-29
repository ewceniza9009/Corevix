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
    public record PendingKycCustomerDto(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string PhoneNumber,
        string? IdType,
        string? IdNumber,
        string? IdImageUri,
        string? SelfieImageUri
    );

    public record GetPendingKycCustomersQuery() : IRequest<List<PendingKycCustomerDto>>;

    public class GetPendingKycCustomersQueryHandler : IRequestHandler<GetPendingKycCustomersQuery, List<PendingKycCustomerDto>>
    {
        private readonly IApplicationDbContext _dbContext;

        public GetPendingKycCustomersQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<PendingKycCustomerDto>> Handle(GetPendingKycCustomersQuery request, CancellationToken cancellationToken)
        {
            var pendingCustomers = await _dbContext.Customers
                .AsNoTracking()
                .Where(c => c.KycStatus == KycStatus.Pending)
                .Select(c => new PendingKycCustomerDto(
                    c.Id,
                    c.FirstName,
                    c.LastName,
                    c.Email,
                    c.PhoneNumber,
                    c.IdType,
                    c.IdNumber,
                    c.IdImageUri,
                    c.SelfieImageUri
                ))
                .ToListAsync(cancellationToken);

            return pendingCustomers;
        }
    }
}
