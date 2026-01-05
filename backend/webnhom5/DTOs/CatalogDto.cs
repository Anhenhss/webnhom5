namespace webnhom5.DTOs
{
    // Cấu trúc cây danh mục
    public class CategoryNodeDTO {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<CategoryNodeDTO> Children { get; set; } = new();
    }

    // Nhận dữ liệu tạo sản phẩm (kèm file ảnh)
    public class ProductCreateDTO {
        public string Name { get; set; }
        public int CategoryId { get; set; }
        public string Description { get; set; }
        public List<IFormFile> Images { get; set; }
    }

    // Quản lý biến thể
    public class VariantDTO {
        public int ProductId { get; set; }
        public int ColorId { get; set; }
        public int SizeId { get; set; }
        public string Sku { get; set; }
        public decimal Price { get; set; } // Giá riêng của biến thể
        public int StockQuantity { get; set; } // Tồn kho riêng của biến thể
    }
}