using Microsoft.EntityFrameworkCore;
using SchoolPool.Models;

namespace SchoolPool.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Parent> Parents { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<School> Schools { get; set; }
        public DbSet<Child> Children { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<CarpoolGroup> CarpoolGroups { get; set; }
        public DbSet<GroupMember> GroupMembers { get; set; }
        public DbSet<Ride> Rides { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<GPSLocation> GPSLocations { get; set; }
        public DbSet<EmergencyAlert> EmergencyAlerts { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Verification> Verifications { get; set; }

        public DbSet<SeatBooking> SeatBookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Composite PK for GroupMembers
            modelBuilder.Entity<GroupMember>()
                .HasKey(gm => new { gm.GroupId, gm.ParentId });

            // User → Parent (one-to-one)
            modelBuilder.Entity<Parent>()
                .HasOne(p => p.User)
                .WithOne(u => u.Parent)
                .HasForeignKey<Parent>(p => p.UserId);

            // User → Admin (one-to-one)
            modelBuilder.Entity<Admin>()
                .HasOne(a => a.User)
                .WithOne(u => u.Admin)
                .HasForeignKey<Admin>(a => a.UserId);

            // Ride → DriverParent (no cascade)
            modelBuilder.Entity<Ride>()
                .HasOne(r => r.DriverParent)
                .WithMany()
                .HasForeignKey(r => r.DriverParentId)
                .OnDelete(DeleteBehavior.NoAction);

            // CarpoolGroup → CreatedByParent (no cascade)
            modelBuilder.Entity<CarpoolGroup>()
                .HasOne(cg => cg.CreatedByParent)
                .WithMany()
                .HasForeignKey(cg => cg.CreatedByParentId)
                .OnDelete(DeleteBehavior.NoAction);

            // EmergencyAlert → TriggeredByParent (no cascade)
            modelBuilder.Entity<EmergencyAlert>()
                .HasOne(e => e.TriggeredByParent)
                .WithMany()
                .HasForeignKey(e => e.TriggeredByParentId)
                .OnDelete(DeleteBehavior.NoAction);

            // EmergencyAlert → Ride (no cascade)
            modelBuilder.Entity<EmergencyAlert>()
                .HasOne(e => e.Ride)
                .WithMany()
                .HasForeignKey(e => e.RideId)
                .OnDelete(DeleteBehavior.NoAction);

            // Attendance → Ride (no cascade)
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Ride)
                .WithMany()
                .HasForeignKey(a => a.RideId)
                .OnDelete(DeleteBehavior.NoAction);

            // Payment → Parent (no cascade)
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Parent)
                .WithMany()
                .HasForeignKey(p => p.ParentId)
                .OnDelete(DeleteBehavior.NoAction);

            // Payment → Amount precision
            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<GPSLocation>()
         .HasOne(g => g.Ride)
         .WithMany()
         .HasForeignKey(g => g.RideId)
        .OnDelete(DeleteBehavior.Cascade);

        }
    }
}