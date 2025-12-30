using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class Coupon
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;

    public int UserId { get; set; }

    public int PromotionId { get; set; }

    public bool? IsUsed { get; set; }

    public DateTime ExpiryDate { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Promotion Promotion { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
