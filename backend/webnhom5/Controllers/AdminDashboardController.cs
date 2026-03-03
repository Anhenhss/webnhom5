using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin/dashboard")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public AdminDashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        // 1. API lấy 4 Thẻ thống kê + Cảnh báo
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview([FromQuery] string timeFilter = "week")
        {
            // timeFilter có thể là: "day", "week", "month", "year"
            var overview = await _dashboardService.GetOverviewAsync(timeFilter);
            return Ok(overview);
        }

        // 2. API lấy Top Sản phẩm bán chạy
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts([FromQuery] int limit = 5)
        {
            var topProducts = await _dashboardService.GetTopProductsAsync(limit);
            return Ok(topProducts);
        }
    }
}