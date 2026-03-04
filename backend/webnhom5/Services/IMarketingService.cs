using System.Collections.Generic; // Bắt buộc cho List<>
using System.Threading.Tasks;    // Bắt buộc cho Task<>
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    // Service cho Promotion & Coupon
    public interface IMarketingService
    {
        Task<List<Promotion>> GetAllPromotionsAsync();
        
        Task<Promotion> CreatePromotionAsync(CreatePromotionDto dto);
        
        Task GenerateCouponsAsync(GenerateCouponDto dto);
        
        // PROMOTION ENGINE: Logic tính giá
        // Đã sửa CartItems thành CartItem để khớp với Model số ít
        Task<PromotionCalculationResult> CalculateDiscountAsync(List<CartItem> cartItems);
    }
}