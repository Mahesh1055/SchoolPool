using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class GroupMember
    {
        public int GroupId { get; set; }
        public int ParentId { get; set; }
        public string Role { get; set; } = "Passenger";
        public int ChildCount { get; set; } = 0; // ✅ NEW
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("GroupId")]
        public CarpoolGroup CarpoolGroup { get; set; } = null!;

        [ForeignKey("ParentId")]
        public Parent Parent { get; set; } = null!;
    }
}