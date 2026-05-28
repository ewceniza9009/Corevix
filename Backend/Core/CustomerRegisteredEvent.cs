using System;
using MediatR;

namespace Corevix.Core
{
    public class CustomerRegisteredEvent : INotification
    {
        public Guid CustomerId { get; }
        public string Email { get; }
        public string TenantId { get; }

        public CustomerRegisteredEvent(Guid customerId, string email, string tenantId)
        {
            CustomerId = customerId;
            Email = email;
            TenantId = tenantId;
        }
    }
}
