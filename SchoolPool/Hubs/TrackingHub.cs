// ─────────────────────────────────────────────────────────
//  FILE:  Hubs/TrackingHub.cs
//  Create a new folder called "Hubs" in your SchoolPool
//  project root and place this file inside it.
// ─────────────────────────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SchoolPool.Hubs
{
    [Authorize]   // only JWT-authenticated users can connect
    public class TrackingHub : Hub
    {
        // Driver OR parent joins a ride-specific broadcast group
        // React call:  await conn.invoke("JoinRide", rideId.toString());
        public async Task JoinRide(string rideId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"ride-{rideId}");
        }

        // Call when parent leaves the tracking page
        public async Task LeaveRide(string rideId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"ride-{rideId}");
        }
    }
}
