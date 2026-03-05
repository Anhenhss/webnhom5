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
        [Authorize(Roles = "Admin")]
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
        [Authorize(Roles = "Admin")]
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
        // tạo tài khoản
        [HttpPost("create-account")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateAccount([FromBody] CreateAccountDto dto)
        {
            try
            {
                // Gọi hàm từ Service thay vì gọi trực tiếp Database
                var result = await _userService.CreateAccountAsync(dto);

                if (result)
                {
                    return Ok(new { message = "Tạo tài khoản thành công!" });
                }
                return BadRequest(new { message = "Không thể tạo tài khoản." });
            }
            catch (Exception ex)
            {
                // Exception từ Service (như email tồn tại) sẽ được bắt ở đây
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                var result = await _userService.UpdateUserAsync(id, dto);
                return Ok(new { message = "Đã cập nhật thông tin thành công!", user = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                await _userService.DeleteUserAsync(id);
                return Ok(new { message = "Đã xóa người dùng thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}