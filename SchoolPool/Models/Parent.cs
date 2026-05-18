using System.ComponentModel.DataAnnotations;
namespace SchoolPool.Models
{
    public class Parent
    {
        public int ParentId { get; set; }
        public int UserId { get; set; }
        public string? Locality { get; set; }

        // Navigation
        public User User { get; set; } = null!;
        public ICollection<Child> Children { get; set; } = new List<Child>();
        public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
        public ICollection<GroupMember> GroupMembers { get; set; } = new List<GroupMember>();
    }
}