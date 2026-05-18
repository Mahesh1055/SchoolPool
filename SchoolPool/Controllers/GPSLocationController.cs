// ─────────────────────────────────────────────────────────
//  FILE:  Controllers/GPSLocationController.cs
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
    public class GPSLocationController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<TrackingHub> _hub;

        public GPSLocationController(AppDbContext db, IHubContext<TrackingHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ── POST api/gpslocation ──────────────────────────────────────────────
        // Driver sends current position every 5 s (triggered by frontend timer).
        [HttpPost]
        public async Task<IActionResult> PostLocation([FromBody] GPSLocationDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var location = new GPSLocation
            {
                RideId = dto.RideId,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Speed = (double?)dto.Speed,
                Accuracy = (double?)dto.Accuracy,
                RecordedAt = DateTime.UtcNow,
            };

            _db.GPSLocations.Add(location);
            await _db.SaveChangesAsync();

            // Broadcast to all parents subscribed to this ride group
            await _hub.Clients
                .Group($"ride-{dto.RideId}")
                .SendAsync("LocationUpdate", new
                {
                    location.RideId,
                    location.Latitude,
                    location.Longitude,
                    location.Speed,
                    location.RecordedAt,
                });

            return Ok(new { message = "Location saved and broadcasted." });
        }

        // ── GET api/gpslocation/ride/{rideId}/latest ─────────────────────────
        // Parent fetches the last known position on page load (before SignalR kicks in).
        [HttpGet("ride/{rideId}/latest")]
        public async Task<IActionResult> GetLatest(int rideId)
        {
            var loc = await _db.GPSLocations
                .Where(g => g.RideId == rideId)
                .OrderByDescending(g => g.RecordedAt)
                .FirstOrDefaultAsync();

            if (loc == null)
                return NotFound(new { message = "No location data for this ride yet." });

            return Ok(loc);
        }

        // ── GET api/gpslocation/ride/{rideId}/history ────────────────────────
        // Returns full ordered path — used to draw the route polyline.
        [HttpGet("ride/{rideId}/history")]
        public async Task<IActionResult> GetHistory(int rideId)
        {
            var locs = await _db.GPSLocations
                .Where(g => g.RideId == rideId)
                .OrderBy(g => g.RecordedAt)
                .Select(g => new
                {
                    g.Latitude,
                    g.Longitude,
                    g.Speed,
                    g.RecordedAt,
                })
                .ToListAsync();

            return Ok(locs);
        }
    }

    // ── DTO ──────────────────────────────────────────────────────────────────
    public class GPSLocationDto
    {
        public int RideId { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double? Speed { get; set; }    // ← was float?
        public double? Accuracy { get; set; }    // ← was float?
    }
}
