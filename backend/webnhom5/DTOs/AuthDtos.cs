using System.ComponentModel.DataAnnotations;

namespace webnhom5.DTOs
{
    public class RegisterDto
    {
        [Required] public string FullName { get; set; } = null!;
        [Required, EmailAddress] public string Email { get; set; } = null!;
        [Required, MinLength(6)] public string Password { get; set; } = null!;
        [Compare("Password")] public string ConfirmPassword { get; set; } = null!;
    }

    public class LoginDto
    {
        [Required, EmailAddress] public string Email { get; set; } = null!;
        [Required] public string Password { get; set; } = null!;
    }

    // DTO nhận Token từ Google (Frontend gửi lên)
    public class GoogleLoginDto
    {
        [Required]
        public string IdToken { get; set; } = null!; // Token Google trả về cho Client
    }

    // DTO để xin cấp lại Token mới
    public class RefreshTokenDto
    {
        public string AccessToken { get; set; } = null!;
        public string RefreshToken { get; set; } = null!;
    }

    public class TokenResponseDto
    {
        public string AccessToken { get; set; } = null!;
        public string RefreshToken { get; set; } = null!; // Trả về thêm cái này
        public int ExpiresInMinutes { get; set; }
    }
}