// ─────────────────────────────────────────────────────────
//  FILE:  Controllers/PaymentController.cs
// ─────────────────────────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolPool.Data;
using SchoolPool.Models;
using System.Security.Claims;

namespace SchoolPool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PaymentController(AppDbContext db) => _db = db;

        // ── POST api/payment ──────────────────────────────────────────────────
        // Parent creates a payment record (after paying via UPI / card / COD).
        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentDto dto)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
            if (parent == null)
                return BadRequest(new { message = "Parent record not found." });

            var payment = new Payment
            {
                ParentId = parent.ParentId,
                Amount = dto.Amount,
                PaymentMethod = dto.PaymentMethod,   // "UPI" | "Card" | "Cash"
                Status = "Pending",            // Pending → Completed / Failed
                PaidAt = DateTime.UtcNow,
            };

            _db.Payments.Add(payment);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Payment recorded.", paymentId = payment.PaymentId });
        }

        // ── GET api/payment/my ────────────────────────────────────────────────
        // Parent views their own payment history.
        [HttpGet("my")]
        public async Task<IActionResult> GetMyPayments()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var parent = await _db.Parents.FirstOrDefaultAsync(p => p.UserId == userId);
            if (parent == null)
                return BadRequest(new { message = "Parent not found." });

            var payments = await _db.Payments
                .Where(p => p.ParentId == parent.ParentId)
                .OrderByDescending(p => p.PaidAt)
                .ToListAsync();

            return Ok(payments);
        }

        // ── PUT api/payment/{id}/status ───────────────────────────────────────
        // Admin updates payment status (Pending → Completed / Failed / Refunded).
        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdatePaymentStatusDto dto)
        {
            var payment = await _db.Payments.FindAsync(id);
            if (payment == null)
                return NotFound(new { message = "Payment not found." });

            var allowed = new[] { "Pending", "Completed", "Failed", "Refunded" };
            if (!allowed.Contains(dto.Status))
                return BadRequest(new { message = $"Status must be one of: {string.Join(", ", allowed)}" });

            payment.Status = dto.Status;
            await _db.SaveChangesAsync();

            return Ok(new { message = $"Payment status updated to {dto.Status}." });
        }

        // ── GET api/payment (Admin only) ──────────────────────────────────────
        // Admin sees all payments across all parents, with optional status filter.
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll([FromQuery] string? status)
        {
            var query = _db.Payments
                .Include(p => p.Parent)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(p => p.Status == status);

            var payments = await query
                .OrderByDescending(p => p.PaidAt)
                .Select(p => new
                {
                    p.PaymentId,
                    p.ParentId,
                    p.Amount,
                    p.PaymentMethod,
                    p.Status,
                    p.PaidAt,
                })
                .ToListAsync();

            return Ok(payments);
        }

        // ── GET api/payment/summary ───────────────────────────────────────────
        // Admin dashboard: total collected, pending, refunded.
        [HttpGet("summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSummary()
        {
            var all = await _db.Payments.ToListAsync();

            return Ok(new
            {
                TotalCollected = all.Where(p => p.Status == "Completed").Sum(p => p.Amount),
                TotalPending = all.Where(p => p.Status == "Pending").Sum(p => p.Amount),
                TotalRefunded = all.Where(p => p.Status == "Refunded").Sum(p => p.Amount),
                TotalCount = all.Count,
            });
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────
    public class CreatePaymentDto
    {
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash"; // UPI | Card | Cash
    }

    public class UpdatePaymentStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
