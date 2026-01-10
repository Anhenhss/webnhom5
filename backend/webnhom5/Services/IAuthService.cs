using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public interface IAuthService
    {
        Task<User> RegisterAsync(RegisterDto registerDto);
        Task<TokenResponseDto?> LoginAsync(LoginDto loginDto);
        
        // Hai nhiệm vụ khó mà em nhắc thầy đây:
        Task<TokenResponseDto> GoogleLoginAsync(GoogleLoginDto googleDto);
        Task<TokenResponseDto?> RefreshTokenAsync(RefreshTokenDto tokenDto);
    }
}