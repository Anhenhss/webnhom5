using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/cart")]
    [ApiController]
    [Authorize] // Bắt buộc đăng nhập
    public class CartController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public CartController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpGet]
        public async Task<IActionResult> GetMyCart()
        {
            return Ok(await _orderService.GetMyCartAsync(GetUserId()));
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
        {
            try
            {
                await _orderService.AddToCartAsync(GetUserId(), dto);
                return Ok(new { message = "Đã thêm vào giỏ hàng" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("remove/{itemId}")]
        public async Task<IActionResult> RemoveItem(int itemId)
        {
            await _orderService.RemoveFromCartAsync(GetUserId(), itemId);
            return Ok(new { message = "Đã xóa sản phẩm khỏi giỏ" });
        }

        // API quan trọng: CHECKOUT
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutDto dto)
        {
            try
            {
                string orderCode = await _orderService.CheckoutAsync(GetUserId(), dto);
                return Ok(new { message = "Đặt hàng thành công!", orderCode });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}