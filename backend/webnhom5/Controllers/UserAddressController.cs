using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;

namespace webnhom5.Controllers
{
    [Route("api/user/addresses")]
    [ApiController]
    [Authorize] // Bắt buộc đăng nhập
    public class UserAddressController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserAddressController(IUserService userService)
        {
            _userService = userService;
        }

        private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        [HttpGet]
        public async Task<IActionResult> GetMyAddresses()
        {
            return Ok(await _userService.GetMyAddressesAsync(GetUserId()));
        }

        [HttpPost]
        public async Task<IActionResult> AddAddress([FromBody] CreateAddressDto dto)
        {
            try
            {
                var addr = await _userService.AddAddressAsync(GetUserId(), dto);
                return Ok(addr);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            await _userService.DeleteAddressAsync(GetUserId(), id);
            return Ok(new { message = "Đã xóa địa chỉ" });
        }
    }
}