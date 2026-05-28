using System;
using MediatR;

namespace Corevix.Core
{
    public class AccountOpenedEvent : INotification
    {
        public Guid AccountId { get; }
        public Guid CustomerId { get; }
        public string AccountNumber { get; }
        public string TenantId { get; }

        public AccountOpenedEvent(Guid accountId, Guid customerId, string accountNumber, string tenantId)
        {
            AccountId = accountId;
            CustomerId = customerId;
            AccountNumber = accountNumber;
            TenantId = tenantId;
        }
    }
}
