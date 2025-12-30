using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class CartItem
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int ProductId { get; set; }

    public int ProductVariantId { get; set; }

    public int? Quantity { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual ProductVariant ProductVariant { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
