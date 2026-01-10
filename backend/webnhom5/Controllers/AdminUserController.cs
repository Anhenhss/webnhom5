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

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1)
        {
            return Ok(await _userService.GetAllUsersAsync(search, page, 10)); // Mặc định 10 user/trang
        }

        [HttpPut("{id}/lock")]
        public async Task<IActionResult> LockUser(int id, [FromBody] bool isLocked)
        {
            try {
                await _userService.LockUserAsync(id, isLocked);
                return Ok(new { message = isLocked ? "Đã khóa tài khoản" : "Đã mở khóa" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleDto dto)
        {
            try {
                await _userService.UpdateRoleAsync(id, dto.Role);
                return Ok(new { message = "Cập nhật quyền thành công" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}