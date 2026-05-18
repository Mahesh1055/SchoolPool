using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class Ride
    {
        public int RideId { get; set; }
        public int GroupId { get; set; }
        public int CarpoolGroupGroupId { get; set; }
        public int? VehicleId { get; set; }
        public int? DriverParentId { get; set; }
        public DateTime RideDate { get; set; }
        public TimeSpan? PickupTime { get; set; }
        public TimeSpan? DropTime { get; set; }

        // ✅ Status includes PendingApproval
        public string? Status { get; set; }
        public string? RejectionReason { get; set; }

        [ForeignKey("CarpoolGroupGroupId")]
        public CarpoolGroup CarpoolGroup { get; set; } = null!;

        [ForeignKey("VehicleId")]
        public Vehicle? Vehicle { get; set; }

        [ForeignKey("DriverParentId")]
        public Parent? DriverParent { get; set; }
    }
}