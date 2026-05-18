using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class SeatBooking
    {
        public int SeatBookingId { get; set; }
        public int GroupId { get; set; }
        public int ParentId { get; set; }
        public int ChildId { get; set; }
        public string Status { get; set; } = "Booked"; // Booked, Cancelled
        public DateTime BookedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("GroupId")]
        public CarpoolGroup CarpoolGroup { get; set; } = null!;

        [ForeignKey("ParentId")]
        public Parent Parent { get; set; } = null!;

        [ForeignKey("ChildId")]
        public Child Child { get; set; } = null!;
    }
}