namespace webnhom5.DTOs
{
    // DTO trả về 4 thẻ thống kê và cảnh báo
    public class DashboardOverviewDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int TotalUsers { get; set; }
        public int TotalVisitors { get; set; } // Có thể fake số hoặc làm bảng Tracking sau
        public int PendingOrdersCount { get; set; } // Số đơn đang chờ duyệt
        public int LowStockProductsCount { get; set; } // Số sản phẩm tồn kho <= 5
    }

    // DTO trả về riêng cho Top sản phẩm (nhẹ hơn ProductResponseDto)
    public class TopProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = null!;
        public string? Thumbnail { get; set; }
        public int SoldCount { get; set; }
        public decimal Revenue { get; set; } // Doanh thu mang lại
        public int TotalStock { get; set; }
    }
}