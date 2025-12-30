using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class Order
{
    public int Id { get; set; }

    public string OrderCode { get; set; } = null!;

    public int? UserId { get; set; }

    public DateTime? OrderDate { get; set; }

    public string ShippingName { get; set; } = null!;

    public string ShippingAddress { get; set; } = null!;

    public string ShippingPhone { get; set; } = null!;

    public decimal TotalAmount { get; set; }

    public decimal? DiscountAmount { get; set; }

    public string? CouponCode { get; set; }

    public decimal? ShippingFee { get; set; }

    public decimal FinalAmount { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public string? PaymentStatus { get; set; }

    public int? Status { get; set; }

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    public virtual ICollection<OrderStatusHistory> OrderStatusHistories { get; set; } = new List<OrderStatusHistory>();

    public virtual ICollection<ProductReview> ProductReviews { get; set; } = new List<ProductReview>();

    public virtual User? User { get; set; }
}
