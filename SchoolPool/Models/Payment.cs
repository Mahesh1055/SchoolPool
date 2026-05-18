namespace SchoolPool.Models
{
    public class Payment
    {
        public int PaymentId { get; set; }
        public int GroupId { get; set; }
        public int ParentId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string? TransactionId { get; set; }
       

        // Navigation
        public CarpoolGroup CarpoolGroup { get; set; } = null!;
        public Parent Parent { get; set; } = null!;
        public DateTime PaidAt { get; set; } = DateTime.UtcNow;

        public string PaymentMethod { get; set; } = "Cash";  // UPI | Card | Cash
        public string Status { get; set; } = "Pending";       // Pending | Completed | Failed | Refunded  
    }
}