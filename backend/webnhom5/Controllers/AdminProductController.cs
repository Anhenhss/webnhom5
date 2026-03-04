using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class AdminProductController : ControllerBase
    {
        private readonly IProductService _service;
        public AdminProductController(IProductService service) => _service = service;

        // KHU VỰC PUBLIC (AI CŨNG XEM ĐƯỢC)
        [HttpGet]
        [AllowAnonymous] // <--- Khách không cần login vẫn xem được hàng
        public async Task<IActionResult> GetAll()
            => Ok(await _service.GetAllProductsAsync());

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _service.GetProductByIdAsync(id);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm" });
            return Ok(product);
        }

        [HttpGet("{productId}/variants")]
        [AllowAnonymous]
        public async Task<IActionResult> GetVariantsByProduct(int productId)
        {
            var variants = await _service.GetVariantsByProductIdAsync(productId);
            return Ok(variants);
        }

        [HttpGet("variants/{id}")] // API chi tiết variant
        [AllowAnonymous]
        public async Task<IActionResult> GetVariantById(int id)
        {
            var variant = await _service.GetVariantByIdAsync(id);
            if (variant == null) return NotFound(new { message = "Không tìm thấy biến thể" });
            return Ok(variant);
        }

        // Master Data cũng cần Public để frontend render bộ lọc
        [HttpGet("master-data/colors")]
        [AllowAnonymous]
        public async Task<IActionResult> GetColors() => Ok(await _service.GetColorsAsync());

        [HttpGet("master-data/sizes")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSizes() => Ok(await _service.GetSizesAsync());

        [HttpPost("colors")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> AddColor([FromBody] MasterDataDto dto)
        {
            try
            {
                // Controller chỉ việc gọi Service và nhận kết quả
                int newId = await _service.AddColorAsync(dto);
                return Ok(new { message = "Thêm màu thành công", id = newId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Lỗi khi thêm màu: " + ex.Message });
            }
        }

        [HttpPost("sizes")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> AddSize([FromBody] MasterDataDto dto)
        {
            try
            {
                int newId = await _service.AddSizeAsync(dto);
                return Ok(new { message = "Thêm kích thước thành công", id = newId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Lỗi khi thêm kích thước: " + ex.Message });
            }
        }
        // KHU VỰC QUẢN TRỊ (CHỈ ADMIN/STAFF)
        [HttpPost]
        [Authorize(Roles = "Admin,Staff")] // <--- Chặn khách
        public async Task<IActionResult> CreateProduct([FromForm] CreateProductDto dto)
        {
            try
            {
                var result = await _service.CreateProductAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] UpdateProductDto dto)
        {
            try
            {
                var result = await _service.UpdateProductAsync(id, dto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            await _service.DeleteProductAsync(id);
            return Ok(new { message = "Đã xóa sản phẩm thành công" });
        }

        [HttpPut("{id}/toggle-status")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            try
            {
                // Vì em đã tiêm _service, ta sẽ gọi Service xử lý
                var result = await _service.ToggleProductStatusAsync(id);
                return Ok(new { message = "Cập nhật trạng thái thành công", isActive = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- VARIANTS CRUD (Quản trị) ---

        [HttpPost("variants")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> CreateVariant([FromBody] CreateVariantDto dto)
        {
            try
            {
                var variant = await _service.CreateVariantAsync(dto);
                return Ok(variant);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("variants/{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> UpdateVariant(int id, [FromBody] UpdateVariantDto dto)
        {
            try
            {
                var variant = await _service.UpdateVariantAsync(id, dto);
                return Ok(variant);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("variants/{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> DeleteVariant(int id)
        {
            try
            {
                await _service.DeleteVariantAsync(id);
                return Ok(new { message = "Đã xóa biến thể" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("{productId}/reviews")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReviews(int productId)
        {
            var reviews = await _service.GetReviewsByProductIdAsync(productId);
            return Ok(reviews);
        }
    }
}