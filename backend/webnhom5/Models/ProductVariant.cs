using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace webnhom5.Models;

public partial class ProductVariant
{
    [Key]
    public int Id { get; set; }

    public int ProductId { get; set; }

    public int ColorId { get; set; }

    public int SizeId { get; set; }

    [Required]
    [StringLength(50)]
    public string Sku { get; set; } = null!;

    [Column(TypeName ="decimal(18,2)")]
    public decimal Price {get; set;}

    public int StockQuantity {get; set;}

    public int? Quantity { get; set; }

    public decimal? PriceModifier { get; set; }

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual MasterColor Color { get; set; } = null!;

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    public virtual Product Product { get; set; } = null!;

    public virtual MasterSize Size { get; set; } = null!;
}
