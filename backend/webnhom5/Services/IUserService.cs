using System.Collections.Generic; // Bắt buộc cho List<>
using System.Threading.Tasks;    // Bắt buộc cho Task<>
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    // Service cho User & Address
    public interface IUserService
    {
        // --- ADMIN QUẢN LÝ USER ---
        // Thêm tham số search và phân trang (pagination) là rất tốt cho hiệu năng
        Task<List<UserResponseDto>> GetAllUsersAsync(string? search, int page, int pageSize);
        
        // ---> BỔ SUNG DÒNG NÀY:
        Task<UserResponseDto?> GetUserByIdAsync(int id);
        Task LockUserAsync(int userId, bool isLocked);
        
        Task UpdateRoleAsync(int userId, string role);

        // --- USER QUẢN LÝ ĐỊA CHỈ ---
        Task<List<AddressResponseDto>> GetMyAddressesAsync(int userId);
        
        // Trả về UserAddress để sau khi thêm có thể lấy ngay ID hoặc dữ liệu mới
        Task<UserAddress> AddAddressAsync(int userId, CreateAddressDto dto); 
        
        Task DeleteAddressAsync(int userId, int addressId);
    }
}