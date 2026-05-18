using System.ComponentModel.DataAnnotations;
namespace SchoolPool.Models
{
    public class Admin
    {
        public int AdminId { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
