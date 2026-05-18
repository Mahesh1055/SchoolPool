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
    public class VehicleController : ControllerBase
    {
        private readonly AppDbContext _db;
        public VehicleController(AppDbContext db) => _db = db;

        // GET: api/vehicle
        [HttpGet]
        public async Task<IActionResult> GetMyVehicles()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var vehicles = await _db.Vehicles
                    .Where(v => v.ParentId == parent.ParentId)
                    .Select(v => new
                    {
                        v.VehicleId,
                        v.VehicleNumber,
                        v.VehicleType,
                        v.LicenseNumber,
                        v.InsuranceDetails,
                        v.VerificationStatus,
                        v.DocumentUrl,
                        v.RejectionReason
                    })
                    .ToListAsync();

                return Ok(vehicles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching vehicles", error = ex.Message });
            }
        }

        // POST: api/vehicle
        [HttpPost]
        public async Task<IActionResult> AddVehicle([FromBody] VehicleDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var vehicle = new Vehicle
                {
                    ParentId = parent.ParentId,
                    VehicleNumber = dto.VehicleNumber,
                    VehicleType = dto.VehicleType,
                    LicenseNumber = dto.LicenseNumber,
                    InsuranceDetails = dto.InsuranceDetails,
                    DocumentUrl = dto.DocumentUrl,
                    // ✅ Starts as Pending
                    VerificationStatus = "Pending"
                };

                _db.Vehicles.Add(vehicle);
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db, userId,
                    $"🚗 Vehicle '{vehicle.VehicleNumber}' has been added and is pending admin verification.",
                    "VehiclePending"
                );

                // ✅ Notify admins
                var adminIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                var parentName = await _db.Users
                    .Where(u => u.UserId == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                foreach (var adminId in adminIds)
                {
                    await NotificationController.CreateNotification(
                        _db, adminId,
                        $"🚗 New vehicle '{vehicle.VehicleNumber}' added by {parentName} is waiting for verification.",
                        "VehiclePendingApproval"
                    );
                }

                return Ok(new
                {
                    message = "Vehicle added and pending admin verification",
                    vehicleId = vehicle.VehicleId,
                    vehicleNumber = vehicle.VehicleNumber,
                    verificationStatus = vehicle.VerificationStatus
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding vehicle", error = ex.Message });
            }
        }

        // POST: api/vehicle/{id}/upload-document
        [HttpPost("{id}/upload-document")]
        public async Task<IActionResult> UploadDocument(int id, [FromBody] UploadVehicleDocDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                var vehicle = await _db.Vehicles
                    .FirstOrDefaultAsync(v => v.VehicleId == id && v.ParentId == parent!.ParentId);

                if (vehicle == null)
                    return NotFound(new { message = "Vehicle not found" });

                vehicle.DocumentUrl = dto.DocumentUrl;
                vehicle.VerificationStatus = "Pending";
                await _db.SaveChangesAsync();

                return Ok(new { message = "Document uploaded. Pending admin verification." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error uploading document", error = ex.Message });
            }
        }

        // DELETE: api/vehicle/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVehicle(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                var vehicle = await _db.Vehicles
                    .FirstOrDefaultAsync(v => v.VehicleId == id && v.ParentId == parent!.ParentId);

                if (vehicle == null)
                    return NotFound(new { message = "Vehicle not found" });

                _db.Vehicles.Remove(vehicle);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Vehicle deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting vehicle", error = ex.Message });
            }
        }

        // ── ADMIN ENDPOINTS ───────────────────────────────────────

        // GET: api/vehicle/admin/all
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllVehicles()
        {
            try
            {
                var vehicles = await _db.Vehicles
                    .Include(v => v.Parent)
                        .ThenInclude(p => p.User)
                    .Select(v => new
                    {
                        v.VehicleId,
                        v.VehicleNumber,
                        v.VehicleType,
                        v.LicenseNumber,
                        v.InsuranceDetails,
                        v.VerificationStatus,
                        v.DocumentUrl,
                        v.RejectionReason,
                        parentName = v.Parent.User.FullName,
                        parentEmail = v.Parent.User.Email
                    })
                    .ToListAsync();

                return Ok(vehicles);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching vehicles", error = ex.Message });
            }
        }

        // PUT: api/vehicle/admin/{id}/verify
        [HttpPut("admin/{id}/verify")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> VerifyVehicle(int id)
        {
            try
            {
                var vehicle = await _db.Vehicles
                    .Include(v => v.Parent)
                    .FirstOrDefaultAsync(v => v.VehicleId == id);

                if (vehicle == null)
                    return NotFound(new { message = "Vehicle not found" });

                vehicle.VerificationStatus = "Approved";
                vehicle.RejectionReason = null;
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db,
                    vehicle.Parent.UserId,
                    $"✅ Your vehicle '{vehicle.VehicleNumber}' has been verified! You can now use it for rides.",
                    "VehicleVerified"
                );

                return Ok(new { message = "Vehicle verified successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error verifying vehicle", error = ex.Message });
            }
        }

        // PUT: api/vehicle/admin/{id}/reject
        [HttpPut("admin/{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectVehicle(int id, [FromBody] RejectDto dto)
        {
            try
            {
                var vehicle = await _db.Vehicles
                    .Include(v => v.Parent)
                    .FirstOrDefaultAsync(v => v.VehicleId == id);

                if (vehicle == null)
                    return NotFound(new { message = "Vehicle not found" });

                vehicle.VerificationStatus = "Rejected";
                vehicle.RejectionReason = dto.Reason;
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db,
                    vehicle.Parent.UserId,
                    $"❌ Your vehicle '{vehicle.VehicleNumber}' verification was rejected. Reason: {dto.Reason ?? "No reason provided"}. Please re-upload valid documents.",
                    "VehicleRejected"
                );

                return Ok(new { message = "Vehicle rejected" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting vehicle", error = ex.Message });
            }
        }
    }

    public class VehicleDto
    {
        public string VehicleNumber { get; set; } = string.Empty;
        public string? VehicleType { get; set; }
        public string? LicenseNumber { get; set; }
        public string? InsuranceDetails { get; set; }
        public string? DocumentUrl { get; set; }
    }

    public class UploadVehicleDocDto
    {
        public string DocumentUrl { get; set; } = "";
    }
}