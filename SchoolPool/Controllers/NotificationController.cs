using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPool.Data;
using SchoolPool.Models;
using System.Security.Claims;

namespace SchoolPool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly AppDbContext _db;
        public NotificationController(AppDbContext db) => _db = db;

        // ── Static helper used by other controllers ───────────────
        public static async Task CreateNotification(
            AppDbContext db, int userId, string message, string type)
        {
            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Message = message,
                Type = type,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            });
            await db.SaveChangesAsync();
        }

        // GET: api/notification
        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var notifications = await _db.Notifications
                    .Where(n => n.UserId == userId)
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new
                    {
                        n.NotificationId,
                        n.UserId,
                        n.Message,
                        n.Type,
                        n.CreatedAt,
                        n.IsRead
                    })
                    .ToListAsync();
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching notifications", error = ex.Message });
            }
        }

        // PUT: api/notification/read-all
        // ✅ MUST be before {id}/read to avoid route conflict
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var notifications = await _db.Notifications
                    .Where(n => n.UserId == userId && !n.IsRead)
                    .ToListAsync();

                notifications.ForEach(n => n.IsRead = true);
                await _db.SaveChangesAsync();
                return Ok(new { message = $"Marked {notifications.Count} notifications as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error", error = ex.Message });
            }
        }

        // PUT: api/notification/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var notification = await _db.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationId == id && n.UserId == userId);

                if (notification == null)
                    return NotFound(new { message = "Notification not found" });

                notification.IsRead = true;
                await _db.SaveChangesAsync();
                return Ok(new { message = "Marked as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error marking notification", error = ex.Message });
            }
        }

        // POST: api/notification/send
        // ✅ Explicit route + Admin only
        [HttpPost("send")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Message))
                    return BadRequest(new { message = "Message cannot be empty" });

                if (dto.SendToAll)
                {
                    var allUsers = await _db.Users.Select(u => u.UserId).ToListAsync();
                    foreach (var uid in allUsers)
                    {
                        _db.Notifications.Add(new Notification
                        {
                            UserId = uid,
                            Message = dto.Message,
                            Type = dto.Type ?? "Admin",
                            CreatedAt = DateTime.UtcNow,
                            IsRead = false
                        });
                    }
                    await _db.SaveChangesAsync();
                    return Ok(new { message = $"Notification sent to {allUsers.Count} users" });
                }
                else if (dto.UserId.HasValue)
                {
                    var user = await _db.Users.FindAsync(dto.UserId.Value);
                    if (user == null)
                        return NotFound(new { message = "User not found" });

                    _db.Notifications.Add(new Notification
                    {
                        UserId = dto.UserId.Value,
                        Message = dto.Message,
                        Type = dto.Type ?? "Admin",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    });
                    await _db.SaveChangesAsync();
                    return Ok(new { message = "Notification sent successfully" });
                }
                else
                {
                    return BadRequest(new { message = "Specify UserId or set SendToAll = true" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error sending notification", error = ex.Message });
            }
        }

        // POST: api/notification/send-role
        // ✅ Explicit route + Admin only
        [HttpPost("send-role")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendToRole([FromBody] SendToRoleDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.Message))
                    return BadRequest(new { message = "Message cannot be empty" });

                var users = await _db.Users
                    .Where(u => u.Role == dto.Role)
                    .Select(u => u.UserId)
                    .ToListAsync();

                if (!users.Any())
                    return NotFound(new { message = $"No users found with role {dto.Role}" });

                foreach (var uid in users)
                {
                    _db.Notifications.Add(new Notification
                    {
                        UserId = uid,
                        Message = dto.Message,
                        Type = dto.Type ?? "Admin",
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    });
                }
                await _db.SaveChangesAsync();
                return Ok(new { message = $"Notification sent to {users.Count} {dto.Role}s" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error sending notification", error = ex.Message });
            }
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────
    public class SendNotificationDto
    {
        public int? UserId { get; set; }
        public bool SendToAll { get; set; } = false;
        public string Message { get; set; } = "";
        public string? Type { get; set; }
    }

    public class SendToRoleDto
    {
        public string Role { get; set; } = "Parent";
        public string Message { get; set; } = "";
        public string? Type { get; set; }
    }
}