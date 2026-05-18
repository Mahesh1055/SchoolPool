using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class CarpoolGroup
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int GroupId { get; set; }

        public string? GroupName { get; set; }

        public int? SchoolId { get; set; }
        public int CreatedByParentId { get; set; }
        public string? Locality { get; set; }
        public int MaxMembers { get; set; } = 5;
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("SchoolId")]
        public School? School { get; set; }

        [ForeignKey("CreatedByParentId")]
        public Parent CreatedByParent { get; set; } = null!;

        public ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();
        public ICollection<Ride> Rides { get; set; } = new List<Ride>();
    }
}