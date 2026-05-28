using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using MediatR;

namespace Corevix.Application
{
    public record ProcessQrPaymentCommand(
        Guid SourceAccountId,
        string QrCodeString,
        decimal Amount,
        string Description,
        string IdempotencyKey) : IRequest<Guid>, IIdempotentCommand;

    public class ProcessQrPaymentCommandValidator : AbstractValidator<ProcessQrPaymentCommand>
    {
        public ProcessQrPaymentCommandValidator()
        {
            RuleFor(x => x.SourceAccountId).NotEmpty();
            RuleFor(x => x.QrCodeString).NotEmpty().Must(x => x.StartsWith("qr://corevix/account/"));
            RuleFor(x => x.Amount).GreaterThan(0);
            RuleFor(x => x.IdempotencyKey).NotEmpty();
        }
    }

    public class ProcessQrPaymentCommandHandler : IRequestHandler<ProcessQrPaymentCommand, Guid>
    {
        private readonly IMediator _mediator;
        private readonly IApplicationDbContext _dbContext;

        public ProcessQrPaymentCommandHandler(IMediator mediator, IApplicationDbContext dbContext)
        {
            _mediator = mediator;
            _dbContext = dbContext;
        }

        public async Task<Guid> Handle(ProcessQrPaymentCommand request, CancellationToken cancellationToken)
        {
            // Format: qr://corevix/account/{AccountNumber}?tenant={TenantId}&name={AccountName}
            var uri = new Uri(request.QrCodeString);
            
            // Extract account number from host/path
            // e.g. uri.AbsolutePath is /account/1234567890
            var pathSegments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (pathSegments.Length < 2 || pathSegments[0] != "account")
            {
                throw new ArgumentException("Invalid QR code format.");
            }

            var destinationAccountNumber = pathSegments[1];

            // Parse query parameters manually to avoid external dependencies
            string? qrTenantId = null;
            var query = uri.Query;
            if (!string.IsNullOrEmpty(query))
            {
                var pairs = query.TrimStart('?').Split('&');
                foreach (var pair in pairs)
                {
                    var parts = pair.Split('=');
                    if (parts.Length == 2 && parts[0].Equals("tenant", StringComparison.OrdinalIgnoreCase))
                    {
                        qrTenantId = Uri.UnescapeDataString(parts[1]);
                        break;
                    }
                }
            }

            if (!string.IsNullOrEmpty(qrTenantId))
            {
                var currentTenantId = _dbContext.CurrentTenantId;
                if (qrTenantId != currentTenantId)
                {
                    throw new InvalidOperationException("Cross-tenant transfers via QR are not allowed.");
                }
            }
            else
            {
                throw new ArgumentException("Tenant parameter missing in QR code.");
            }

            // Send TransferCommand
            var transferCommand = new TransferCommand(
                request.SourceAccountId,
                destinationAccountNumber,
                request.Amount,
                request.Description,
                IsExternal: false,
                ExternalBankName: null,
                request.IdempotencyKey
            );

            return await _mediator.Send(transferCommand, cancellationToken);
        }
    }
}
