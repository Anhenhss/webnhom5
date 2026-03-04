using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using webnhom5.Data;
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public class MarketingService : IMarketingService
    {
        private readonly FashionDbContext _context;

        public MarketingService(FashionDbContext context)
        {
            _context = context;
        }

        public async Task<List<Promotion>> GetAllPromotionsAsync()
        {
            return await _context.Promotions
                .Include(p => p.PromotionConditions)
                .OrderByDescending(p => p.Priority)
                .ToListAsync();
        }

        public async Task<Promotion> CreatePromotionAsync(CreatePromotionDto dto)
        {
            var promo = new Promotion
            {
                Name = dto.Name,
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                IsActive = dto.IsActive,
                Priority = dto.Priority
            };

            _context.Promotions.Add(promo);
            await _context.SaveChangesAsync(); 

            if (dto.Conditions != null && dto.Conditions.Any())
            {
                foreach (var cond in dto.Conditions)
                {
                    _context.PromotionConditions.Add(new PromotionCondition
                    {
                        PromotionId = promo.Id,
                        Field = cond.Field,
                        Operator = cond.Operator,
                        Value = cond.Value
                    });
                }
                await _context.SaveChangesAsync();
            }

            return promo;
        }

        public async Task GenerateCouponsAsync(GenerateCouponDto dto)
        {
            var userIds = await _context.Users.Select(u => u.Id).ToListAsync();
            var targetUsers = userIds.Take(dto.Quantity).ToList();
            
            foreach (var uid in targetUsers)
            {
                var code = dto.Prefix + "-" + Guid.NewGuid().ToString().Substring(0, 6).ToUpper();
                _context.Coupons.Add(new Coupon
                {
                    Code = code,
                    UserId = uid,
                    PromotionId = dto.PromotionId,
                    IsUsed = false,
                    ExpiryDate = DateTime.Now.AddMonths(1),
                    CreatedAt = DateTime.Now
                });
            }
            await _context.SaveChangesAsync();
        }

        // --- SỬA LỖI TẠI ĐÂY ---
        public async Task<PromotionCalculationResult> CalculateDiscountAsync(List<CartItem> cartItems) // Sửa CartItems -> CartItem
        {
            // Xử lý giá trị Nullable bằng cách sử dụng ?? 0
            decimal totalCartValue = cartItems.Sum(c => 
                ((c.Product?.Price ?? 0) + (c.ProductVariant?.PriceModifier ?? 0)) * (c.Quantity ?? 0));
            
            var result = new PromotionCalculationResult
            {
                OriginalTotal = totalCartValue,
                FinalTotal = totalCartValue,
                DiscountAmount = 0
            };

            var activePromos = await _context.Promotions
                .Include(p => p.PromotionConditions)
                .Where(p => p.IsActive == true 
                            && p.StartDate <= DateTime.Now 
                            && p.EndDate >= DateTime.Now)
                .OrderByDescending(p => p.Priority)
                .ToListAsync();

            foreach (var promo in activePromos)
            {
                // Sửa PromotionCondition -> PromotionConditions (số nhiều theo chuẩn DBContext)
                bool isEligible = CheckConditions(promo.PromotionConditions.ToList(), cartItems, totalCartValue);
                
                if (isEligible)
                {
                    decimal discount = 0;
                    if (promo.DiscountType == "PERCENTAGE")
                    {
                        discount = totalCartValue * (promo.DiscountValue / 100);
                    }
                    else if (promo.DiscountType == "FIXED_AMOUNT")
                    {
                        discount = promo.DiscountValue;
                    }

                    result.DiscountAmount = discount;
                    result.FinalTotal = totalCartValue - discount;
                    result.AppliedPromotionName = promo.Name;
                    
                    break; 
                }
            }

            if (result.FinalTotal < 0) result.FinalTotal = 0;
            return result;
        }

        private bool CheckConditions(List<PromotionCondition> conditions, List<CartItem> cartItems, decimal totalValue)
        {
            if (conditions == null || !conditions.Any()) return true;

            foreach (var cond in conditions)
            {
                bool pass = false;
                switch (cond.Field)
                {
                    case "TotalAmount":
                        if (decimal.TryParse(cond.Value, out decimal targetVal))
                        {
                            if (cond.Operator == "GREATER_THAN" && totalValue > targetVal) pass = true;
                            if (cond.Operator == "GREATER_OR_EQUAL" && totalValue >= targetVal) pass = true;
                        }
                        break;

                    case "CategoryId":
                        if (int.TryParse(cond.Value, out int targetCatId))
                        {
                            if (cond.Operator == "IN" && cartItems.Any(c => c.Product?.CategoryId == targetCatId)) pass = true;
                        }
                        break;
                    
                    default:
                        pass = true; 
                        break;
                }

                if (!pass) return false; 
            }
            return true;
        }
    }
}