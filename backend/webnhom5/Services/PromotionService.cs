using System;
using System.Collections.Generic;
using System.Linq;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Services
{
    public class PromotionService
    {
        private readonly IPromotionRepository _promotionRepo;

        public PromotionService(IPromotionRepository promotionRepo)
{
    _promotionRepo = promotionRepo;
}


        public async Task<decimal> ApplyPromotion(List<CartItem> cartItems)
        {
            // Tính tổng tiền giỏ hàng
            decimal total = cartItems.Sum(item => item.Price * item.Quantity);

            // Lấy danh sách promotion hợp lệ
            var promotions = (await _promotionRepo.GetAllAsync())
                .Where(p =>
                    p.IsActive &&
                    p.StartDate <= DateTime.Now &&
                    p.EndDate >= DateTime.Now
                )
                .OrderBy(p => p.Priority);

            // Áp dụng promotion có độ ưu tiên cao nhất
            foreach (var promo in promotions)
            {
                if (IsMatchCondition(promo, total))
                {
                    if (promo.IsPercentage)
                    {
                        return total - (total * promo.DiscountValue / 100);
                    }
                    else
                    {
                        return total - promo.DiscountValue;
                    }
                }
            }

            // Không có promotion phù hợp
            return total;
        }

        private bool IsMatchCondition(Promotion promotion, decimal total)
        {
            // Không có điều kiện → áp dụng luôn
            if (promotion.PromotionConditions == null ||
                !promotion.PromotionConditions.Any())
            {
                return true;
            }

            foreach (var condition in promotion.PromotionConditions)
            {
                if (condition.Field == "TotalAmount" &&
                    condition.Operator == ">=" &&
                    total < condition.Value)
                {
                    return false;
                }
            }

            return true;
        }
    }
}
