using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.IdentityModel.Tokens;
using webnhom5.Repositories;
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services;

public interface IAuthService {
    Task<AuthResponse> RegisterAsync(RegisterDto dto);
    Task<AuthResponse> LoginAsync(LoginDto dto);
    Task<AuthResponse> GoogleLoginAsync(string idToken);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest dto);
}

public class AuthService : IAuthService {
    private readonly IUserRepository _userRepo;
    private readonly IConfiguration _config;

    public AuthService(IUserRepository userRepo, IConfiguration config) {
        _userRepo = userRepo;
        _config = config;
    }

    // Đăng ký tài khoản mới
    public async Task<AuthResponse> RegisterAsync(RegisterDto dto) {
        if (await _userRepo.GetByEmailAsync(dto.Email) != null) 
            return new AuthResponse(false, "Email đã tồn tại trong hệ thống");
        
        var user = new User { 
            Email = dto.Email, 
            FullName = dto.FullName, 
            Role = "Customer", // Role mặc định cho người dùng mới
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password), 
            IsLocked = false, 
            CreatedAt = DateTime.Now 
        };

        await _userRepo.AddAsync(user);
        await _userRepo.SaveChangesAsync();
        return new AuthResponse(true, "Đăng ký tài khoản thành công");
    }

    // Đăng nhập thông thường (Email + Password)
    public async Task<AuthResponse> LoginAsync(LoginDto dto) {
        var user = await _userRepo.GetByEmailAsync(dto.Email);
        
        if (user == null || user.IsLocked == true || string.IsNullOrEmpty(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash)) {
            return new AuthResponse(false, "Email hoặc mật khẩu không chính xác");
        }

        return await GenerateAuthResponse(user);
    }

    // Xử lý Google Login (Logic Gộp tài khoản khó nhất)
    public async Task<AuthResponse> GoogleLoginAsync(string idToken) {
        try {
            // Verify token gửi từ Frontend
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken);
            var user = await _userRepo.GetByEmailAsync(payload.Email);

            if (user == null) {
                //  Email chưa tồn tại -> Tạo mới hoàn toàn
                user = new User { 
                    Email = payload.Email, 
                    FullName = payload.Name, 
                    GoogleId = payload.Subject, 
                    Role = "Customer",
                    IsLocked = false, 
                    CreatedAt = DateTime.Now 
                };
                await _userRepo.AddAsync(user);
            } 
            else if (string.IsNullOrEmpty(user.GoogleId)) {
                
                // Nếu Email đã có (do đăng ký thường) nhưng chưa liên kết GoogleId
                user.GoogleId = payload.Subject;
                await _userRepo.UpdateAsync(user);
            }

            await _userRepo.SaveChangesAsync();
            return await GenerateAuthResponse(user);
        } 
        catch (Exception) { 
            return new AuthResponse(false, "Xác thực tài khoản Google không hợp lệ"); 
        }
    }

    // Cấp lại Token mới (Refresh Token)
    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest dto) {
        var user = await _userRepo.GetByEmailAsync(dto.Email);
        
        if (user == null || user.IsLocked == true) {
            return new AuthResponse(false, "Phiên đăng nhập không hợp lệ hoặc tài khoản bị khóa");
        }
        
        
        return await GenerateAuthResponse(user);
    }

    // Tạo cặp Access Token và Refresh Token
    private async Task<AuthResponse> GenerateAuthResponse(User user) {
        var token = CreateJwtToken(user);
        
        // Tạo Refresh Token ngẫu nhiên (chuỗi dài an toàn)
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        
        return new AuthResponse(true, "Xác thực thành công", token, refreshToken);
    }

    // Tạo chuỗi JWT (Mã hóa Role và Email)
    private string CreateJwtToken(User user) {
        var claims = new[] { 
            new Claim(ClaimTypes.Email, user.Email), 
            new Claim(ClaimTypes.Role, user.Role ?? "Customer"), 
            new Claim("UserId", user.Id.ToString()),
            new Claim("FullName", user.FullName)
        };

        var keyString = _config["Jwt:Key"];
        if (string.IsNullOrEmpty(keyString) || keyString.Length < 32) {
            throw new Exception("Lỗi bảo mật: Jwt:Key trong appsettings.json phải có ít nhất 32 ký tự!");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(1), // Token có hạn trong 1 giờ
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}