using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using webnhom5.Models;

namespace webnhom5.Data;

public partial class FashionDbContext : DbContext
{
    public FashionDbContext(DbContextOptions<FashionDbContext> options) : base(options) { }

    public virtual DbSet<Article> Articles { get; set; }
    public virtual DbSet<ArticleCategory> ArticleCategories { get; set; }
    public virtual DbSet<CartItem> CartItems { get; set; }
    public virtual DbSet<Category> Categories { get; set; }
    public virtual DbSet<Coupon> Coupons { get; set; }
    public virtual DbSet<MasterColor> MasterColors { get; set; }
    public virtual DbSet<MasterSize> MasterSizes { get; set; }
    public virtual DbSet<Notification> Notifications { get; set; }
    public virtual DbSet<Order> Orders { get; set; }
    public virtual DbSet<OrderDetail> OrderDetails { get; set; }
    public virtual DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }
    public virtual DbSet<Product> Products { get; set; }
    public virtual DbSet<ProductImage> ProductImages { get; set; }
    public virtual DbSet<ProductPromotion> ProductPromotions { get; set; }
    public virtual DbSet<ProductReview> ProductReviews { get; set; }
    public virtual DbSet<ProductVariant> ProductVariants { get; set; }
    public virtual DbSet<Promotion> Promotions { get; set; }
    public virtual DbSet<PromotionCondition> PromotionConditions { get; set; }
    public virtual DbSet<User> Users { get; set; }
    public virtual DbSet<UserAddress> UserAddresses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // 1. ARTICLE
        modelBuilder.Entity<Article>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Articles__3214EC0735BC783D");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.Slug, "UQ__Articles__BC7B5FB681BF302A").IsUnique();
            entity.Property(e => e.IsPublished).HasDefaultValue(false);
            entity.Property(e => e.PublishedAt).HasColumnType("datetime");
            entity.Property(e => e.Slug).HasMaxLength(255).IsUnicode(false);
            entity.Property(e => e.Summary).HasMaxLength(500);
            entity.Property(e => e.Thumbnail).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.Title).HasMaxLength(255);
            entity.HasOne(d => d.Category).WithMany(p => p.Articles).HasForeignKey(d => d.CategoryId);
        });

        // 2. ARTICLE CATEGORY
        modelBuilder.Entity<ArticleCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ArticleC__3214EC074A720241");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.Slug, "UQ__ArticleC__BC7B5FB64997B54A").IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Slug).HasMaxLength(100).IsUnicode(false);
        });

        // 3. CART ITEM
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__CartItem__3214EC076932A933");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.Quantity).HasDefaultValue(1);
            entity.HasOne(d => d.Product).WithMany(p => p.CartItems).HasForeignKey(d => d.ProductId);
            entity.HasOne(d => d.ProductVariant).WithMany(p => p.CartItems).HasForeignKey(d => d.ProductVariantId);
            entity.HasOne(d => d.User).WithMany(p => p.CartItems).HasForeignKey(d => d.UserId);
        });

        // 4. CATEGORY (FIX LỖI CategoryId)
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(e => e.Id).HasName("PK__Categori__3214EC07D13161F7");
            entity.Property(e => e.Id).HasColumnName("Id");

            // QUAN TRỌNG: Ignore SubCategories để tránh lỗi Invalid column CategoryId
            entity.Ignore("SubCategories");

            entity.HasIndex(e => e.Slug, "UQ__Categori__BC7B5FB68C9ADBE7").IsUnique();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Slug).HasMaxLength(100).IsUnicode(false);
            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent).HasForeignKey(d => d.ParentId);
        });

        // 5. COUPON
        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Coupons__3214EC0774E5EAF4");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.Code, "UQ__Coupons__A25C5AA765F78877").IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.ExpiryDate).HasColumnType("datetime");
            entity.Property(e => e.IsUsed).HasDefaultValue(false);
            entity.HasOne(d => d.Promotion).WithMany(p => p.Coupons).HasForeignKey(d => d.PromotionId);
            entity.HasOne(d => d.User).WithMany(p => p.Coupons).HasForeignKey(d => d.UserId);
        });

        // 6. MASTER COLOR
        modelBuilder.Entity<MasterColor>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__MasterCo__3214EC0721DC3ED3");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.HexCode).HasMaxLength(10).IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(50);
        });

        // 7. MASTER SIZE
        modelBuilder.Entity<MasterSize>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__MasterSi__3214EC070B065A41");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.Name).HasMaxLength(20).IsUnicode(false);
        });

        // 8. NOTIFICATION
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Notifica__3214EC0743C27474");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.Type).HasMaxLength(50).IsUnicode(false);
            entity.HasOne(d => d.User).WithMany(p => p.Notifications).HasForeignKey(d => d.UserId);
        });

        // 9. ORDER
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Orders__3214EC070B2D630A");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.OrderCode, "UQ__Orders__999B5229AD1D074F").IsUnique();
            entity.Property(e => e.CouponCode).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.DiscountAmount).HasDefaultValue(0m).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.FinalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.OrderCode).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.OrderDate).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.PaymentMethod).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.PaymentStatus).HasMaxLength(20).IsUnicode(false).HasDefaultValue("Unpaid");
            entity.Property(e => e.ShippingAddress).HasMaxLength(500);
            entity.Property(e => e.ShippingFee).HasDefaultValue(0m).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ShippingName).HasMaxLength(100);
            entity.Property(e => e.ShippingPhone).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.Status).HasDefaultValue(0);
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.HasOne(d => d.User).WithMany(p => p.Orders).HasForeignKey(d => d.UserId);
        });

        // 10. ORDER DETAIL
        modelBuilder.Entity<OrderDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__OrderDet__3214EC07264352A2");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.SnapshotProductName).HasMaxLength(200).HasColumnName("Snapshot_ProductName");
            entity.Property(e => e.SnapshotSku).HasMaxLength(50).IsUnicode(false).HasColumnName("Snapshot_Sku");
            entity.Property(e => e.SnapshotThumbnail).HasMaxLength(500).IsUnicode(false).HasColumnName("Snapshot_Thumbnail");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");
            entity.HasOne(d => d.Order).WithMany(p => p.OrderDetails).HasForeignKey(d => d.OrderId);
            entity.HasOne(d => d.ProductVariant).WithMany(p => p.OrderDetails).HasForeignKey(d => d.ProductVariantId);
        });

        // 11. ORDER STATUS HISTORY
        modelBuilder.Entity<OrderStatusHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__OrderSta__3214EC071A5CC507");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.ToTable("OrderStatusHistory");
            entity.Property(e => e.Note).HasMaxLength(255);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.UpdatedBy).HasMaxLength(100);
            entity.HasOne(d => d.Order).WithMany(p => p.OrderStatusHistories).HasForeignKey(d => d.OrderId);
        });

        // 12. PRODUCT
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Products__3214EC074B2D77F5");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.Slug, "UQ__Products__BC7B5FB686BC82D0").IsUnique();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Slug).HasMaxLength(200).IsUnicode(false);
            entity.Property(e => e.Thumbnail).HasMaxLength(500).IsUnicode(false);
            entity.HasOne(d => d.Category).WithMany(p => p.Products).HasForeignKey(d => d.CategoryId);
        });

        // 13. PRODUCT IMAGE
        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ProductI__3214EC07C4088B48");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.ImageUrl).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.SortOrder).HasDefaultValue(0);
            entity.HasOne(d => d.Product).WithMany(p => p.ProductImages).HasForeignKey(d => d.ProductId);
        });

        // 14. PRODUCT PROMOTION
        modelBuilder.Entity<ProductPromotion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ProductP__3214EC073755BC39");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasOne(d => d.Product).WithMany(p => p.ProductPromotions).HasForeignKey(d => d.ProductId);
            entity.HasOne(d => d.Promotion).WithMany(p => p.ProductPromotions).HasForeignKey(d => d.PromotionId);
        });

        // 15. PRODUCT REVIEW
        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ProductR__3214EC07A54EF0C5");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.Comment).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.HasOne(d => d.Order).WithMany(p => p.ProductReviews).HasForeignKey(d => d.OrderId);
            entity.HasOne(d => d.Product).WithMany(p => p.ProductReviews).HasForeignKey(d => d.ProductId);
            entity.HasOne(d => d.User).WithMany(p => p.ProductReviews).HasForeignKey(d => d.UserId);
        });

        // 16. PRODUCT VARIANT (FIX LỖI Price/StockQuantity invalid)
        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__ProductV__3214EC076D0C2E34");
            entity.Property(e => e.Id).HasColumnName("Id");

            // QUAN TRỌNG: Ignore các trường gây lỗi 'Invalid column name Price'
            entity.Ignore("Price");
            entity.Ignore("StockQuantity");

            entity.HasIndex(e => e.Sku, "UQ__ProductV__CA1FD3C5688A1E06").IsUnique();
            entity.Property(e => e.PriceModifier).HasDefaultValue(0m).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Quantity).HasDefaultValue(0);
            entity.Property(e => e.Sku).HasMaxLength(50).IsUnicode(false);
            entity.HasOne(d => d.Color).WithMany(p => p.ProductVariants).HasForeignKey(d => d.ColorId);
            entity.HasOne(d => d.Product).WithMany(p => p.ProductVariants).HasForeignKey(d => d.ProductId);
            entity.HasOne(d => d.Size).WithMany(p => p.ProductVariants).HasForeignKey(d => d.SizeId);
        });

        // 17. PROMOTION
        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Promotio__3214EC073958A14B");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.DiscountType).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.DiscountValue).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.EndDate).HasColumnType("datetime");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Priority).HasDefaultValue(0);
            entity.Property(e => e.StartDate).HasColumnType("datetime");
        });

        // 18. PROMOTION CONDITION
        modelBuilder.Entity<PromotionCondition>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Promotio__3214EC07CAA94099");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.Field).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Operator).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.Value).HasMaxLength(200);
            entity.HasOne(d => d.Promotion).WithMany(p => p.PromotionConditions).HasForeignKey(d => d.PromotionId);
        });

        // 19. USER
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Users__3214EC0717F4D434");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534615FB27E").IsUnique();
            entity.Property(e => e.AvatarUrl).HasMaxLength(500).IsUnicode(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())").HasColumnType("datetime");
            entity.Property(e => e.Email).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.GoogleId).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.IsLocked).HasDefaultValue(false);
            entity.Property(e => e.PasswordHash).HasMaxLength(255).IsUnicode(false);
            entity.Property(e => e.PhoneNumber).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.Role).HasMaxLength(20).IsUnicode(false).HasDefaultValue("Customer");
            entity.Property(e => e.Username).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.RefreshToken).HasMaxLength(500).IsUnicode(true);
            entity.Property(e => e.RefreshTokenExpiryTime).HasColumnType("datetime");
        });

        // 20. USER ADDRESS
        modelBuilder.Entity<UserAddress>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__UserAddr__3214EC0716D9D52A");
            entity.Property(e => e.Id).HasColumnName("Id");
            entity.Property(e => e.AddressLine).HasMaxLength(255);
            entity.Property(e => e.ContactName).HasMaxLength(100);
            entity.Property(e => e.ContactPhone).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.District).HasMaxLength(50);
            entity.Property(e => e.IsDefault).HasDefaultValue(false);
            entity.Property(e => e.Province).HasMaxLength(50);
            entity.Property(e => e.Ward).HasMaxLength(50);
            entity.HasOne(d => d.User).WithMany(p => p.UserAddresses).HasForeignKey(d => d.UserId);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}