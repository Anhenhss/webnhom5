using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using webnhom5.Data;
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public class UserService : IUserService
    {
        private readonly FashionDbContext _context;

        public UserService(FashionDbContext context)
        {
            _context = context;
        }

        // --- QUẢN LÝ USER (DÀNH CHO ADMIN) ---
        public async Task<List<UserResponseDto>> GetAllUsersAsync(string? search, int page, int pageSize)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                // Sử dụng ToLower() để tìm kiếm không phân biệt chữ hoa chữ thường
                query = query.Where(u => u.Email.ToLower().Contains(search.ToLower()) 
                                      || u.FullName.ToLower().Contains(search.ToLower()));
            }

            return await query
                .OrderBy(u => u.Id) // Nên có OrderBy khi dùng Skip/Take
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new UserResponseDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    PhoneNumber = u.PhoneNumber,
                    Role = u.Role ?? "Customer",
                    IsLocked = u.IsLocked ?? false,
                    GoogleId = u.GoogleId
                }).ToListAsync();
        }

        public async Task LockUserAsync(int userId, bool isLocked)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("Không tìm thấy người dùng");
            
            if (user.Role == "Admin" && isLocked) 
                throw new InvalidOperationException("Không thể khóa tài khoản quản trị viên");

            user.IsLocked = isLocked;
            await _context.SaveChangesAsync();
        }

        public async Task UpdateRoleAsync(int userId, string role)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("Không tìm thấy người dùng");
            
            user.Role = role;
            await _context.SaveChangesAsync();
        }

        // --- QUẢN LÝ ĐỊA CHỈ (DÀNH CHO CLIENT) ---
        public async Task<List<AddressResponseDto>> GetMyAddressesAsync(int userId)
        {
            return await _context.UserAddresses
                .Where(a => a.UserId == userId)
                .Select(a => new AddressResponseDto
                {
                    Id = a.Id,
                    ContactName = a.ContactName,
                    ContactPhone = a.ContactPhone,
                    AddressLine = a.AddressLine,
                    Province = a.Province,
                    District = a.District,
                    Ward = a.Ward,
                    IsDefault = a.IsDefault ?? false
                }).ToListAsync();
        }

        public async Task<UserAddress> AddAddressAsync(int userId, CreateAddressDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Logic xử lý địa chỉ mặc định
                if (dto.IsDefault)
                {
                    var oldDefaults = await _context.UserAddresses
                        .Where(a => a.UserId == userId && a.IsDefault == true)
                        .ToListAsync();
                    
                    foreach (var addr in oldDefaults)
                    {
                        addr.IsDefault = false;
                    }
                }
                else
                {
                    // Nếu chưa có địa chỉ nào, địa chỉ này bắt buộc là mặc định
                    bool hasAddress = await _context.UserAddresses.AnyAsync(a => a.UserId == userId);
                    if (!hasAddress) dto.IsDefault = true;
                }

                // 2. Tạo Model mới (Sửa tên từ UserAddresses thành UserAddress)
                var newAddress = new UserAddress
                {
                    UserId = userId,
                    ContactName = dto.ContactName,
                    ContactPhone = dto.ContactPhone,
                    AddressLine = dto.AddressLine,
                    Province = dto.Province,
                    District = dto.District,
                    Ward = dto.Ward,
                    IsDefault = dto.IsDefault
                };

                _context.UserAddresses.Add(newAddress);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return newAddress;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task DeleteAddressAsync(int userId, int addressId)
        {
            var addr = await _context.UserAddresses
                .FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
                
            if (addr == null) return;

            // Nếu xóa địa chỉ đang là mặc định, hãy cảnh báo hoặc set địa chỉ khác làm mặc định
            if (addr.IsDefault == true)
            {
                // Tùy chọn: Tìm một địa chỉ khác của user này để set làm mặc định
            }

            _context.UserAddresses.Remove(addr);
            await _context.SaveChangesAsync();
        }
    }
}