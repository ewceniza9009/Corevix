using System;
using MediatR;

namespace Corevix.Core
{
    public class BillPaymentExecutedEvent : INotification
    {
        public Guid TransactionId { get; }
        public Guid SourceAccountId { get; }
        public string BillerCode { get; }
        public string ReferenceNumber { get; }
        public decimal Amount { get; }
        public string TenantId { get; }

        public BillPaymentExecutedEvent(Guid transactionId, Guid sourceAccountId, string billerCode, string referenceNumber, decimal amount, string tenantId)
        {
            TransactionId = transactionId;
            SourceAccountId = sourceAccountId;
            BillerCode = billerCode;
            ReferenceNumber = referenceNumber;
            Amount = amount;
            TenantId = tenantId;
        }
    }
}
