using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using webnhom5.Data;
using webnhom5.DTOs;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Services
{
    public class AuthService : IAuthService
    {
        private readonly FashionDbContext _context;
        private readonly IGenericRepository<User> _userRepository; // Dùng User (số ít)
        private readonly IConfiguration _configuration;

        public AuthService(FashionDbContext context, IGenericRepository<User> userRepository, IConfiguration configuration)
        {
            _context = context;
            _userRepository = userRepository;
            _configuration = configuration;
        }

        public async Task<User> RegisterAsync(RegisterDto dto)
        {
            // _context.Users là tên bảng của thầy, u => u là kiểu User. Khớp!
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                throw new Exception("Email đã tồn tại.");

            var newUser = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Customer",
                IsLocked = false,
                CreatedAt = DateTime.Now
            };

            await _userRepository.AddAsync(newUser);
            await _context.SaveChangesAsync();
            return newUser;
        }

        public async Task<TokenResponseDto?> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            
            if (user == null || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return null;

            if (user.IsLocked == true) throw new Exception("Tài khoản bị khóa.");

            return await GenerateTokenPairAsync(user);
        }

        public async Task<TokenResponseDto> GoogleLoginAsync(GoogleLoginDto googleDto)
        {
            GoogleJsonWebSignature.Payload payload;
            try {
                payload = await GoogleJsonWebSignature.ValidateAsync(googleDto.IdToken);
            } catch {
                throw new Exception("Google Token không hợp lệ.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user != null) {
                if (string.IsNullOrEmpty(user.GoogleId)) {
                    user.GoogleId = payload.Subject;
                    await _userRepository.UpdateAsync(user);
                }
            } else {
                user = new User {
                    Email = payload.Email,
                    FullName = payload.Name,
                    GoogleId = payload.Subject,
                    PasswordHash = null,
                    Role = "Customer",
                    IsLocked = false,
                    CreatedAt = DateTime.Now,
                    AvatarUrl = payload.Picture
                };
                await _userRepository.AddAsync(user);
            }

            await _context.SaveChangesAsync();
            return await GenerateTokenPairAsync(user);
        }

        public async Task<TokenResponseDto?> RefreshTokenAsync(RefreshTokenDto tokenDto)
        {
            var principal = GetPrincipalFromExpiredToken(tokenDto.AccessToken);
            if (principal == null) return null;

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) return null;

            var user = await _userRepository.GetByIdAsync(int.Parse(userIdClaim.Value));

            if (user == null || user.RefreshToken != tokenDto.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.Now)
                return null;

            return await GenerateTokenPairAsync(user);
        }

        private async Task<TokenResponseDto> GenerateTokenPairAsync(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);
            var durationMinutes = jwtSettings.GetValue<int>("DurationMinutes", 60);

            var claims = new List<Claim> {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName ?? ""),
                new Claim(ClaimTypes.Role, user.Role ?? "Customer")
            };

            var tokenDescriptor = new SecurityTokenDescriptor {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(durationMinutes),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var accessToken = tokenHandler.CreateToken(tokenDescriptor);
            var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
            
            await _userRepository.UpdateAsync(user); 
            await _context.SaveChangesAsync();

            return new TokenResponseDto {
                AccessToken = tokenHandler.WriteToken(accessToken),
                RefreshToken = refreshToken,
                ExpiresInMinutes = durationMinutes
            };
        }

        private ClaimsPrincipal? GetPrincipalFromExpiredToken(string? token)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var tokenValidationParameters = new TokenValidationParameters {
                ValidateAudience = false,
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!)),
                ValidateLifetime = false 
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            try {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
                if (securityToken is not JwtSecurityToken jwtSecurityToken || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                    return null;
                return principal;
            } catch { return null; }
        }
    }
}