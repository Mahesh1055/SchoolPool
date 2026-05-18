using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SchoolPool.Models
{
    public class GPSLocation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int RideId { get; set; }

        [ForeignKey("RideId")]
        public Ride Ride { get; set; } = null!;

        [Required]
        public double Latitude { get; set; }

        [Required]
        public double Longitude { get; set; }

        public double? Speed { get; set; }      // ← double? not float?
        public double? Accuracy { get; set; }   // ← double? not float?

        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}