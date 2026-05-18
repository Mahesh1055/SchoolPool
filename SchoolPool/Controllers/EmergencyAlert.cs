using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class EmergencyAlert
    {
        [Key] // ✅ Explicit Primary Key
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AlertId { get; set; }

        public int RideId { get; set; }

        public int TriggeredByParentId { get; set; }

        public string? Location { get; set; }

        public DateTime AlertTime { get; set; } = DateTime.UtcNow;

        public string Status { get; set; } = "Active"; // Active, Resolved

        // 🔗 Navigation Properties
        [ForeignKey("RideId")]
        public Ride Ride { get; set; } = null!;

        [ForeignKey("TriggeredByParentId")]
        public Parent TriggeredByParent { get; set; } = null!;
    }
}