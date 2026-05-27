using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Corevix.Api.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task SendNotification(string userId, string message)
        {
            await Clients.User(userId).SendAsync("ReceiveNotification", message);
        }

        public async Task JoinTenantGroup(string tenantId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant_{tenantId}");
        }
    }
}
