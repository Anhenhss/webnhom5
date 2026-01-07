namespace webnhom5.DTOs;

public record RegisterDto(string Email, string Password, string FullName);
public record LoginDto(string Email, string Password);
public record GoogleLoginDto(string IdToken);
public record RefreshTokenRequest(string Email, string RefreshToken);
public record AuthResponse(bool Success, string Message, string? Token = null, string? RefreshToken = null);