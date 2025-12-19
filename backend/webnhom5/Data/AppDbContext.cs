using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using webnhom5.Models; // Import models từ thư mục Models

namespace webnhom5.Data
{
    // Kế thừa IdentityDbContext để có sẵn các bảng AspNetUsers, AspNetRoles...
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Address> Addresses { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ProductImage> ProductImages { get; set; }
        public DbSet<Size> Sizes { get; set; }
        public DbSet<Color> Colors { get; set; }
        public DbSet<ProductVariant> ProductVariants { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Cấu hình các ràng buộc Unique hoặc Composite Key nếu cần
            
            // Cấu hình bảng ProductVariant để tránh trùng lặp cặp (Product + Size + Color)
            // Tức là: Một sản phẩm không thể có 2 dòng cùng là "Áo A - Size M - Màu Đỏ"
            builder.Entity<ProductVariant>()
                .HasIndex(v => new { v.ProductId, v.SizeId, v.ColorId })
                .IsUnique();
            
            // Đổi tên các bảng Identity mặc định cho gọn (Tùy chọn - Giúp DB nhìn sạch sẽ hơn)
            builder.Entity<ApplicationUser>().ToTable("Users");
            builder.Entity<IdentityRole>().ToTable("Roles");
            builder.Entity<IdentityUserRole<string>>().ToTable("UserRoles");
            builder.Entity<IdentityUserClaim<string>>().ToTable("UserClaims");
            builder.Entity<IdentityUserLogin<string>>().ToTable("UserLogins");
            builder.Entity<IdentityRoleClaim<string>>().ToTable("RoleClaims");
            builder.Entity<IdentityUserToken<string>>().ToTable("UserTokens");
        }
    }
}