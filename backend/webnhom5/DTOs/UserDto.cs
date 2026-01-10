using System.ComponentModel.DataAnnotations;

namespace webnhom5.DTOs
{
    // --- 1. USER & ADDRESS DTOs ---
    public class UserResponseDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? PhoneNumber { get; set; }
        public string Role { get; set; } = null!;
        public bool IsLocked { get; set; }
        public string? GoogleId { get; set; }
    }

    public class CreateAddressDto
    {
        [Required] public string ContactName { get; set; } = null!;
        [Required] public string ContactPhone { get; set; } = null!;
        [Required] public string AddressLine { get; set; } = null!;
        [Required] public string Province { get; set; } = null!;
        [Required] public string District { get; set; } = null!;
        [Required] public string Ward { get; set; } = null!;
        public bool IsDefault { get; set; } // <--- Logic quan trọng nằm ở đây
    }

    public class AddressResponseDto : CreateAddressDto
    {
        public int Id { get; set; }
    }

    public class UpdateUserRoleDto
    {
        [Required] 
        [RegularExpression("Admin|Staff|Customer", ErrorMessage = "Role phải là Admin, Staff hoặc Customer")]
        public string Role { get; set; } = null!;
    }

    // --- 2. MARKETING DTOs ---
    public class CreatePromotionDto
    {
        [Required] public string Name { get; set; } = null!;
        [Required] public string DiscountType { get; set; } = "PERCENTAGE"; // hoặc FIXED_AMOUNT
        [Required] public decimal DiscountValue { get; set; }
        [Required] public DateTime StartDate { get; set; }
        [Required] public DateTime EndDate { get; set; }
        public int Priority { get; set; }
        public bool IsActive { get; set; } = true;

        // Danh sách điều kiện (VD: Mua trên 500k)
        public List<PromotionConditionDto> Conditions { get; set; } = new List<PromotionConditionDto>();
    }

    public class PromotionConditionDto
    {
        public string Field { get; set; } = null!; // "TotalAmount", "CategoryId", "Quantity"
        public string Operator { get; set; } = null!; // "GREATER_THAN", "EQUALS", "IN"
        public string Value { get; set; } = null!;
    }

    public class GenerateCouponDto
    {
        public int PromotionId { get; set; }
        public int Quantity { get; set; } // Số lượng voucher muốn tạo
        public string Prefix { get; set; } = "CODE"; // Tiền tố (VD: TET2025)
    }

    // DTO trả về kết quả tính toán khuyến mãi (Promotion Engine)
    public class PromotionCalculationResult
    {
        public decimal OriginalTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalTotal { get; set; }
        public string? AppliedPromotionName { get; set; }
    }
}