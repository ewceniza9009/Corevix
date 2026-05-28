using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application
{
    public record RegisterCustomerCommand(
        string FirstName,
        string LastName,
        string Email,
        string PhoneNumber,
        string IdType,
        string IdNumber,
        string IdImageUri,
        string SelfieImageUri,
        string IdempotencyKey) : IRequest<Guid>, IIdempotentCommand;

    public class RegisterCustomerCommandValidator : AbstractValidator<RegisterCustomerCommand>
    {
        public RegisterCustomerCommandValidator()
        {
            RuleFor(x => x.FirstName).NotEmpty();
            RuleFor(x => x.LastName).NotEmpty();
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.PhoneNumber).NotEmpty().Matches(@"^\+?[1-9]\d{1,14}$");
            RuleFor(x => x.IdType).NotEmpty();
            RuleFor(x => x.IdNumber).NotEmpty();
            RuleFor(x => x.IdImageUri).NotEmpty();
            RuleFor(x => x.SelfieImageUri).NotEmpty();
        }
    }

    public class RegisterCustomerCommandHandler : IRequestHandler<RegisterCustomerCommand, Guid>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly IComplianceScreeningService _complianceService;
        private readonly IAuditLogService _auditLogService;

        public RegisterCustomerCommandHandler(
            IApplicationDbContext dbContext,
            IComplianceScreeningService complianceService,
            IAuditLogService auditLogService)
        {
            _dbContext = dbContext;
            _complianceService = complianceService;
            _auditLogService = auditLogService;
        }

        public async Task<Guid> Handle(RegisterCustomerCommand request, CancellationToken cancellationToken)
        {
            var emailExists = await _dbContext.Customers
                .AnyAsync(c => c.Email == request.Email, cancellationToken);

            if (emailExists)
            {
                throw new InvalidOperationException("A customer with this email address already exists.");
            }

            // AML / PEP Compliance Screening
            var screeningResult = await _complianceService.ScreenCustomerAsync(request.FirstName, request.LastName);

            if (screeningResult.IsMatch && screeningResult.ConfidenceScore >= 0.8m)
            {
                // High-confidence match: reject registration
                var blockedLog = new AuditLog
                {
                    TenantId = _dbContext.CurrentTenantId,
                    Action = "AML_BLOCKED",
                    EntityName = "Customer",
                    EntityId = $"{request.FirstName} {request.LastName}",
                    Payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        screeningResult.MatchType,
                        screeningResult.MatchedName,
                        screeningResult.ConfidenceScore,
                        Email = request.Email
                    }),
                    Timestamp = DateTime.UtcNow
                };
                await _auditLogService.WriteAsync(blockedLog, cancellationToken);

                throw new InvalidOperationException(
                    $"Registration rejected: customer name matched {screeningResult.MatchType} list entry '{screeningResult.MatchedName}' with confidence {screeningResult.ConfidenceScore:P0}.");
            }

            if (screeningResult.IsMatch)
            {
                // Lower-confidence match: flag for manual review but allow registration
                var flagLog = new AuditLog
                {
                    TenantId = _dbContext.CurrentTenantId,
                    Action = "AML_FLAG",
                    EntityName = "Customer",
                    EntityId = $"{request.FirstName} {request.LastName}",
                    Payload = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        screeningResult.MatchType,
                        screeningResult.MatchedName,
                        screeningResult.ConfidenceScore,
                        Email = request.Email
                    }),
                    Timestamp = DateTime.UtcNow
                };
                await _auditLogService.WriteAsync(flagLog, cancellationToken);
            }

            var customer = new Customer
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                IdType = request.IdType,
                IdNumber = request.IdNumber,
                IdImageUri = request.IdImageUri,
                SelfieImageUri = request.SelfieImageUri,
                KycStatus = KycStatus.Pending
            };

            _dbContext.Customers.Add(customer);

            var domainEvent = new CustomerRegisteredEvent(
                customer.Id,
                customer.Email,
                _dbContext.CurrentTenantId
            );

            var eventType = typeof(CustomerRegisteredEvent);
            var outboxMessage = new OutboxMessage
            {
                Type = eventType.AssemblyQualifiedName ?? eventType.FullName ?? eventType.Name,
                Content = System.Text.Json.JsonSerializer.Serialize(domainEvent),
                OccurredOnUtc = DateTime.UtcNow
            };

            _dbContext.OutboxMessages.Add(outboxMessage);

            await _dbContext.SaveChangesAsync(cancellationToken);

            return customer.Id;
        }
    }
}

