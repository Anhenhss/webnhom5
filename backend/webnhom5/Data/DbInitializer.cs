using BCrypt.Net;
using webnhom5.Models;

namespace webnhom5.Data
{
    public static class DbInitializer
    {
        public static void Seed(FashionDbContext context)
        {
            // CHỈ TẠO DỮ LIỆU TÀI KHOẢN (Nếu bảng Users đang trống)
            if (!context.Users.Any())
            {
                // Tạo mật khẩu mã hóa chung là "123456" cho cả 3 tài khoản
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");
                
                var users = new List<User>
                {
                    new User 
                    { 
                        FullName = "Admin", 
                        Email = "admin@webnhom5.com", 
                        PasswordHash = passwordHash, 
                        Role = "Admin", 
                        IsLocked = false,
                        CreatedAt = DateTime.Now 
                    },
                    new User 
                    { 
                        FullName = "Nhân Viên", 
                        Email = "staff@webnhom5.com", 
                        PasswordHash = passwordHash, 
                        Role = "Staff", 
                        IsLocked = false,
                        CreatedAt = DateTime.Now 
                    },
                    new User 
                    { 
                        FullName = "Khách Hàng Mẫu", 
                        Email = "khach@webnhom5.com", 
                        PasswordHash = passwordHash, 
                        Role = "Customer", 
                        IsLocked = false,
                        CreatedAt = DateTime.Now 
                    }
                };
                
                context.Users.AddRange(users);
                context.SaveChanges();
            }
            
            // TUYỆT ĐỐI KHÔNG VIẾT THÊM CODE TẠO SẢN PHẨM Ở DƯỚI NÀY NỮA
        }
    }
}