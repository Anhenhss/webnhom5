using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Username { get; set; }

    public string? PasswordHash { get; set; }

    public string Email { get; set; } = null!;

    public string? GoogleId { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public string FullName { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public string? AvatarUrl { get; set; }

    public string? Role { get; set; }

    public bool? IsLocked { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }

    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();

    public virtual ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<ProductReview> ProductReviews { get; set; } = new List<ProductReview>();

    public virtual ICollection<UserAddress> UserAddresses { get; set; } = new List<UserAddress>();
}
