using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;
using Microsoft.AspNetCore.Authorization;

namespace webnhom5.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // Đăng ký (Đã có logic Hash Password trong Service)
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (dto == null) return BadRequest("Dữ liệu không hợp lệ.");
        
        var result = await _authService.RegisterAsync(dto);
        if (!result.Success) return BadRequest(new { message = result.Message });

        return Ok(new { message = result.Message });
    }

    // Đăng nhập (Trả về JWT + Refresh Token)
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        if (!result.Success) return Unauthorized(new { message = result.Message });

        return Ok(new { 
            token = result.Token, 
            refreshToken = result.RefreshToken, 
            message = "Đăng nhập thành công" 
        });
    }

    // Google Login (Xử lý Gộp tài khoản / Tạo mới)
    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
    {
        if (string.IsNullOrEmpty(dto.IdToken)) return BadRequest("Token Google không hợp lệ.");

        var result = await _authService.GoogleLoginAsync(dto.IdToken);
        if (!result.Success) return BadRequest(new { message = result.Message });

        return Ok(new { 
            token = result.Token, 
            refreshToken = result.RefreshToken,
            message = "Xác thực Google thành công" 
        });
    }

    // Refresh Token (Cấp lại Access Token mới)
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest dto)
    {
        var result = await _authService.RefreshTokenAsync(dto);
        if (!result.Success) return Unauthorized(new { message = result.Message });

        return Ok(new { 
            token = result.Token, 
            refreshToken = result.RefreshToken 
        });
    }

    //  API Test phân quyền để má chứng minh phần "Authorization"
    [Authorize(Roles = "Admin")]
    [HttpGet("admin-test")]
    public IActionResult AdminOnly() => Ok("Chào Admin!");
}