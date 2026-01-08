using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin")] 
    [ApiController]
    public class AdminProductController : ControllerBase
    {
        private readonly IProductService _service;
        public AdminProductController(IProductService service) => _service = service;

        // --- PRODUCT CRUD ---
        
        // 1. Lấy danh sách
        [HttpGet("products")]
        public async Task<IActionResult> GetAll() 
            => Ok(await _service.GetAllProductsAsync());

        // 2. Lấy chi tiết
        [HttpGet("products/{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _service.GetProductByIdAsync(id);
            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm" });
            return Ok(product);
        }

        // 3. Tạo mới (Upload file)
        [HttpPost("products")]
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

        // 4. Cập nhật (Upload file)
        [HttpPut("products/{id}")]
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

        // 5. Xóa
        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            await _service.DeleteProductAsync(id);
            return Ok(new { message = "Đã xóa sản phẩm thành công" });
        }

        // --- VARIANTS CRUD ---

        // 1. Lấy chi tiết biến thể (MỚI THÊM)
        [HttpGet("product-variants/{id}")]
        public async Task<IActionResult> GetVariantById(int id)
        {
            var variant = await _service.GetVariantByIdAsync(id);
            if (variant == null) return NotFound(new { message = "Không tìm thấy biến thể" });
            return Ok(variant);
        }

        [HttpPost("product-variants")]
        public async Task<IActionResult> CreateVariant([FromBody] CreateVariantDto dto)
        {
            try
            {
                var variant = await _service.CreateVariantAsync(dto);
                return Ok(variant);
            }
            catch(Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("product-variants/{id}")]
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

        [HttpDelete("product-variants/{id}")]
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

        // --- MASTER DATA ---
        [HttpGet("master-data/colors")]
        public async Task<IActionResult> GetColors() => Ok(await _service.GetColorsAsync());

        [HttpGet("master-data/sizes")]
        public async Task<IActionResult> GetSizes() => Ok(await _service.GetSizesAsync());
    }
}