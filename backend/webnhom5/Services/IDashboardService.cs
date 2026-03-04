using System.Collections.Generic;
using System.Threading.Tasks;
using webnhom5.DTOs;

namespace webnhom5.Services
{
    public interface IDashboardService
    {
        // timeFilter: "day", "week", "month", "year"
        Task<DashboardOverviewDto> GetOverviewAsync(string timeFilter);
        
        // Lấy danh sách sản phẩm bán chạy nhất
        Task<List<TopProductDto>> GetTopProductsAsync(int limit = 5);
    }
}