using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace Corevix.Application
{
    public class IdempotencyBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        private readonly ICacheService _cacheService;

        public IdempotencyBehavior(ICacheService cacheService)
        {
            _cacheService = cacheService;
        }

        public async Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            if (request is not IIdempotentCommand idempotentCommand)
            {
                return await next();
            }

            var idempotencyKey = idempotentCommand.IdempotencyKey;
            if (string.IsNullOrWhiteSpace(idempotencyKey))
            {
                return await next();
            }

            var cacheKey = $"idempotency:{idempotencyKey}";
            var cachedResponse = await _cacheService.GetAsync<TResponse>(cacheKey);

            if (cachedResponse != null)
            {
                return cachedResponse;
            }

            var response = await next();

            // Cache response for 24 hours to prevent duplicate requests
            await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromHours(24));

            return response;
        }
    }
}
