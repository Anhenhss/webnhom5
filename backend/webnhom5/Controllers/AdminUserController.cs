using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/admin/users")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminUserController : ControllerBase
    {
        private readonly IUserService _userService;

        public AdminUserController(IUserService userService)
        {
            _userService = userService;
        }

        // 1. Lấy danh sách tất cả người dùng (Phân trang & Tìm kiếm)
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1)
        {
            var users = await _userService.GetAllUsersAsync(search, page, 10);
            return Ok(users);
        }

        // 2. BỔ SUNG: Lấy chi tiết một người dùng theo ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng" });
            }
            return Ok(user);
        }

        // 3. Khóa hoặc mở khóa tài khoản
        [HttpPut("{id}/lock")]
        public async Task<IActionResult> LockUser(int id, [FromBody] bool isLocked)
        {
            try 
            {
                await _userService.LockUserAsync(id, isLocked);
                return Ok(new { message = isLocked ? "Đã khóa tài khoản" : "Đã mở khóa" });
            }
            catch (Exception ex) 
            { 
                return BadRequest(new { message = ex.Message }); 
            }
        }

        // 4. Cập nhật quyền (Role)
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
        {
            try 
            {
                await _userService.UpdateRoleAsync(id, dto.Role);
                return Ok(new { message = "Cập nhật quyền thành công" });
            }
            catch (Exception ex) 
            { 
                return BadRequest(new { message = ex.Message }); 
            }
        }
    }
}