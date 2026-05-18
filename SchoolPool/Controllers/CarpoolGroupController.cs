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
    public class CarpoolGroupController : ControllerBase
    {
        private readonly AppDbContext _db;
        public CarpoolGroupController(AppDbContext db) => _db = db;

        // GET: api/carpoolgroup
        [HttpGet]
        public async Task<IActionResult> SearchGroups([FromQuery] string? locality)
        {
            try
            {
                var query = _db.CarpoolGroups
                    .Include(g => g.School)
                    .Include(g => g.CreatedByParent)
                        .ThenInclude(p => p.User)
                    .AsQueryable();

                if (!string.IsNullOrEmpty(locality))
                    query = query.Where(g => g.Locality!.Contains(locality));

                // ✅ Only show Active (verified) groups to parents searching
                query = query.Where(g => g.Status == "Active");

                var result = await query.Select(g => new
                {
                    g.GroupId,
                    g.GroupName,
                    g.Locality,
                    g.MaxMembers,
                    g.Status,
                    g.CreatedAt,
                    createdByName = g.CreatedByParent.User.FullName,
                    memberCount = _db.GroupMembers.Count(m => m.GroupId == g.GroupId),
                    school = g.School == null ? null : new
                    {
                        g.School.SchoolId,
                        g.School.SchoolName
                    }
                }).ToListAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching groups", error = ex.Message });
            }
        }

        // POST: api/carpoolgroup
        [HttpPost]
        public async Task<IActionResult> CreateGroup([FromBody] GroupDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "User is not registered as Parent" });

                var group = new CarpoolGroup
                {
                    GroupName = dto.GroupName,
                    SchoolId = dto.SchoolId,
                    CreatedByParentId = parent.ParentId,
                    Locality = dto.Locality,
                    MaxMembers = dto.MaxMembers,
                    CreatedAt = DateTime.UtcNow,
                    // ✅ New groups start as Pending — need admin approval
                    Status = "Pending"
                };

                _db.CarpoolGroups.Add(group);
                await _db.SaveChangesAsync();

                // Auto join creator as Driver
                await _db.GroupMembers.AddAsync(new GroupMember
                {
                    GroupId = group.GroupId,
                    ParentId = parent.ParentId,
                    Role = "Driver",
                    ChildCount = 0,
                    JoinedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                // ✅ Notify creator that group is pending approval
                await NotificationController.CreateNotification(
                    _db, userId,
                    $"👥 Your group '{group.GroupName}' has been created and is pending admin approval. You'll be notified once it's verified.",
                    "GroupPending"
                );

                // ✅ Notify all admins about new group
                var adminUserIds = await _db.Admins.Select(a => a.UserId).ToListAsync();
                var creatorName = await _db.Users
                    .Where(u => u.UserId == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                foreach (var adminId in adminUserIds)
                {
                    await NotificationController.CreateNotification(
                        _db, adminId,
                        $"👥 New group '{group.GroupName}' created by {creatorName} is waiting for your approval.",
                        "GroupPendingApproval"
                    );
                }

                return Ok(new
                {
                    message = "Group created successfully and is pending admin approval",
                    groupId = group.GroupId,
                    groupName = group.GroupName,
                    locality = group.Locality,
                    maxMembers = group.MaxMembers,
                    status = group.Status,
                    createdAt = group.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating group", error = ex.Message });
            }
        }

        // POST: api/carpoolgroup/{id}/join
        [HttpPost("{id}/join")]
        public async Task<IActionResult> JoinGroup(int id, [FromBody] JoinGroupDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "You are not registered as Parent" });

                var group = await _db.CarpoolGroups.FirstOrDefaultAsync(g => g.GroupId == id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                // ✅ Only allow joining verified/active groups
                if (group.Status != "Active")
                    return BadRequest(new { message = "This group is not yet verified by admin. Please wait for approval." });

                var memberCount = await _db.GroupMembers.CountAsync(m => m.GroupId == id);
                if (memberCount >= group.MaxMembers)
                    return BadRequest(new { message = "Group is full" });

                var alreadyMember = await _db.GroupMembers
                    .AnyAsync(m => m.GroupId == id && m.ParentId == parent.ParentId);
                if (alreadyMember)
                    return BadRequest(new { message = "You already joined this group" });

                if (dto.Role == "Driver")
                {
                    var oldDriver = await _db.GroupMembers
                        .FirstOrDefaultAsync(m => m.GroupId == id && m.Role == "Driver");
                    if (oldDriver != null)
                        oldDriver.Role = "Passenger";
                }

                await _db.GroupMembers.AddAsync(new GroupMember
                {
                    GroupId = id,
                    ParentId = parent.ParentId,
                    Role = dto.Role ?? "Passenger",
                    ChildCount = dto.ChildCount,
                    JoinedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();

                // ✅ Notify group creator that someone joined
                var creatorParent = await _db.CarpoolGroups
                    .Where(g => g.GroupId == id)
                    .Include(g => g.CreatedByParent)
                    .Select(g => g.CreatedByParent.UserId)
                    .FirstOrDefaultAsync();

                var joinerName = await _db.Users
                    .Where(u => u.UserId == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                await NotificationController.CreateNotification(
                    _db, creatorParent,
                    $"👤 {joinerName} has joined your group '{group.GroupName}' as {dto.Role ?? "Passenger"}",
                    "MemberJoined"
                );

                return Ok(new { message = $"Joined group as {dto.Role ?? "Passenger"} successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error joining group", error = ex.Message });
            }
        }

        // PUT: api/carpoolgroup/{id}/update
        [HttpPut("{id}/update")]
        public async Task<IActionResult> UpdateGroup(int id, [FromBody] GroupDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "Parent not found" });

                var group = await _db.CarpoolGroups.FindAsync(id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (group.CreatedByParentId != parent.ParentId)
                    return Forbid();

                group.GroupName = dto.GroupName ?? group.GroupName;
                group.Locality = dto.Locality ?? group.Locality;
                group.MaxMembers = dto.MaxMembers > 0 ? dto.MaxMembers : group.MaxMembers;

                await _db.SaveChangesAsync();
                return Ok(new { message = "Group updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating group", error = ex.Message });
            }
        }

        // DELETE: api/carpoolgroup/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGroup(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "Parent not found" });

                var group = await _db.CarpoolGroups.FindAsync(id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (group.CreatedByParentId != parent.ParentId)
                    return BadRequest(new { message = "Only the group creator can delete this group" });

                _db.CarpoolGroups.Remove(group);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Group deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting group", error = ex.Message });
            }
        }

        // POST: api/carpoolgroup/{id}/leave
        [HttpPost("{id}/leave")]
        public async Task<IActionResult> LeaveGroup(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "Parent not found" });

                var group = await _db.CarpoolGroups.FindAsync(id);
                if (group == null)
                    return NotFound(new { message = "Group not found" });

                if (group.CreatedByParentId == parent.ParentId)
                    return BadRequest(new { message = "Creator cannot leave. Delete the group instead." });

                var member = await _db.GroupMembers
                    .FirstOrDefaultAsync(m => m.GroupId == id && m.ParentId == parent.ParentId);
                if (member == null)
                    return BadRequest(new { message = "You are not a member of this group" });

                _db.GroupMembers.Remove(member);
                await _db.SaveChangesAsync();
                return Ok(new { message = "Left group successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error leaving group", error = ex.Message });
            }
        }

        // GET: api/carpoolgroup/my
        [HttpGet("my")]
        public async Task<IActionResult> GetMyGroups()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
                if (parent == null)
                    return BadRequest(new { message = "Parent not found" });

                var groups = await _db.GroupMembers
                    .Where(gm => gm.ParentId == parent.ParentId)
                    .Include(gm => gm.CarpoolGroup)
                        .ThenInclude(g => g.School)
                    .Include(gm => gm.CarpoolGroup)
                        .ThenInclude(g => g.CreatedByParent)
                            .ThenInclude(p => p.User)
                    .Select(gm => new
                    {
                        groupId = gm.CarpoolGroup.GroupId,
                        groupName = gm.CarpoolGroup.GroupName,
                        locality = gm.CarpoolGroup.Locality,
                        maxMembers = gm.CarpoolGroup.MaxMembers,
                        status = gm.CarpoolGroup.Status,
                        createdAt = gm.CarpoolGroup.CreatedAt,
                        createdByParentId = gm.CarpoolGroup.CreatedByParentId,
                        createdByName = gm.CarpoolGroup.CreatedByParent.User.FullName,
                        role = gm.Role,
                        childCount = gm.ChildCount,
                        joinedAt = gm.JoinedAt,
                        isCreator = gm.CarpoolGroup.CreatedByParentId == parent.ParentId,
                        memberCount = _db.GroupMembers.Count(m => m.GroupId == gm.CarpoolGroup.GroupId),
                        school = gm.CarpoolGroup.School == null ? null : new
                        {
                            gm.CarpoolGroup.School.SchoolId,
                            gm.CarpoolGroup.School.SchoolName
                        }
                    })
                    .ToListAsync();

                return Ok(groups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching your groups", error = ex.Message });
            }
        }
    }

    public class GroupDto
    {
        public string? GroupName { get; set; }
        public int? SchoolId { get; set; }
        public string? Locality { get; set; }
        public int MaxMembers { get; set; } = 5;
    }

    public class JoinGroupDto
    {
        public string? Role { get; set; } = "Passenger";
        public int ChildCount { get; set; } = 0;
    }
}