using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminMarketingController : ControllerBase
    {
        private readonly IMarketingService _marketingService;

        public AdminMarketingController(IMarketingService marketingService)
        {
            _marketingService = marketingService;
        }

        [HttpGet("promotions")]
        public async Task<IActionResult> GetAllPromotions()
        {
            return Ok(await _marketingService.GetAllPromotionsAsync());
        }

        [HttpPost("promotions")]
        public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionDto dto)
        {
            var promo = await _marketingService.CreatePromotionAsync(dto);
            return Ok(promo);
        }

        [HttpPost("coupons/generate")]
        public async Task<IActionResult> GenerateCoupons([FromBody] GenerateCouponDto dto)
        {
            await _marketingService.GenerateCouponsAsync(dto);
            return Ok(new { message = "Đã sinh mã voucher thành công" });
        }
    }
}