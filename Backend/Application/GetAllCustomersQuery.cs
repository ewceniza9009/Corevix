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
    public record CustomerDto(
        Guid Id,
        string FirstName,
        string LastName,
        string Email,
        string PhoneNumber,
        KycStatus KycStatus,
        string? IdType,
        string? IdNumber
    );

    public record GetAllCustomersQuery() : IRequest<List<CustomerDto>>;

    public class GetAllCustomersQueryHandler : IRequestHandler<GetAllCustomersQuery, List<CustomerDto>>
    {
        private readonly IApplicationDbContext _dbContext;

        public GetAllCustomersQueryHandler(IApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<CustomerDto>> Handle(GetAllCustomersQuery request, CancellationToken cancellationToken)
        {
            var customers = await _dbContext.Customers
                .AsNoTracking()
                .Select(c => new CustomerDto(
                    c.Id,
                    c.FirstName,
                    c.LastName,
                    c.Email,
                    c.PhoneNumber,
                    c.KycStatus,
                    c.IdType,
                    c.IdNumber
                ))
                .ToListAsync(cancellationToken);

            return customers;
        }
    }
}
