using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/user/orders")]
    [ApiController]
    [Authorize] // Chỉ cần đăng nhập, Role nào cũng được
    public class ClientOrderController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public ClientOrderController(IOrderService orderService)
        {
            _orderService = orderService;
        }
        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            return Ok(await _orderService.GetMyOrdersAsync(userId));
        }
        [HttpPut("{orderId}/cancel")]
        public async Task<IActionResult> CancelMyOrder(int orderId)
        {
            try
            {
                // Gọi Service xử lý hủy đơn
                await _orderService.CancelOrderAsync(GetUserId(), orderId);
                return Ok(new { message = "Hủy đơn hàng thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}