using System;
using MediatR;

namespace Corevix.Core
{
    public class TransferExecutedEvent : INotification
    {
        public Guid TransactionId { get; }
        public Guid SourceAccountId { get; }
        public Guid? DestinationAccountId { get; }
        public decimal Amount { get; }
        public string ReferenceNumber { get; }
        public string TenantId { get; }

        public TransferExecutedEvent(Guid transactionId, Guid sourceAccountId, Guid? destinationAccountId, decimal amount, string referenceNumber, string tenantId)
        {
            TransactionId = transactionId;
            SourceAccountId = sourceAccountId;
            DestinationAccountId = destinationAccountId;
            Amount = amount;
            ReferenceNumber = referenceNumber;
            TenantId = tenantId;
        }
    }
}
