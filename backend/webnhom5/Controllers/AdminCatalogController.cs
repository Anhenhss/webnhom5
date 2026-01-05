using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using webnhom5.Services;
using webnhom5.DTOs;

namespace webnhom5.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/admin")]
    [ApiController]
    public class AdminCatalogController : ControllerBase {
        private readonly ICatalogService _service;
        public AdminCatalogController(ICatalogService service) => _service = service;

        [HttpGet("categories/tree")]
        public async Task<IActionResult> GetTree() => Ok(await _service.GetCategoryTree());

        [HttpPost("products")]
        public async Task<IActionResult> PostProduct([FromForm] ProductCreateDTO dto) {
            await _service.CreateProduct(dto);
            return Ok(new { message = "Thêm thành công" });
        }

        [HttpPost("variants")]
        public async Task<IActionResult> PostVariant(VariantDTO dto) {
            try {
                await _service.CreateVariant(dto);
                return Ok();
            } catch (Exception ex) { return BadRequest(ex.Message); }
        }
    }
}