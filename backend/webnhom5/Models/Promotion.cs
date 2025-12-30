using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class Promotion
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string DiscountType { get; set; } = null!;

    public decimal DiscountValue { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public bool? IsActive { get; set; }

    public int? Priority { get; set; }

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();

    public virtual ICollection<ProductPromotion> ProductPromotions { get; set; } = new List<ProductPromotion>();

    public virtual ICollection<PromotionCondition> PromotionConditions { get; set; } = new List<PromotionCondition>();
}
