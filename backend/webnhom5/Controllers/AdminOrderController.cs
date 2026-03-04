using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin/orders")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminOrderController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public AdminOrderController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? status, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            return Ok(await _orderService.GetOrdersAsync(status, from, to));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null) return NotFound();
            return Ok(order);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            try
            {
                // Lấy tên Admin đang đăng nhập (nếu có Auth) hoặc fix cứng để test
                string adminName = User.FindFirst(ClaimTypes.Name)?.Value ?? "Admin";
                
                await _orderService.UpdateOrderStatusAsync(id, dto.NewStatus, dto.Note, adminName);
                return Ok(new { message = "Cập nhật trạng thái thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics([FromQuery] int days = 7)
        {
            return Ok(await _orderService.GetDailyRevenueAsync(days));
        }
    }
}