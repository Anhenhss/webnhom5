using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace webnhom5.Models
{
    // 1. NHÓM QUẢN TRỊ NGƯỜI DÙNG (IDENTITY)
    // Kế thừa IdentityUser để tận dụng sẵn các trường: UserName, Email, PasswordHash, PhoneNumber...
    public class ApplicationUser : IdentityUser
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(255)]
        public string? AvatarUrl { get; set; }

        public bool IsActive { get; set; } = true;

        // Quan hệ: Một User có nhiều địa chỉ và đơn hàng
        public virtual ICollection<Address> Addresses { get; set; }
        public virtual ICollection<Order> Orders { get; set; }
    }

    public class Address
    {
        [Key]
        public int Id { get; set; }

        // Liên kết với User (Identity)
        [Required]
        public string UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual ApplicationUser User { get; set; }

        [Required]
        [MaxLength(100)]
        public string RecipientName { get; set; } // Tên người nhận (có thể khác tên chủ TK)

        [Required]
        [MaxLength(15)]
        public string RecipientPhone { get; set; }

        [Required]
        [MaxLength(255)]
        public string StreetAddress { get; set; } // Số nhà, tên đường

        [Required]
        [MaxLength(100)]
        public string City { get; set; }

        [Required]
        [MaxLength(100)]
        public string District { get; set; }

        public bool IsDefault { get; set; } = false; // Địa chỉ mặc định
    }

    // 2. NHÓM SẢN PHẨM & BIẾN THỂ (CORE)
    public class Category
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public string? Description { get; set; }

        public int? ParentId { get; set; } // Để làm danh mục đa cấp (Ví dụ: Nam -> Áo -> Áo Thun)
        [ForeignKey("ParentId")]
        public virtual Category? ParentCategory { get; set; }

        public virtual ICollection<Product> Products { get; set; }
    }

    public class Product
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        public string? Description { get; set; }

        // Giá niêm yết (Giá gốc để hiển thị)
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        public int CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public virtual Category Category { get; set; }

        public bool IsActive { get; set; } = true; // Ẩn/Hiện sản phẩm
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Quan hệ
        public virtual ICollection<ProductImage> Images { get; set; }
        public virtual ICollection<ProductVariant> Variants { get; set; }
    }

    public class ProductImage
    {
        [Key]
        public int Id { get; set; }
        public int ProductId { get; set; }
        [ForeignKey("ProductId")]
        public virtual Product Product { get; set; }

        [Required]
        public string ImageUrl { get; set; }
        public bool IsThumbnail { get; set; } = false; // Ảnh đại diện
    }

    // Thuộc tính: Kích thước
    public class Size
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(10)]
        public string Name { get; set; } // S, M, L, XL, 38, 39...
    }

    // Thuộc tính: Màu sắc
    public class Color
    {
        [Key]
        public int Id { get; set; }
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } // Red, Blue, Navy
        [MaxLength(10)]
        public string HexCode { get; set; } // #FF0000
    }

    // SKU - ĐÂY LÀ BẢNG QUAN TRỌNG NHẤT ĐỂ QUẢN LÝ TỒN KHO
    public class ProductVariant
    {
        [Key]
        public int Id { get; set; }

        public int ProductId { get; set; }
        [ForeignKey("ProductId")]
        public virtual Product Product { get; set; }

        public int SizeId { get; set; }
        [ForeignKey("SizeId")]
        public virtual Size Size { get; set; }

        public int ColorId { get; set; }
        [ForeignKey("ColorId")]
        public virtual Color Color { get; set; }

        // QUẢN LÝ TỒN KHO TẠI ĐÂY
        public int StockQuantity { get; set; } 

        // Nếu màu/size này đắt hơn hoặc rẻ hơn giá gốc (Ví dụ: Size XXL +20k)
        [Column(TypeName = "decimal(18,2)")]
        public decimal? PriceModifier { get; set; } 
    }

    // 3. NHÓM ĐƠN HÀNG 
    public class Order
    {
        [Key]
        public int Id { get; set; }

        public string UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual ApplicationUser User { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; } // Tổng tiền sau khi trừ KM

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } // Pending, Confirmed, Shipping, Completed, Cancelled

        // Lưu cứng địa chỉ giao hàng tại thời điểm đặt (Tránh việc User sửa Profile làm sai lệch đơn cũ)
        [Required]
        public string ShippingAddress { get; set; } 
        [Required]
        public string RecipientName { get; set; }
        [Required]
        public string RecipientPhone { get; set; }

        public string PaymentMethod { get; set; } // COD, Banking

        public virtual ICollection<OrderDetail> OrderDetails { get; set; }
    }

    public class OrderDetail
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        [ForeignKey("OrderId")]
        public virtual Order Order { get; set; }

        // Liên kết tới Variant (SKU) chứ không phải Product chung chung
        public int ProductVariantId { get; set; }
        [ForeignKey("ProductVariantId")]
        public virtual ProductVariant ProductVariant { get; set; }

        // Lưu cứng Tên và Giá tại thời điểm mua (Snapshot)
        [Required]
        public string ProductName { get; set; } 
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; } 

        public int Quantity { get; set; }
    }
}