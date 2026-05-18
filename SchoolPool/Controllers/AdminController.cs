using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPool.Data;
using SchoolPool.Models;
using SchoolPool.Controllers;

namespace SchoolPool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminController(AppDbContext db) => _db = db;

        // ── USERS ─────────────────────────────────────────────────

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _db.Users
                    .Select(u => new {
                        u.UserId,
                        u.FullName,
                        u.Email,
                        u.PhoneNumber,
                        u.Role,
                        u.IsActive,
                        u.Address,
                        u.CreatedAt
                    })
                    .ToListAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching users", error = ex.Message });
            }
        }

        [HttpPost("users")]
        public async Task<IActionResult> AddUser([FromBody] AddUserDto dto)
        {
            try
            {
                if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
                    return BadRequest(new { message = "Email already exists" });

                var user = new User
                {
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PhoneNumber = dto.PhoneNumber ?? "",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                    Role = dto.Role ?? "Parent",
                    Address = dto.Address,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _db.Users.Add(user);
                await _db.SaveChangesAsync();

                if (user.Role == "Parent")
                    _db.Parents.Add(new Parent { UserId = user.UserId });
                else if (user.Role == "Admin")
                    _db.Admins.Add(new Admin { UserId = user.UserId });

                await _db.SaveChangesAsync();

                // ✅ Notify new user
                await NotificationController.CreateNotification(
                    _db, user.UserId,
                    $"🎉 Welcome to SchoolPool, {user.FullName}! Your account has been created by admin.",
                    "Welcome"
                );

                return Ok(new { message = "User added successfully", userId = user.UserId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding user", error = ex.Message });
            }
        }

        [HttpPut("users/{id}/verify")]
        public async Task<IActionResult> VerifyUser(int id)
        {
            try
            {
                var user = await _db.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { message = "User not found" });
                user.IsActive = true;
                await _db.SaveChangesAsync();

                // ✅ Notify user they are verified
                await NotificationController.CreateNotification(
                    _db, user.UserId,
                    $"✅ Your account has been verified by admin! You can now access all features.",
                    "AccountVerified"
                );

                return Ok(new { message = "User verified" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error verifying user", error = ex.Message });
            }
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                var user = await _db.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { message = "User not found" });

                user.FullName = dto.FullName ?? user.FullName;
                user.Email = dto.Email ?? user.Email;
                user.PhoneNumber = dto.PhoneNumber ?? user.PhoneNumber;
                user.Address = dto.Address ?? user.Address;
                user.IsActive = dto.IsActive ?? user.IsActive;

                if (dto.Role != null && dto.Role != user.Role)
                {
                    string oldRole = user.Role;
                    user.Role = dto.Role;

                    if (oldRole == "Parent")
                    {
                        var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == id);
                        if (parent != null) _db.Parents.Remove(parent);
                    }
                    else if (oldRole == "Admin")
                    {
                        var admin = await _db.Admins.FirstOrDefaultAsync(a => a.UserId == id);
                        if (admin != null) _db.Admins.Remove(admin);
                    }

                    await _db.SaveChangesAsync();

                    if (dto.Role == "Parent")
                        _db.Parents.Add(new Parent { UserId = id });
                    else if (dto.Role == "Admin")
                        _db.Admins.Add(new Admin { UserId = id });
                }

                await _db.SaveChangesAsync();
                return Ok(new { message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating user", error = ex.Message });
            }
        }

        // ✅ Fixed DeleteUser
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _db.Users.FindAsync(id);
                if (user == null)
                    return NotFound(new { message = "User not found" });

                // Delete notifications
                var notifications = await _db.Notifications.Where(n => n.UserId == id).ToListAsync();
                _db.Notifications.RemoveRange(notifications);

                // Delete verifications
                var verifications = await _db.Verifications.Where(v => v.UserId == id).ToListAsync();
                _db.Verifications.RemoveRange(verifications);

                var parent = await _db.Parents
                    .Include(p => p.Children)
                    .Include(p => p.Vehicles)
                    .Include(p => p.GroupMembers)
                    .FirstOrDefaultAsync(p => p.UserId == id);

                if (parent != null)
                {
                    // Delete seat bookings
                    var seatBookings = await _db.SeatBookings.Where(sb => sb.ParentId == parent.ParentId).ToListAsync();
                    _db.SeatBookings.RemoveRange(seatBookings);

                    // Delete children attendances
                    foreach (var child in parent.Children)
                    {
                        var attendances = await _db.Attendances.Where(a => a.ChildId == child.ChildId).ToListAsync();
                        _db.Attendances.RemoveRange(attendances);
                    }

                    _db.Children.RemoveRange(parent.Children);
                    _db.Vehicles.RemoveRange(parent.Vehicles);
                    _db.GroupMembers.RemoveRange(parent.GroupMembers);
                    _db.Parents.Remove(parent);
                }

                var admin = await _db.Admins.FirstOrDefaultAsync(a => a.UserId == id);
                if (admin != null) _db.Admins.Remove(admin);

                _db.Users.Remove(user);
                await _db.SaveChangesAsync();
                return Ok(new { message = "User deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting user", error = ex.Message });
            }
        }

        // ── SCHOOLS ───────────────────────────────────────────────

        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools()
        {
            try { return Ok(await _db.Schools.ToListAsync()); }
            catch (Exception ex) { return StatusCode(500, new { message = "Error", error = ex.Message }); }
        }

        [HttpPost("schools")]
        public async Task<IActionResult> AddSchool([FromBody] School school)
        {
            try
            {
                _db.Schools.Add(school);
                await _db.SaveChangesAsync();
                return Ok(new { message = "School added", school });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Error", error = ex.Message }); }
        }

        [HttpPut("schools/{id}")]
        public async Task<IActionResult> UpdateSchool(int id, [FromBody] SchoolDto dto)
        {
            try
            {
                var school = await _db.Schools.FindAsync(id);
                if (school == null) return NotFound(new { message = "School not found" });
                school.SchoolName = dto.SchoolName ?? school.SchoolName;
                school.Address = dto.Address ?? school.Address;
                school.ContactNumber = dto.ContactNumber ?? school.ContactNumber;
                await _db.SaveChangesAsync();
                return Ok(new { message = "School updated" });
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Error", error = ex.Message }); }
        }


        // ✅ Fixed DeleteSchool
        [HttpDelete("schools/{id}")]
        public async Task<IActionResult> DeleteSchool(int id)
        {
            try
            {
                var school = await _db.Schools.FindAsync(id);
                if (school == null)
                    return NotFound(new { message = "School not found" });

                // Unlink children and groups
                var children = await _db.Children.Where(c => c.SchoolId == id).ToListAsync();
                children.ForEach(c => c.SchoolId = null);

                var groups = await _db.CarpoolGroups.Where(g => g.SchoolId == id).ToListAsync();
                groups.ForEach(g => g.SchoolId = null);

                await _db.SaveChangesAsync();

                _db.Schools.Remove(school);
                await _db.SaveChangesAsync();
                return Ok(new { message = "School deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting school", error = ex.Message });
            }
        }

        // ── GROUPS ────────────────────────────────────────────────

        [HttpGet("groups")]
        public async Task<IActionResult> GetAllGroups()
        {
            try
            {
                var groups = await _db.CarpoolGroups
                    .Include(g => g.School)
                    .Include(g => g.CreatedByParent)
                        .ThenInclude(p => p.User)
                    .Select(g => new
                    {
                        g.GroupId,
                        g.GroupName,
                        g.Locality,
                        g.MaxMembers,
                        g.Status,
                        g.CreatedAt,
                        createdByName = g.CreatedByParent.User.FullName,
                        createdByUserId = g.CreatedByParent.UserId,
                        memberCount = _db.GroupMembers.Count(m => m.GroupId == g.GroupId),
                        school = g.School == null ? null : new
                        {
                            g.School.SchoolId,
                            g.School.SchoolName
                        }
                    })
                    .ToListAsync();
                return Ok(groups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching groups", error = ex.Message });
            }
        }

        // ✅ Verify (Approve) a group
        [HttpPut("groups/{id}/verify")]
        public async Task<IActionResult> VerifyGroup(int id)
        {
            try
            {
                var group = await _db.CarpoolGroups
                    .Include(g => g.CreatedByParent)
                    .FirstOrDefaultAsync(g => g.GroupId == id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                group.Status = "Active";
                await _db.SaveChangesAsync();

                // ✅ Notify group creator
                await NotificationController.CreateNotification(
                    _db,
                    group.CreatedByParent.UserId,
                    $"✅ Your group '{group.GroupName}' has been verified and is now active! Others can now join.",
                    "GroupVerified"
                );

                return Ok(new { message = "Group verified and activated" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error verifying group", error = ex.Message });
            }
        }

        // ✅ Reject and delete a group
        [HttpPut("groups/{id}/reject")]
        public async Task<IActionResult> RejectGroup(int id)
        {
            try
            {
                var group = await _db.CarpoolGroups
                    .Include(g => g.CreatedByParent)
                    .FirstOrDefaultAsync(g => g.GroupId == id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                var creatorUserId = group.CreatedByParent.UserId;
                var groupName = group.GroupName;

                // Notify creator before deleting
                await NotificationController.CreateNotification(
                    _db,
                    creatorUserId,
                    $"❌ Your group '{groupName}' has been rejected by admin and has been removed.",
                    "GroupRejected"
                );

                _db.CarpoolGroups.Remove(group);
                await _db.SaveChangesAsync();

                return Ok(new { message = "Group rejected and deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting group", error = ex.Message });
            }
        }

        [HttpPut("groups/{id}")]
        public async Task<IActionResult> UpdateGroup(int id, [FromBody] AdminGroupDto dto)
        {
            try
            {
                var group = await _db.CarpoolGroups.FindAsync(id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (!string.IsNullOrEmpty(dto.GroupName)) group.GroupName = dto.GroupName;
                if (!string.IsNullOrEmpty(dto.Locality)) group.Locality = dto.Locality;
                if (dto.MaxMembers > 0) group.MaxMembers = dto.MaxMembers;
                if (!string.IsNullOrEmpty(dto.Status)) group.Status = dto.Status;

                await _db.SaveChangesAsync();
                return Ok(new { message = "Group updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating group", error = ex.Message });
            }
        }
        // ✅ Fixed DeleteGroup
        [HttpDelete("groups/{id}")]
        public async Task<IActionResult> DeleteGroup(int id)
        {
            try
            {
                var group = await _db.CarpoolGroups.FindAsync(id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                // Delete related records first
                var members = await _db.GroupMembers.Where(gm => gm.GroupId == id).ToListAsync();
                _db.GroupMembers.RemoveRange(members);

                var seatBookings = await _db.SeatBookings.Where(sb => sb.GroupId == id).ToListAsync();
                _db.SeatBookings.RemoveRange(seatBookings);

                var rides = await _db.Rides.Where(r => r.GroupId == id).ToListAsync();
                foreach (var ride in rides)
                {
                    var attendances = await _db.Attendances.Where(a => a.RideId == ride.RideId).ToListAsync();
                    _db.Attendances.RemoveRange(attendances);
                    var gpsLocations = await _db.GPSLocations.Where(g => g.RideId == ride.RideId).ToListAsync();
                    _db.GPSLocations.RemoveRange(gpsLocations);
                }
                _db.Rides.RemoveRange(rides);

                _db.CarpoolGroups.Remove(group);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Group deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting group", error = ex.Message });
            }
        }

        // ── RIDES ─────────────────────────────────────────────────

        [HttpGet("rides")]
        public async Task<IActionResult> GetAllRides()
        {
            try
            {
                var rides = await _db.Rides
                    .Include(r => r.CarpoolGroup)
                    .Include(r => r.DriverParent)
                        .ThenInclude(p => p!.User)
                    .OrderByDescending(r => r.RideDate)
                    .ToListAsync();

                var result = rides.Select(r => new
                {
                    r.RideId,
                    r.GroupId,
                    groupName = r.CarpoolGroup?.GroupName,
                    r.DriverParentId,
                    driverName = r.DriverParent?.User?.FullName ?? "Unknown",
                    r.RideDate,
                    pickupTime = r.PickupTime.HasValue ? r.PickupTime.Value.ToString(@"hh\:mm") : null,
                    dropTime = r.DropTime.HasValue ? r.DropTime.Value.ToString(@"hh\:mm") : null,
                    r.Status
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching rides", error = ex.Message });
            }
        }

        [HttpPut("rides/{id}/status")]
        public async Task<IActionResult> UpdateRideStatus(int id, [FromBody] UpdateRideStatusDto dto)
        {
            try
            {
                var ride = await _db.Rides
                    .Include(r => r.CarpoolGroup)
                    .FirstOrDefaultAsync(r => r.RideId == id);
                if (ride == null)
                    return NotFound(new { message = "Ride not found" });

                ride.Status = dto.Status;
                if (dto.Status == "Completed")
                    ride.DropTime = DateTime.UtcNow.TimeOfDay;

                await _db.SaveChangesAsync();

                // ✅ Notify group members about status change
                var memberUserIds = await _db.GroupMembers
                    .Where(gm => gm.GroupId == ride.GroupId)
                    .Include(gm => gm.Parent)
                    .Select(gm => gm.Parent.UserId)
                    .ToListAsync();

                foreach (var uid in memberUserIds)
                {
                    await NotificationController.CreateNotification(
                        _db, uid,
                        $"🚌 Ride #{ride.RideId} status updated to '{dto.Status}' by admin",
                        "RideStatusUpdate"
                    );
                }

                return Ok(new { message = $"Ride status updated to {dto.Status}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating ride status", error = ex.Message });
            }
        }

        // ✅ Fixed DeleteRide
        [HttpDelete("rides/{id}")]
        public async Task<IActionResult> DeleteRide(int id)
        {
            try
            {
                var ride = await _db.Rides.FindAsync(id);
                if (ride == null)
                    return NotFound(new { message = "Ride not found" });

                var attendances = await _db.Attendances.Where(a => a.RideId == id).ToListAsync();
                _db.Attendances.RemoveRange(attendances);

                var gpsLocations = await _db.GPSLocations.Where(g => g.RideId == id).ToListAsync();
                _db.GPSLocations.RemoveRange(gpsLocations);

                _db.Rides.Remove(ride);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Ride deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting ride", error = ex.Message });
            }
        }

        // ── VERIFICATIONS ─────────────────────────────────────────

        [HttpGet("verifications")]
        public async Task<IActionResult> GetVerifications()
        {
            try
            {
                var docs = await _db.Verifications
                    .Include(v => v.User)
                    .Select(v => new
                    {
                        v.VerificationId,
                        v.DocumentType,
                        v.DocumentUrl,
                        v.Status,
                        v.UploadedAt,
                        v.VerifiedAt,
                        user = new { v.User.UserId, v.User.FullName, v.User.Email }
                    })
                    .ToListAsync();
                return Ok(docs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching verifications", error = ex.Message });
            }
        }

        [HttpPut("verifications/{id}/approve")]
        public async Task<IActionResult> ApproveDocument(int id)
        {
            try
            {
                var doc = await _db.Verifications
                    .Include(v => v.User)
                    .FirstOrDefaultAsync(v => v.VerificationId == id);
                if (doc == null)
                    return NotFound(new { message = "Document not found" });

                doc.Status = "Approved";
                doc.VerifiedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // ✅ Notify user
                await NotificationController.CreateNotification(
                    _db, doc.UserId,
                    $"✅ Your document '{doc.DocumentType}' has been approved by admin!",
                    "DocumentApproved"
                );

                return Ok(new { message = "Document approved" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error approving document", error = ex.Message });
            }
        }

        [HttpPut("verifications/{id}/reject")]
        public async Task<IActionResult> RejectDocument(int id)
        {
            try
            {
                var doc = await _db.Verifications
                    .Include(v => v.User)
                    .FirstOrDefaultAsync(v => v.VerificationId == id);
                if (doc == null)
                    return NotFound(new { message = "Document not found" });

                doc.Status = "Rejected";
                doc.VerifiedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();

                // ✅ Notify user
                await NotificationController.CreateNotification(
                    _db, doc.UserId,
                    $"❌ Your document '{doc.DocumentType}' has been rejected by admin. Please re-upload.",
                    "DocumentRejected"
                );

                return Ok(new { message = "Document rejected" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting document", error = ex.Message });
            }
        }

        // ── NOTIFICATIONS ─────────────────────────────────────────────────

        // POST: api/admin/notifications/send
        [HttpPost("notifications/send")]
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

        // POST: api/admin/notifications/send-role
        [HttpPost("notifications/send-role")]
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
    public class AddUserDto
    {
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? Role { get; set; } = "Parent";
    }

    public class UpdateUserDto
    {
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
    }

    public class SchoolDto
    {
        public string? SchoolName { get; set; }
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }
    }

    public class AdminGroupDto
    {
        public string? GroupName { get; set; }
        public string? Locality { get; set; }
        public int MaxMembers { get; set; }
        public string? Status { get; set; }
    }

    public class UpdateRideStatusDto
    {
        public string Status { get; set; } = "";
    }
}