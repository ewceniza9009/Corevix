using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Corevix.Core;

namespace Corevix.Persistence
{
    public class OutboxProcessor
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IPublisher _publisher;
        private readonly ILogger<OutboxProcessor> _logger;

        public OutboxProcessor(
            ApplicationDbContext dbContext,
            IPublisher publisher,
            ILogger<OutboxProcessor> logger)
        {
            _dbContext = dbContext;
            _publisher = publisher;
            _logger = logger;
        }

        public async Task ProcessPendingMessagesAsync()
        {
            var messages = await _dbContext.OutboxMessages
                .Where(m => m.ProcessedOnUtc == null)
                .OrderBy(m => m.OccurredOnUtc)
                .Take(20)
                .ToListAsync();

            if (messages.Count == 0) return;

            foreach (var message in messages)
            {
                try
                {
                    var eventType = Type.GetType(message.Type);
                    if (eventType == null)
                    {
                        throw new InvalidOperationException($"Event type '{message.Type}' could not be resolved.");
                    }

                    var domainEvent = JsonSerializer.Deserialize(message.Content, eventType);
                    if (domainEvent == null)
                    {
                        throw new InvalidOperationException($"Could not deserialize event payload of type '{message.Type}'.");
                    }

                    await _publisher.Publish(domainEvent);

                    message.ProcessedOnUtc = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process outbox message {MessageId}", message.Id);
                    message.Error = ex.ToString();
                    message.ProcessedOnUtc = DateTime.UtcNow;
                }
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
