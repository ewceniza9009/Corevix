using System;

namespace Corevix.Common
{
    public interface ITenantProvider
    {
        string GetTenantId();
    }
}
