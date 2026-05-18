namespace SchoolPool.Models
{
    public class Attendance
    {
        public int AttendanceId { get; set; }
        public int RideId { get; set; }
        public int ChildId { get; set; }
        public DateTime? BoardingTime { get; set; }
        public DateTime? DropTime { get; set; }
        public string Status { get; set; } = "Absent"; // Boarded, Dropped, Absent

        // Navigation
        public Ride Ride { get; set; } = null!;
        public Child Child { get; set; } = null!;
    }
}