using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using webnhom5.Data;
using webnhom5.DTOs;

namespace webnhom5.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly FashionDbContext _context;

        public DashboardService(FashionDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardOverviewDto> GetOverviewAsync(string timeFilter)
        {
            // 1. Xác định khoảng thời gian cần thống kê
            int days = timeFilter.ToLower() switch
            {
                "day" => 1,
                "month" => 30,
                "year" => 365,
                _ => 7 // mặc định là week
            };
            var fromDate = DateTime.Now.AddDays(-days);

            // 2. Lấy dữ liệu Đơn hàng (Chỉ tính đơn thành công Status = 3)
            var completedOrders = await _context.Orders
                .Where(o => o.Status == 3 && o.OrderDate >= fromDate)
                .ToListAsync();

            decimal totalRevenue = completedOrders.Sum(o => o.FinalAmount);
            int totalOrders = completedOrders.Count;

            // 3. Đếm tổng số User hệ thống
            int totalUsers = await _context.Users.CountAsync();

            // 4. Đếm số đơn hàng chưa xử lý (Status = 0: Pending)
            int pendingOrdersCount = await _context.Orders
                .CountAsync(o => o.Status == 0);

            // 5. Đếm số sản phẩm sắp hết hàng (Tổng tồn kho của các biến thể <= 5)
            // Lưu ý: EF Core sẽ dịch đoạn này thành lệnh SUM trong SQL rất tối ưu
            int lowStockCount = await _context.Products
                .Where(p => p.IsActive == true)
                .CountAsync(p => p.ProductVariants.Sum(v => v.Quantity) <= 5);

            return new DashboardOverviewDto
            {
                TotalRevenue = totalRevenue,
                TotalOrders = totalOrders,
                TotalUsers = totalUsers,
                TotalVisitors = 0, // Tính năng Tracking mở rộng sau
                PendingOrdersCount = pendingOrdersCount,
                LowStockProductsCount = lowStockCount
            };
        }

        public async Task<List<TopProductDto>> GetTopProductsAsync(int limit = 5)
        {
            // Bước 1: Gom nhóm OrderDetails từ các đơn hàng ĐÃ HOÀN THÀNH (Status = 3)
            var topProductsQuery = await _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.ProductVariant)
                    .ThenInclude(v => v.Product)
                .Where(od => od.Order.Status == 3) // Lọc đơn thành công
                .GroupBy(od => new 
                { 
                    ProductId = od.ProductVariant.ProductId, 
                    ProductName = od.ProductVariant.Product.Name, 
                    Thumbnail = od.ProductVariant.Product.Thumbnail 
                })
                .Select(g => new TopProductDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    Thumbnail = g.Key.Thumbnail,
                    SoldCount = g.Sum(od => od.Quantity),
                    Revenue = g.Sum(od => od.Quantity * od.UnitPrice)
                })
                .OrderByDescending(p => p.SoldCount)
                .Take(limit)
                .ToListAsync();

            // Bước 2: Lấy thông tin TotalStock hiện tại cho các sản phẩm lọt top
            var productIds = topProductsQuery.Select(p => p.ProductId).ToList();
            
            var stocks = await _context.ProductVariants
                .Where(v => productIds.Contains(v.ProductId)) // Đã sửa lỗi CS0019 (Bỏ ?? 0)
                .GroupBy(v => v.ProductId)
                .Select(g => new 
                { 
                    ProductId = g.Key, 
                    TotalStock = g.Sum(v => v.Quantity ?? 0) // Giữ lại cho Quantity nếu nó là kiểu nullable (int?)
                })
                .ToDictionaryAsync(x => x.ProductId, x => x.TotalStock);

            // Bước 3: Gắn Stock vào kết quả trả về
            foreach (var p in topProductsQuery)
            {
                p.TotalStock = stocks.ContainsKey(p.ProductId) ? stocks[p.ProductId] : 0;
            }

            return topProductsQuery; 
        }
    }
}