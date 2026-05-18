namespace SchoolPool.Models
{
    public class Vehicle
    {
        public int VehicleId { get; set; }
        public int ParentId { get; set; }
        public string VehicleNumber { get; set; } = string.Empty;
        public string? VehicleType { get; set; }
        public string? LicenseNumber { get; set; }
        public string? InsuranceDetails { get; set; }

        // ✅ Verification status
        public string VerificationStatus { get; set; } = "Pending";
        public string? DocumentUrl { get; set; }
        public string? RejectionReason { get; set; }

        // Navigation
        public Parent Parent { get; set; } = null!;
        public ICollection<Ride> Rides { get; set; } = new List<Ride>();
    }
}