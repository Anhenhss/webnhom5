using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/categories")]
    [ApiController]
    public class AdminCategoryController : ControllerBase
    {
        private readonly IProductService _service;
        public AdminCategoryController(IProductService service) => _service = service;

        // Xem cây danh mục: AI CŨNG ĐƯỢC XEM
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetTree()
        {
            return Ok(await _service.GetCategoryTreeAsync());
        }

        // Thêm/Sửa/Xóa: CHỈ ADMIN/STAFF
        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
        {
            var cat = await _service.CreateCategoryAsync(dto);
            return Ok(cat);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Staff")]
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