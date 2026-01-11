using Microsoft.EntityFrameworkCore;
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

        // 1. ADMIN USER MANAGEMENT (QUẢN LÝ NGƯỜI DÙNG)

        // Lấy danh sách User (Có tìm kiếm và phân trang)
        public async Task<List<UserResponseDto>> GetAllUsersAsync(string? search, int page, int pageSize)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                // Tìm theo Email hoặc Tên
                query = query.Where(u => u.Email.Contains(search) || u.FullName.Contains(search));
            }

            return await query
                .OrderByDescending(u => u.CreatedAt) // Mới nhất lên đầu
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

        // Lấy chi tiết một User theo ID
        public async Task<UserResponseDto?> GetUserByIdAsync(int id)
        {
            var u = await _context.Users.FindAsync(id);
            if (u == null) return null;

            return new UserResponseDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Role = u.Role ?? "Customer",
                IsLocked = u.IsLocked ?? false,
                GoogleId = u.GoogleId
            };
        }

        // Khóa hoặc Mở khóa tài khoản
        public async Task LockUserAsync(int userId, bool isLocked)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Không tìm thấy người dùng");
            
            // Validation: Không cho phép tự khóa chính mình nếu là Admin (tránh tự sát)
            if (user.Role == "Admin" && isLocked) 
                throw new Exception("Không thể khóa tài khoản Quản trị viên (Admin)");

            user.IsLocked = isLocked;
            await _context.SaveChangesAsync();
        }

        // Cập nhật quyền (Role) cho User
        public async Task UpdateRoleAsync(int userId, string role)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("Không tìm thấy người dùng");
            
            // Validation: Role phải hợp lệ (Admin, Staff, Customer)
            var validRoles = new[] { "Admin", "Staff", "Customer" };
            if (!validRoles.Contains(role)) throw new Exception("Quyền hạn không hợp lệ");

            user.Role = role;
            await _context.SaveChangesAsync();
        }

        // 2. CLIENT ADDRESS MANAGEMENT (QUẢN LÝ ĐỊA CHỈ)
        // ==========================================

        // Lấy danh sách địa chỉ của User đang đăng nhập
        public async Task<List<AddressResponseDto>> GetMyAddressesAsync(int userId)
        {
            return await _context.UserAddresses
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault) // Địa chỉ mặc định lên đầu
                .ThenByDescending(a => a.Id)
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

        // Thêm địa chỉ mới (Có logic xử lý IsDefault bằng Transaction)
        public async Task<UserAddress> AddAddressAsync(int userId, CreateAddressDto dto)
        {
            // Bắt đầu Transaction để đảm bảo tính toàn vẹn dữ liệu
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Kiểm tra xem User đã có địa chỉ nào chưa
                bool hasAddress = await _context.UserAddresses.AnyAsync(a => a.UserId == userId);

                // Logic IsDefault:
                // 1. Nếu đây là địa chỉ đầu tiên -> Bắt buộc là Default
                // 2. Nếu người dùng chọn IsDefault = true -> Reset tất cả cái cũ về false
                if (!hasAddress)
                {
                    dto.IsDefault = true;
                }
                else if (dto.IsDefault)
                {
                    var oldDefaults = await _context.UserAddresses
                        .Where(a => a.UserId == userId && a.IsDefault == true)
                        .ToListAsync();
                    
                    foreach (var addr in oldDefaults)
                    {
                        addr.IsDefault = false;
                    }
                    _context.UserAddresses.UpdateRange(oldDefaults);
                    await _context.SaveChangesAsync();
                }

                // Tạo địa chỉ mới
                var newAddress = new UserAddress // Lưu ý: Tên class là UserAddress (số ít) do Scaffold
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

                // Commit Transaction: Lưu thay đổi vào DB
                await transaction.CommitAsync();
                return newAddress;
            }
            catch
            {
                // Nếu có lỗi -> Rollback (Hủy bỏ mọi thay đổi)
                await transaction.RollbackAsync();
                throw;
            }
        }

        // Xóa địa chỉ
        public async Task DeleteAddressAsync(int userId, int addressId)
        {
            var addr = await _context.UserAddresses
                .FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
                
            if (addr != null)
            {
                // Nếu xóa địa chỉ mặc định -> Cần cảnh báo hoặc tự động chọn cái khác (Optional)
                // Ở đây xóa thẳng
                _context.UserAddresses.Remove(addr);
                await _context.SaveChangesAsync();
            }
            else
            {
                throw new Exception("Không tìm thấy địa chỉ hoặc bạn không có quyền xóa");
            }
        }
    }
}