using System.ComponentModel.DataAnnotations;
namespace SchoolPool.Models
{
    public class School
    {
        public int SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? ContactNumber { get; set; }

        public ICollection<Child> Children { get; set; } = new List<Child>();
        public ICollection<CarpoolGroup> CarpoolGroups { get; set; } = new List<CarpoolGroup>();
    }
}