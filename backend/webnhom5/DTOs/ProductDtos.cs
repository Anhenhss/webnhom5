using System.ComponentModel.DataAnnotations;

namespace webnhom5.DTOs
{
    // --- 1. CATEGORY DTOs (Giữ nguyên) ---
    public class CategoryTreeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!;
        public List<CategoryTreeDto> Children { get; set; } = new List<CategoryTreeDto>();
    }

    public class CreateCategoryDto
    {
        [Required] public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
    }

    // --- 2. PRODUCT DTOs ---
    public class CreateProductDto
    {
        [Required] public string Name { get; set; } = null!;
        [Required] public decimal Price { get; set; }
        public string? Description { get; set; }
        [Required] public int CategoryId { get; set; }
        
        public IFormFile? ThumbnailFile { get; set; } 
        public List<IFormFile>? GalleryFiles { get; set; }
    }

    // DTO cho việc cập nhật sản phẩm
    public class UpdateProductDto
    {
        [Required] public string Name { get; set; } = null!;
        [Required] public decimal Price { get; set; }
        public string? Description { get; set; }
        [Required] public int CategoryId { get; set; }
        public bool IsActive { get; set; } // Cho phép ẩn/hiện sản phẩm

        // Nếu người dùng chọn ảnh mới thì gửi lên, không thì để null
        public IFormFile? ThumbnailFile { get; set; }
        // Các ảnh phụ muốn thêm mới
        public List<IFormFile>? NewGalleryFiles { get; set; }
    }

    public class ProductResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Slug { get; set; } = null!; // Thêm Slug để frontend dùng
        public decimal Price { get; set; }
        public string? Description { get; set; } // Thêm Description
        public string? Thumbnail { get; set; }
        public int CategoryId { get; set; } // Thêm ID danh mục
        public string CategoryName { get; set; } = null!;
        public bool? IsActive { get; set; }
        public List<string> ImageUrls { get; set; } = new List<string>();
        public List<VariantResponseDto> Variants { get; set; } = new List<VariantResponseDto>(); // Trả về kèm biến thể
    }

    // --- 3. VARIANT DTOs ---
    public class CreateVariantDto
    {
        [Required] public int ProductId { get; set; }
        [Required] public int ColorId { get; set; }
        [Required] public int SizeId { get; set; }
        [Required] public string Sku { get; set; } = null!;
        [Range(0, int.MaxValue)] public int Quantity { get; set; }
        public decimal PriceModifier { get; set; } = 0;
    }

    // DTO cập nhật biến thể
    public class UpdateVariantDto
    {
        [Required] public string Sku { get; set; } = null!;
        [Range(0, int.MaxValue)] public int Quantity { get; set; }
        public decimal PriceModifier { get; set; }
    }

    public class VariantResponseDto
    {
        public int Id { get; set; }
        public int ColorId { get; set; }
        public int SizeId { get; set; }
        public string ColorName { get; set; } = null!;
        public string SizeName { get; set; } = null!;
        public string Sku { get; set; } = null!;
        public int Quantity { get; set; }
        public decimal PriceModifier { get; set; }
    }
}