// ─────────────────────────────────────────────────────────
//  FILE:  Controllers/EmergencyAlertController.cs
// ─────────────────────────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SchoolPool.Data;
using SchoolPool.Hubs;
using SchoolPool.Models;
using System.Security.Claims;

namespace SchoolPool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmergencyAlertController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<TrackingHub> _hub;

        public EmergencyAlertController(AppDbContext db, IHubContext<TrackingHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ── POST api/emergencyalert/trigger ───────────────────────────────────
        // Any parent in the ride can trigger an emergency alert.
        // Also broadcasts via SignalR so all parents on that ride see it instantly.
        [HttpPost("trigger")]
        public async Task<IActionResult> TriggerAlert([FromBody] TriggerAlertDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
            if (parent == null)
                return BadRequest(new { message = "Only parents can trigger alerts." });

            // Verify ride exists
            var ride = await _db.Rides.FindAsync(dto.RideId);
            if (ride == null)
                return NotFound(new { message = "Ride not found." });

            var alert = new EmergencyAlert
            {
                RideId = dto.RideId,
                TriggeredByParentId = parent.ParentId,
                Location = dto.Location,
                AlertTime = DateTime.UtcNow,
                Status = "Active",
            };

            _db.EmergencyAlerts.Add(alert);
            await _db.SaveChangesAsync();

            // Broadcast to every subscriber watching this ride
            await _hub.Clients
                .Group($"ride-{dto.RideId}")
                .SendAsync("EmergencyAlert", new
                {
                    alert.AlertId,
                    alert.RideId,
                    alert.Location,
                    alert.AlertTime,
                    TriggeredBy = parent.ParentId,
                });

            return Ok(new { message = "Emergency alert triggered.", alertId = alert.AlertId });
        }

        // ── PUT api/emergencyalert/{id}/resolve ───────────────────────────────
        // Admin or the triggering parent can resolve the alert.
        [HttpPut("{id}/resolve")]
        public async Task<IActionResult> ResolveAlert(int id)
        {
            var alert = await _db.EmergencyAlerts.FindAsync(id);
            if (alert == null)
                return NotFound(new { message = "Alert not found." });

            alert.Status = "Resolved";
            await _db.SaveChangesAsync();

            // Notify ride group that alert is resolved
            await _hub.Clients
                .Group($"ride-{alert.RideId}")
                .SendAsync("AlertResolved", new { alert.AlertId, alert.RideId });

            return Ok(new { message = "Alert resolved." });
        }

        // ── GET api/emergencyalert/ride/{rideId} ──────────────────────────────
        // All alerts (active + resolved) for a specific ride.
        [HttpGet("ride/{rideId}")]
        public async Task<IActionResult> GetByRide(int rideId)
        {
            var alerts = await _db.EmergencyAlerts
                .Where(a => a.RideId == rideId)
                .OrderByDescending(a => a.AlertTime)
                .Select(a => new
                {
                    a.AlertId,
                    a.RideId,
                    a.TriggeredByParentId,
                    a.Location,
                    a.AlertTime,
                    a.Status,
                })
                .ToListAsync();

            return Ok(alerts);
        }

        // ── GET api/emergencyalert/active ─────────────────────────────────────
        // Admin dashboard: all currently active alerts across all rides.
        [HttpGet("active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllActive()
        {
            var alerts = await _db.EmergencyAlerts
                .Where(a => a.Status == "Active")
                .Include(a => a.Ride)
                .Include(a => a.TriggeredByParent)
                .OrderByDescending(a => a.AlertTime)
                .Select(a => new
                {
                    a.AlertId,
                    a.RideId,
                    a.Location,
                    a.AlertTime,
                    a.Status,
                    TriggeredByParentId = a.TriggeredByParentId,
                })
                .ToListAsync();

            return Ok(alerts);
        }
    }

    // ── DTO ───────────────────────────────────────────────────────────────────
    public class TriggerAlertDto
    {
        public int RideId { get; set; }
        public string? Location { get; set; }  // e.g. "Pune-Bangalore highway, km 42"
    }
}
