using Microsoft.AspNetCore.Http;
using Corevix.Common;

namespace Corevix.Infrastructure
{
    public class TenantProvider : ITenantProvider
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private const string TenantHeaderName = "X-Tenant-Id";
        private const string DefaultTenantId = "system_default";

        public TenantProvider(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string GetTenantId()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext != null && httpContext.Request.Headers.TryGetValue(TenantHeaderName, out var tenantId))
            {
                return tenantId.ToString();
            }

            return DefaultTenantId;
        }
    }
}
