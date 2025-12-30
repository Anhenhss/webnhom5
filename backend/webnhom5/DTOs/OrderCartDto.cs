using System.ComponentModel.DataAnnotations;

namespace webnhom5.DTOs
{
    // --- CART DTOs ---
    public class AddToCartDto
    {
        [Required] public int ProductId { get; set; }
        [Required] public int ProductVariantId { get; set; }
        [Required, Range(1, 100)] public int Quantity { get; set; }
    }

    public class CartItemResponseDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public string ProductImage { get; set; } = null!;
        public int ProductVariantId { get; set; }
        public string Size { get; set; } = null!;
        public string Color { get; set; } = null!;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public decimal Total => Price * Quantity;
        public int MaxStock { get; set; } // Để frontend biết max mà chọn
    }

    // --- ORDER & CHECKOUT DTOs ---
    public class CheckoutDto
    {
        [Required] public string ShippingName { get; set; } = null!;
        [Required] public string ShippingAddress { get; set; } = null!; // Nên gộp Tỉnh/Huyện/Xã + Đường
        [Required] public string ShippingPhone { get; set; } = null!;
        [Required] public string PaymentMethod { get; set; } = "COD"; // COD hoặc VNPAY
    }

    public class OrderResponseDto
    {
        public int Id { get; set; }
        public string OrderCode { get; set; } = null!;
        public DateTime OrderDate { get; set; }
        public string Status { get; set; } = null!;
        public string PaymentMethod { get; set; } = null!;
        public string ShippingName { get; set; } = null!;
        public string ShippingAddress { get; set; } = null!;
        public decimal TotalAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public List<OrderDetailDto> OrderDetails { get; set; } = new List<OrderDetailDto>();
        public List<OrderStatusHistoryDto> History { get; set; } = new List<OrderStatusHistoryDto>();
    }

    public class OrderDetailDto
    {
        public string ProductName { get; set; } = null!; // Snapshot Data
        public string Sku { get; set; } = null!;        // Snapshot Data
        public string? Thumbnail { get; set; }          // Snapshot Data
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Total => Quantity * UnitPrice;
    }

    public class OrderStatusHistoryDto
    {
        public string StatusName { get; set; } = null!;
        public string? Note { get; set; }
        public DateTime Timestamp { get; set; }
        public string? UpdatedBy { get; set; }
    }

    // --- ADMIN ACTION DTOs ---
    public class UpdateOrderStatusDto
    {
        [Required] public int NewStatus { get; set; } // 0: Pending, 1: Confirmed...
        public string? Note { get; set; }
    }

    public class RevenueStatisticDto
    {
        public string Date { get; set; } = null!; // Ngày hoặc Tháng
        public int TotalOrders { get; set; }
        public decimal TotalRevenue { get; set; }
    }
}