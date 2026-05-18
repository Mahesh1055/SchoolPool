using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class Child
    {
        public int ChildId { get; set; }
        public int ParentId { get; set; }
        public int? SchoolId { get; set; }
        public string Name { get; set; } = "";
        public int Age { get; set; }
        public string? Class { get; set; }

        // ✅ Verification status
        public string VerificationStatus { get; set; } = "Pending";
        public string? DocumentUrl { get; set; }
        public string? RejectionReason { get; set; }

        [ForeignKey("ParentId")]
        public Parent Parent { get; set; } = null!;

        [ForeignKey("SchoolId")]
        public School? School { get; set; }

        public ICollection<Attendance> Attendances { get; set; } = new List<Attendance>();
    }
}