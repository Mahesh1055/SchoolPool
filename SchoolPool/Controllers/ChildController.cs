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
    public class ChildController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ChildController(AppDbContext db) => _db = db;

        // GET: api/child
        [HttpGet]
        public async Task<IActionResult> GetMyChildren()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var children = await _db.Children
                    .Where(c => c.ParentId == parent.ParentId)
                    .Include(c => c.School)
                    .Select(c => new
                    {
                        c.ChildId,
                        c.Name,
                        c.Age,
                        c.Class,
                        c.VerificationStatus,
                        c.DocumentUrl,
                        c.RejectionReason,
                        school = c.School == null ? null : new
                        {
                            c.School.SchoolId,
                            c.School.SchoolName
                        }
                    })
                    .ToListAsync();

                return Ok(children);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching children", error = ex.Message });
            }
        }

        // POST: api/child
        [HttpPost]
        public async Task<IActionResult> AddChild([FromBody] ChildDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return NotFound(new { message = "Parent not found" });

                var child = new Child
                {
                    ParentId = parent.ParentId,
                    SchoolId = dto.SchoolId,
                    Name = dto.Name,
                    Age = dto.Age,
                    Class = dto.Class,
                    DocumentUrl = dto.DocumentUrl,
                    // ✅ Starts as Pending
                    VerificationStatus = "Pending"
                };

                _db.Children.Add(child);
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db, userId,
                    $"👦 Child '{child.Name}' has been added and is pending admin verification.",
                    "ChildPending"
                );

                // ✅ Notify all admins
                var adminIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                var parentName = await _db.Users
                    .Where(u => u.UserId == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                foreach (var adminId in adminIds)
                {
                    await NotificationController.CreateNotification(
                        _db, adminId,
                        $"👦 New child '{child.Name}' added by {parentName} is waiting for verification.",
                        "ChildPendingApproval"
                    );
                }

                return Ok(new
                {
                    message = "Child added and pending admin verification",
                    childId = child.ChildId,
                    name = child.Name,
                    verificationStatus = child.VerificationStatus
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error adding child", error = ex.Message });
            }
        }

        // POST: api/child/{id}/upload-document
        [HttpPost("{id}/upload-document")]
        public async Task<IActionResult> UploadDocument(int id, [FromBody] UploadDocumentDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                var child = await _db.Children
                    .FirstOrDefaultAsync(c => c.ChildId == id && c.ParentId == parent!.ParentId);

                if (child == null)
                    return NotFound(new { message = "Child not found" });

                child.DocumentUrl = dto.DocumentUrl;
                child.VerificationStatus = "Pending";
                await _db.SaveChangesAsync();

                return Ok(new { message = "Document uploaded. Pending admin verification." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error uploading document", error = ex.Message });
            }
        }

        // PUT: api/child/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateChild(int id, [FromBody] ChildDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                var child = await _db.Children
                    .FirstOrDefaultAsync(c => c.ChildId == id && c.ParentId == parent!.ParentId);

                if (child == null)
                    return NotFound(new { message = "Child not found" });

                child.Name = dto.Name;
                child.Age = dto.Age;
                child.Class = dto.Class;
                child.SchoolId = dto.SchoolId;

                await _db.SaveChangesAsync();
                return Ok(new { message = "Child updated" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating child", error = ex.Message });
            }
        }

        // DELETE: api/child/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChild(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                var child = await _db.Children
                    .FirstOrDefaultAsync(c => c.ChildId == id && c.ParentId == parent!.ParentId);

                if (child == null)
                    return NotFound(new { message = "Child not found" });

                _db.Children.Remove(child);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Child deleted" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting child", error = ex.Message });
            }
        }

        // ── ADMIN ENDPOINTS ───────────────────────────────────────

        // GET: api/child/admin/all
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllChildren()
        {
            try
            {
                var children = await _db.Children
                    .Include(c => c.School)
                    .Include(c => c.Parent)
                        .ThenInclude(p => p.User)
                    .Select(c => new
                    {
                        c.ChildId,
                        c.Name,
                        c.Age,
                        c.Class,
                        c.VerificationStatus,
                        c.DocumentUrl,
                        c.RejectionReason,
                        parentName = c.Parent.User.FullName,
                        parentEmail = c.Parent.User.Email,
                        school = c.School == null ? null : new
                        {
                            c.School.SchoolId,
                            c.School.SchoolName
                        }
                    })
                    .ToListAsync();

                return Ok(children);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching children", error = ex.Message });
            }
        }

        // PUT: api/child/admin/{id}/verify
        [HttpPut("admin/{id}/verify")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> VerifyChild(int id)
        {
            try
            {
                var child = await _db.Children
                    .Include(c => c.Parent)
                    .FirstOrDefaultAsync(c => c.ChildId == id);

                if (child == null)
                    return NotFound(new { message = "Child not found" });

                child.VerificationStatus = "Approved";
                child.RejectionReason = null;
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db,
                    child.Parent.UserId,
                    $"✅ Your child '{child.Name}' has been verified by admin! They can now be included in rides.",
                    "ChildVerified"
                );

                return Ok(new { message = "Child verified successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error verifying child", error = ex.Message });
            }
        }

        // PUT: api/child/admin/{id}/reject
        [HttpPut("admin/{id}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectChild(int id, [FromBody] RejectDto dto)
        {
            try
            {
                var child = await _db.Children
                    .Include(c => c.Parent)
                    .FirstOrDefaultAsync(c => c.ChildId == id);

                if (child == null)
                    return NotFound(new { message = "Child not found" });

                child.VerificationStatus = "Rejected";
                child.RejectionReason = dto.Reason;
                await _db.SaveChangesAsync();

                // ✅ Notify parent
                await NotificationController.CreateNotification(
                    _db,
                    child.Parent.UserId,
                    $"❌ Your child '{child.Name}' verification was rejected. Reason: {dto.Reason ?? "No reason provided"}. Please re-upload valid documents.",
                    "ChildRejected"
                );

                return Ok(new { message = "Child rejected" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error rejecting child", error = ex.Message });
            }
        }
    }

    public class ChildDto
    {
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string? Class { get; set; }
        public int? SchoolId { get; set; }
        public string? DocumentUrl { get; set; }
    }

    public class UploadDocumentDto
    {
        public string DocumentUrl { get; set; } = "";
    }

    public class RejectDto
    {
        public string? Reason { get; set; }
    }
}