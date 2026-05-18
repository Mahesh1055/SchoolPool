using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPool.Data;
using SchoolPool.Models;
using SchoolPool.Controllers;
using System.Security.Claims;

namespace SchoolPool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RideController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RideController(AppDbContext db) => _db = db;

        // POST: api/ride/start
        // ✅ Driver starts an already approved/scheduled ride OR starts instantly
        [HttpPost("start")]
        public async Task<IActionResult> StartRide([FromBody] StartRideDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var group = await _db.CarpoolGroups
                    .Include(g => g.GroupMembers)
                    .FirstOrDefaultAsync(g => g.GroupId == dto.GroupId);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (group.Status != "Active")
                    return BadRequest(new { message = "Group is not verified/active yet. Please wait for admin approval." });

                var isMember = group.GroupMembers.Any(m => m.ParentId == parent.ParentId);
                if (!isMember)
                    return BadRequest(new { message = "You are not a member of this group" });

                // ✅ Check vehicle is approved BEFORE creating ride
                if (dto.VehicleId.HasValue)
                {
                    var vehicle = await _db.Vehicles.FindAsync(dto.VehicleId.Value);
                    if (vehicle == null)
                        return NotFound(new { message = "Vehicle not found" });
                    if (vehicle.VerificationStatus != "Approved")
                        return BadRequest(new { message = $"Vehicle '{vehicle.VehicleNumber}' is not verified by admin yet. Please wait for approval." });
                }

                // ✅ If there's an existing scheduled+approved ride for this group today, start that instead
                var existingRide = await _db.Rides
                    .Where(r => r.GroupId == dto.GroupId
                        && r.Status == "Scheduled"
                        && r.DriverParentId == parent.ParentId)
                    .OrderByDescending(r => r.RideDate)
                    .FirstOrDefaultAsync();

                Ride ride;
                if (existingRide != null)
                {
                    // Start existing scheduled ride
                    existingRide.Status = "Started";
                    existingRide.PickupTime = DateTime.UtcNow.TimeOfDay;
                    if (dto.VehicleId.HasValue) existingRide.VehicleId = dto.VehicleId;
                    ride = existingRide;
                }
                else
                {
                    // ✅ New instant ride needs admin approval
                    ride = new Ride
                    {
                        GroupId = dto.GroupId,
                        CarpoolGroupGroupId = dto.GroupId,
                        VehicleId = dto.VehicleId,
                        DriverParentId = parent.ParentId,
                        RideDate = DateTime.UtcNow,
                        PickupTime = DateTime.UtcNow.TimeOfDay,
                        Status = "PendingApproval"
                    };
                    _db.Rides.Add(ride);
                }

                await _db.SaveChangesAsync();

                if (ride.Status == "PendingApproval")
                {
                    // Notify admins for approval
                    var driverName = await _db.Users
                        .Where(u => u.UserId == userId)
                        .Select(u => u.FullName)
                        .FirstOrDefaultAsync();

                    var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                    foreach (var adminId in adminUserIds)
                    {
                        await NotificationController.CreateNotification(
                            _db, adminId,
                            $"🚌 Ride start request from {driverName} in group '{group.GroupName}'. Please approve.",
                            "RidePendingApproval"
                        );
                    }

                    return Ok(new
                    {
                        message = "Ride start request sent to admin for approval. You will be notified once approved.",
                        rideId = ride.RideId,
                        status = ride.Status
                    });
                }

                // Ride started — create attendance for booked children
                await CreateAttendanceForRide(ride.RideId, dto.GroupId);

                // Notify members
                await NotifyRideStarted(ride, group, userId);

                return Ok(new
                {
                    message = "Ride started successfully!",
                    rideId = ride.RideId,
                    groupId = ride.GroupId,
                    status = ride.Status
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error starting ride", error = ex.Message });
            }
        }

        // POST: api/ride/schedule
        [HttpPost("schedule")]
        public async Task<IActionResult> ScheduleRide([FromBody] ScheduleRideDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var group = await _db.CarpoolGroups
                    .Include(g => g.GroupMembers)
                    .FirstOrDefaultAsync(g => g.GroupId == dto.GroupId);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (group.Status != "Active")
                    return BadRequest(new { message = "Group is not verified/active yet." });

                var isMember = group.GroupMembers.Any(m => m.ParentId == parent.ParentId);
                if (!isMember)
                    return BadRequest(new { message = "You are not a member of this group" });

                // ✅ Check vehicle if provided
                if (dto.VehicleId.HasValue)
                {
                    var vehicle = await _db.Vehicles.FindAsync(dto.VehicleId.Value);
                    if (vehicle == null)
                        return NotFound(new { message = "Vehicle not found" });
                    if (vehicle.VerificationStatus != "Approved")
                        return BadRequest(new { message = $"Vehicle '{vehicle.VehicleNumber}' is not verified by admin yet." });
                }

                TimeSpan pickupTimeSpan = TimeSpan.Zero;
                if (!string.IsNullOrEmpty(dto.PickupTimeString))
                {
                    if (!TimeSpan.TryParse(dto.PickupTimeString, out pickupTimeSpan))
                        return BadRequest(new { message = "Invalid pickup time format. Use HH:mm" });
                }

                if (!DateTime.TryParse(dto.RideDateString, out DateTime rideDate))
                    return BadRequest(new { message = "Invalid ride date format." });

                var ride = new Ride
                {
                    GroupId = dto.GroupId,
                    CarpoolGroupGroupId = dto.GroupId,
                    VehicleId = dto.VehicleId,
                    DriverParentId = parent.ParentId,
                    RideDate = rideDate,
                    PickupTime = pickupTimeSpan,
                    Status = "PendingApproval"
                };

                _db.Rides.Add(ride);
                await _db.SaveChangesAsync();

                var schedulerName = await _db.Users
                    .Where(u => u.UserId == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                // Notify admins
                var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                foreach (var adminId in adminUserIds)
                {
                    await NotificationController.CreateNotification(
                        _db, adminId,
                        $"📅 Ride scheduled for {rideDate:dd MMM yyyy} at {pickupTimeSpan:hh\\:mm} in group '{group.GroupName}' by {schedulerName} — needs your approval.",
                        "RidePendingApproval"
                    );
                }

                // Notify parent
                await NotificationController.CreateNotification(
                    _db, userId,
                    $"📅 Your ride scheduled for {rideDate:dd MMM yyyy} at {pickupTimeSpan:hh\\:mm} is pending admin approval.",
                    "RideScheduled"
                );

                return Ok(new
                {
                    message = "Ride scheduled and pending admin approval.",
                    rideId = ride.RideId,
                    rideDate = ride.RideDate,
                    pickupTime = ride.PickupTime.HasValue ? ride.PickupTime.Value.ToString(@"hh\:mm") : null,
                    status = ride.Status
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error scheduling ride", error = ex.Message });
            }
        }

        // PUT: api/ride/admin/{id}/approve
        [HttpPut("admin/{id}/approve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveRide(int id)
        {
            try
            {
                var ride = await _db.Rides
                    .Include(r => r.CarpoolGroup)
                    .Include(r => r.DriverParent)
                    .FirstOrDefaultAsync(r => r.RideId == id);

                if (ride == null)
                    return NotFound(new { message = "Ride not found" });

                ride.Status = "Scheduled";
                await _db.SaveChangesAsync();

                // Notify driver
                if (ride.DriverParent != null)
                {
                    await NotificationController.CreateNotification(
                        _db, ride.DriverParent.UserId,
                        $"✅ Your ride #{ride.RideId} in group '{ride.CarpoolGroup?.GroupName}' has been approved! You can now start the ride.",
                        "RideApproved"
                    );
                }

                // Notify group members
                var memberUserIds = await _db.GroupMembers
                    .Where(gm => gm.GroupId == ride.GroupId)
                    .Include(gm => gm.Parent)
                    .Select(gm => gm.Parent.UserId)
                    .ToListAsync();

                foreach (var uid in memberUserIds)
                {
                    if (ride.DriverParent != null && uid != ride.DriverParent.UserId)
                    {
                        await NotificationController.CreateNotification(
                            _db, uid,
                            $"✅ Ride #{ride.RideId} in group '{ride.CarpoolGroup?.GroupName}' has been approved and is now scheduled!",
                            "RideApproved"
                        );
                    }
                }

                return Ok(new { message = "Ride approved and scheduled" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error approving ride", error = ex.Message });
            }
        }

        // PUT: api/ride/admin/{id}/reject
        [HttpPut("admin/{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectRide(int id, [FromBody] RejectRideDto dto)
        {
            try
            {
                var ride = await _db.Rides
                    .Include(r => r.CarpoolGroup)
                    .Include(r => r.DriverParent)
                        .ThenInclude(p => p!.User)
                    .FirstOrDefaultAsync(r => r.RideId == id);

                if (ride == null)
                    return NotFound(new { message = "Ride not found" });

                ride.Status = "Cancelled";
                ride.RejectionReason = dto.Reason;
                await _db.SaveChangesAsync();

                if (ride.DriverParent != null)
                {
                    await NotificationController.CreateNotification(
                        _db, ride.DriverParent.UserId,
                        $"❌ Your ride #{ride.RideId} in group '{ride.CarpoolGroup?.GroupName}' was rejected. Reason: {dto.Reason ?? "No reason provided"}",
                        "RideRejected"
                    );
                }

                return Ok(new { message = "Ride rejected" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting ride", error = ex.Message });
            }
        }

        // PUT: api/ride/{id}/complete
        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteRide(int id)
        {
            try
            {
                var ride = await _db.Rides
                    .Include(r => r.CarpoolGroup)
                    .FirstOrDefaultAsync(r => r.RideId == id);
                if (ride == null)
                    return NotFound(new { message = "Ride not found" });

                ride.Status = "Completed";
                ride.DropTime = DateTime.UtcNow.TimeOfDay;
                await _db.SaveChangesAsync();

                var memberUserIds = await _db.GroupMembers
                    .Where(gm => gm.GroupId == ride.GroupId)
                    .Include(gm => gm.Parent)
                    .Select(gm => gm.Parent.UserId)
                    .ToListAsync();

                foreach (var uid in memberUserIds)
                {
                    await NotificationController.CreateNotification(
                        _db, uid,
                        $"✅ Ride #{ride.RideId} in group '{ride.CarpoolGroup?.GroupName}' has been completed!",
                        "RideCompleted"
                    );
                }

                var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                foreach (var adminId in adminUserIds)
                {
                    await NotificationController.CreateNotification(
                        _db, adminId,
                        $"✅ Ride #{ride.RideId} completed in group '{ride.CarpoolGroup?.GroupName}'",
                        "RideCompleted"
                    );
                }

                return Ok(new { message = "Ride completed", rideId = ride.RideId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error completing ride", error = ex.Message });
            }
        }

        // POST: api/ride/book-seat
        // ✅ Passenger books seat for their child in a group
        [HttpPost("book-seat")]
        public async Task<IActionResult> BookSeat([FromBody] BookSeatDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                // Check parent is member of this group
                var isMember = await _db.GroupMembers
                    .AnyAsync(gm => gm.GroupId == dto.GroupId && gm.ParentId == parent.ParentId);
                if (!isMember)
                    return BadRequest(new { message = "You are not a member of this group" });

                // Check child belongs to this parent
                var child = await _db.Children
                    .FirstOrDefaultAsync(c => c.ChildId == dto.ChildId && c.ParentId == parent.ParentId);
                if (child == null)
                    return NotFound(new { message = "Child not found" });

                // ✅ Child must be verified
                if (child.VerificationStatus != "Approved")
                    return BadRequest(new { message = $"Child '{child.Name}' is not yet verified by admin." });

                // Check not already booked
                var alreadyBooked = await _db.SeatBookings
                    .AnyAsync(sb => sb.GroupId == dto.GroupId
                        && sb.ChildId == dto.ChildId
                        && sb.Status == "Booked");
                if (alreadyBooked)
                    return BadRequest(new { message = $"Seat already booked for {child.Name} in this group." });

                var booking = new SeatBooking
                {
                    GroupId = dto.GroupId,
                    ParentId = parent.ParentId,
                    ChildId = dto.ChildId,
                    Status = "Booked",
                    BookedAt = DateTime.UtcNow
                };

                _db.SeatBookings.Add(booking);

                // Update child count in GroupMember
                var member = await _db.GroupMembers
                    .FirstOrDefaultAsync(gm => gm.GroupId == dto.GroupId && gm.ParentId == parent.ParentId);
                if (member != null)
                    member.ChildCount = await _db.SeatBookings
                        .CountAsync(sb => sb.GroupId == dto.GroupId
                            && sb.ParentId == parent.ParentId
                            && sb.Status == "Booked") + 1;

                await _db.SaveChangesAsync();

                // Notify group creator / driver
                var group = await _db.CarpoolGroups
                    .Include(g => g.CreatedByParent)
                    .FirstOrDefaultAsync(g => g.GroupId == dto.GroupId);

                if (group != null)
                {
                    var parentName = await _db.Users
                        .Where(u => u.UserId == userId)
                        .Select(u => u.FullName)
                        .FirstOrDefaultAsync();

                    await NotificationController.CreateNotification(
                        _db, group.CreatedByParent.UserId,
                        $"🧒 {parentName} booked a seat for {child.Name} in group '{group.GroupName}'",
                        "SeatBooked"
                    );
                }

                return Ok(new
                {
                    message = $"Seat booked for {child.Name}!",
                    bookingId = booking.SeatBookingId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error booking seat", error = ex.Message });
            }
        }

        // DELETE: api/ride/cancel-seat/{bookingId}
        [HttpDelete("cancel-seat/{bookingId}")]
        public async Task<IActionResult> CancelSeat(int bookingId)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);

                var booking = await _db.SeatBookings
                    .Include(sb => sb.Child)
                    .FirstOrDefaultAsync(sb => sb.SeatBookingId == bookingId
                        && sb.ParentId == parent!.ParentId);

                if (booking == null)
                    return NotFound(new { message = "Booking not found" });

                booking.Status = "Cancelled";
                await _db.SaveChangesAsync();

                return Ok(new { message = $"Seat booking cancelled for {booking.Child.Name}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error cancelling seat", error = ex.Message });
            }
        }

        // GET: api/ride/my-seat-bookings
        [HttpGet("my-seat-bookings")]
        public async Task<IActionResult> GetMySeatBookings()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var bookings = await _db.SeatBookings
                    .Where(sb => sb.ParentId == parent.ParentId && sb.Status == "Booked")
                    .Include(sb => sb.Child)
                    .Include(sb => sb.CarpoolGroup)
                    .Select(sb => new
                    {
                        sb.SeatBookingId,
                        sb.GroupId,
                        groupName = sb.CarpoolGroup.GroupName,
                        sb.ChildId,
                        childName = sb.Child.Name,
                        sb.Status,
                        sb.BookedAt
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching bookings", error = ex.Message });
            }
        }

        // GET: api/ride/group-seat-bookings/{groupId}
        [HttpGet("group-seat-bookings/{groupId}")]
        public async Task<IActionResult> GetGroupSeatBookings(int groupId)
        {
            try
            {
                var bookings = await _db.SeatBookings
                    .Where(sb => sb.GroupId == groupId && sb.Status == "Booked")
                    .Include(sb => sb.Child)
                    .Include(sb => sb.Parent)
                        .ThenInclude(p => p.User)
                    .Select(sb => new
                    {
                        sb.SeatBookingId,
                        sb.ChildId,
                        childName = sb.Child.Name,
                        childAge = sb.Child.Age,
                        childClass = sb.Child.Class,
                        parentName = sb.Parent.User.FullName,
                        sb.Status,
                        sb.BookedAt
                    })
                    .ToListAsync();

                return Ok(bookings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching group seat bookings", error = ex.Message });
            }
        }

        // GET: api/ride/my
        [HttpGet("my")]
        public async Task<IActionResult> GetMyRides()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var myGroupIds = await _db.GroupMembers
                    .Where(gm => gm.ParentId == parent.ParentId)
                    .Select(gm => gm.GroupId)
                    .ToListAsync();

                if (!myGroupIds.Any())
                    return Ok(new List<object>());

                var rides = await _db.Rides
                    .Where(r => myGroupIds.Contains(r.GroupId))
                    .Include(r => r.CarpoolGroup)
                    .Include(r => r.DriverParent)
                        .ThenInclude(p => p!.User)
                    .OrderByDescending(r => r.RideDate)
                    .ToListAsync();

                var members = await _db.GroupMembers
                    .Where(gm => myGroupIds.Contains(gm.GroupId))
                    .Include(gm => gm.Parent)
                        .ThenInclude(p => p.User)
                    .ToListAsync();

                var result = rides.Select(r => new
                {
                    r.RideId,
                    r.GroupId,
                    groupName = r.CarpoolGroup?.GroupName,
                    r.VehicleId,
                    r.DriverParentId,
                    driverName = r.DriverParent?.User?.FullName ?? "Unknown",
                    r.RideDate,
                    pickupTime = r.PickupTime.HasValue ? r.PickupTime.Value.ToString(@"hh\:mm") : null,
                    dropTime = r.DropTime.HasValue ? r.DropTime.Value.ToString(@"hh\:mm") : null,
                    r.Status,
                    r.RejectionReason,
                    members = members
                        .Where(gm => gm.GroupId == r.GroupId)
                        .Select(gm => new
                        {
                            gm.ParentId,
                            gm.Role,
                            gm.ChildCount,
                            parentName = gm.Parent?.User?.FullName ?? "Unknown"
                        }).ToList()
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching rides", error = ex.Message });
            }
        }

        // GET: api/ride/active
        [HttpGet("active")]
        public async Task<IActionResult> GetActiveRides()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var myGroupIds = await _db.GroupMembers
                    .Where(gm => gm.ParentId == parent.ParentId)
                    .Select(gm => gm.GroupId)
                    .ToListAsync();

                if (!myGroupIds.Any())
                    return Ok(new List<object>());

                var rides = await _db.Rides
                    .Where(r => myGroupIds.Contains(r.GroupId) && r.Status == "Started")
                    .Include(r => r.CarpoolGroup)
                    .Include(r => r.DriverParent)
                        .ThenInclude(p => p!.User)
                    .ToListAsync();

                var members = await _db.GroupMembers
                    .Where(gm => myGroupIds.Contains(gm.GroupId))
                    .Include(gm => gm.Parent)
                        .ThenInclude(p => p.User)
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
                    r.Status,
                    members = members
                        .Where(gm => gm.GroupId == r.GroupId)
                        .Select(gm => new
                        {
                            gm.ParentId,
                            gm.Role,
                            gm.ChildCount,
                            parentName = gm.Parent?.User?.FullName ?? "Unknown"
                        }).ToList()
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching active rides", error = ex.Message });
            }
        }

        // PUT: api/ride/attendance
        [HttpPut("attendance")]
        public async Task<IActionResult> MarkAttendance([FromBody] AttendanceDto dto)
        {
            try
            {
                var attendance = await _db.Attendances
                    .Include(a => a.Child)
                    .FirstOrDefaultAsync(a => a.RideId == dto.RideId && a.ChildId == dto.ChildId);

                if (attendance == null)
                    return NotFound(new { message = "Attendance record not found" });

                attendance.Status = dto.Status;
                if (dto.Status == "Boarded") attendance.BoardingTime = DateTime.UtcNow;
                if (dto.Status == "Dropped") attendance.DropTime = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                var childParent = await _db.Parents
                    .FirstOrDefaultAsync(p => p.ParentId == attendance.Child.ParentId);

                if (childParent != null)
                {
                    string emoji = dto.Status == "Boarded" ? "✅" : "🏠";
                    string action = dto.Status == "Boarded" ? "boarded the bus" : "been dropped off";
                    string time = DateTime.UtcNow.ToString("hh:mm tt");

                    await NotificationController.CreateNotification(
                        _db, childParent.UserId,
                        $"{emoji} {attendance.Child.Name} has {action} at {time} (Ride #{dto.RideId})",
                        dto.Status == "Boarded" ? "ChildBoarded" : "ChildDropped"
                    );

                    var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                    foreach (var adminId in adminUserIds)
                    {
                        await NotificationController.CreateNotification(
                            _db, adminId,
                            $"{emoji} {attendance.Child.Name} has {action} at {time} (Ride #{dto.RideId})",
                            dto.Status == "Boarded" ? "ChildBoarded" : "ChildDropped"
                        );
                    }
                }

                return Ok(new { message = "Attendance updated" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating attendance", error = ex.Message });
            }
        }

        // GET: api/ride/{id}/attendance
        [HttpGet("{id}/attendance")]
        public async Task<IActionResult> GetAttendance(int id)
        {
            try
            {
                var attendance = await _db.Attendances
                    .Where(a => a.RideId == id)
                    .Include(a => a.Child)
                    .Select(a => new
                    {
                        a.AttendanceId,
                        a.RideId,
                        a.ChildId,
                        childName = a.Child.Name,
                        a.Status,
                        a.BoardingTime,
                        a.DropTime
                    })
                    .ToListAsync();

                return Ok(attendance);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching attendance", error = ex.Message });
            }
        }

        // GET: api/ride/group/{groupId}
        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetGroupRides(int groupId)
        {
            try
            {
                var rides = await _db.Rides
                    .Where(r => r.GroupId == groupId)
                    .OrderByDescending(r => r.RideDate)
                    .Select(r => new
                    {
                        r.RideId,
                        r.GroupId,
                        r.VehicleId,
                        r.DriverParentId,
                        r.RideDate,
                        r.PickupTime,
                        r.DropTime,
                        r.Status
                    })
                    .ToListAsync();

                return Ok(rides);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching rides", error = ex.Message });
            }
        }

        // ── Private Helpers ───────────────────────────────────────
        private async Task CreateAttendanceForRide(int rideId, int groupId)
        {
            // ✅ Use seat bookings to create attendance — only booked children
            var bookedChildren = await _db.SeatBookings
                .Where(sb => sb.GroupId == groupId && sb.Status == "Booked")
                .Select(sb => sb.ChildId)
                .ToListAsync();

            // Also include driver's children
            var driverChildren = await _db.Children
                .Where(c => _db.GroupMembers
                    .Where(gm => gm.GroupId == groupId && gm.Role == "Driver")
                    .Select(gm => gm.ParentId)
                    .Contains(c.ParentId))
                .Select(c => c.ChildId)
                .ToListAsync();

            var allChildIds = bookedChildren.Union(driverChildren).Distinct().ToList();

            foreach (var childId in allChildIds)
            {
                var exists = await _db.Attendances
                    .AnyAsync(a => a.RideId == rideId && a.ChildId == childId);
                if (!exists)
                {
                    _db.Attendances.Add(new Attendance
                    {
                        RideId = rideId,
                        ChildId = childId,
                        Status = "Absent"
                    });
                }
            }

            await _db.SaveChangesAsync();
        }

        private async Task NotifyRideStarted(Ride ride, CarpoolGroup group, int driverUserId)
        {
            var driverName = await _db.Users
                .Where(u => u.UserId == driverUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            var memberUserIds = await _db.GroupMembers
                .Where(gm => gm.GroupId == ride.GroupId)
                .Include(gm => gm.Parent)
                .Select(gm => gm.Parent.UserId)
                .ToListAsync();

            foreach (var uid in memberUserIds)
            {
                if (uid != driverUserId)
                {
                    await NotificationController.CreateNotification(
                        _db, uid,
                        $"🚌 Ride #{ride.RideId} has started! Driver: {driverName}. Group: {group.GroupName}",
                        "RideStarted"
                    );
                }
            }

            var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
            foreach (var adminId in adminUserIds)
            {
                await NotificationController.CreateNotification(
                    _db, adminId,
                    $"🚌 Ride #{ride.RideId} started in group '{group.GroupName}' by {driverName}",
                    "RideStarted"
                );
            }
        }
    }

    public class StartRideDto
    {
        public int GroupId { get; set; }
        public int? VehicleId { get; set; }
    }

    public class ScheduleRideDto
    {
        public int GroupId { get; set; }
        public int? VehicleId { get; set; }
        public string RideDateString { get; set; } = "";
        public string PickupTimeString { get; set; } = "";
    }

    public class AttendanceDto
    {
        public int RideId { get; set; }
        public int ChildId { get; set; }
        public string Status { get; set; } = "Boarded";
    }

    public class RejectRideDto
    {
        public string? Reason { get; set; }
    }

    public class BookSeatDto
    {
        public int GroupId { get; set; }
        public int ChildId { get; set; }
    }
}