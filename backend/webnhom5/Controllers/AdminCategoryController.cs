using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin/categories")]
    [ApiController]
    // [Authorize(Roles = "Admin,Staff")] // Mở ra khi đã có Auth
    public class AdminCategoryController : ControllerBase
    {
        private readonly IProductService _service;
        public AdminCategoryController(IProductService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetTree()
        {
            return Ok(await _service.GetCategoryTreeAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
        {
            var cat = await _service.CreateCategoryAsync(dto);
            return Ok(cat);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try 
            {
                await _service.DeleteCategoryAsync(id);
                return Ok(new { message = "Xóa thành công" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}