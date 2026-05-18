namespace SchoolPool.Models
{
    public class Verification
    {
        public int VerificationId { get; set; }
        public int UserId { get; set; }
        public string DocumentType { get; set; } = string.Empty; // Aadhar, License, etc.
        public string? DocumentUrl { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public DateTime? VerifiedAt { get; set; }

        // Navigation
        public User User { get; set; } = null!;
    }
}