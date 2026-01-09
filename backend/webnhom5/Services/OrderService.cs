using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public class OrderService : IOrderService
    {
        private readonly FashionDbContext _context;

        public OrderService(FashionDbContext context)
        {
            _context = context;
        }

        // --- 1. CART LOGIC ---
        public async Task AddToCartAsync(int userId, AddToCartDto dto)
        {
            // A. Check Tồn kho
            var variant = await _context.ProductVariants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == dto.ProductVariantId);

            if (variant == null) throw new Exception("Sản phẩm không tồn tại.");
            if (variant.Quantity < dto.Quantity) throw new Exception($"Kho chỉ còn {variant.Quantity} sản phẩm.");

            // B. Check xem đã có trong giỏ chưa
            var existingItem = await _context.CartItems
                .FirstOrDefaultAsync(c => c.UserId == userId && c.ProductVariantId == dto.ProductVariantId);

            if (existingItem != null)
            {
                existingItem.Quantity += dto.Quantity; // Cộng dồn
            }
            else
            {
                // SỬA: Dùng Class CartItem (Số ít)
                var cartItem = new CartItem
                {
                    UserId = userId,
                    ProductId = dto.ProductId,
                    ProductVariantId = dto.ProductVariantId,
                    Quantity = dto.Quantity
                };
                _context.CartItems.Add(cartItem);
            }
            await _context.SaveChangesAsync();
        }

        public async Task<List<CartItemResponseDto>> GetMyCartAsync(int userId)
        {
            return await _context.CartItems
                .Include(c => c.Product)
                .Include(c => c.ProductVariant).ThenInclude(v => v.Color)
                .Include(c => c.ProductVariant).ThenInclude(v => v.Size)
                .Where(c => c.UserId == userId)
                .Select(c => new CartItemResponseDto
                {
                    Id = c.Id,
                    ProductId = c.ProductId,
                    ProductName = c.Product.Name,
                    ProductImage = c.Product.Thumbnail ?? "",
                    ProductVariantId = c.ProductVariantId,
                    Size = c.ProductVariant.Size.Name,
                    Color = c.ProductVariant.Color.Name,
                    Price = c.Product.Price + (c.ProductVariant.PriceModifier ?? 0),
                    Quantity = c.Quantity ?? 1,
                    MaxStock = c.ProductVariant.Quantity ?? 0
                }).ToListAsync();
        }

        public async Task RemoveFromCartAsync(int userId, int cartItemId)
        {
            var item = await _context.CartItems.FirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == userId);
            if (item != null)
            {
                _context.CartItems.Remove(item);
                await _context.SaveChangesAsync();
            }
        }

        public async Task ClearCartAsync(int userId)
        {
            var items = await _context.CartItems.Where(c => c.UserId == userId).ToListAsync();
            _context.CartItems.RemoveRange(items);
            await _context.SaveChangesAsync();
        }

        // --- 2. CHECKOUT LOGIC (TRANSACTION ACID) ---
        public async Task<string> CheckoutAsync(int userId, CheckoutDto dto)
        {
            // Bắt đầu Transaction
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Bước 1: Lấy giỏ hàng
                var cartItems = await _context.CartItems
                    .Include(c => c.Product)
                    .Include(c => c.ProductVariant)
                    .Where(c => c.UserId == userId)
                    .ToListAsync();

                if (!cartItems.Any()) throw new Exception("Giỏ hàng trống.");

                // Bước 2: Tính toán tiền & Trừ kho (Quan trọng)
                decimal totalAmount = 0;
                
                foreach (var item in cartItems)
                {
                    // Check tồn kho lần cuối (Concurrency check)
                    if (item.ProductVariant.Quantity < item.Quantity)
                    {
                        throw new Exception($"Sản phẩm {item.Product.Name} đã hết hàng hoặc không đủ số lượng.");
                    }

                    // Trừ kho
                    item.ProductVariant.Quantity -= item.Quantity;
                    _context.ProductVariants.Update(item.ProductVariant);

                    // Cộng tiền (Giá Product + Giá Variant)
                    decimal price = item.Product.Price + (item.ProductVariant.PriceModifier ?? 0);
                    totalAmount += price * (item.Quantity ?? 0);
                }

                // Bước 3: Tạo Order (Snapshot Address) - SỬA: Dùng Class Order (Số ít)
                var order = new Order
                {
                    UserId = userId,
                    OrderCode = "ORD-" + DateTime.Now.Ticks, 
                    OrderDate = DateTime.Now,
                    ShippingName = dto.ShippingName,       
                    ShippingAddress = dto.ShippingAddress, 
                    ShippingPhone = dto.ShippingPhone,     
                    PaymentMethod = dto.PaymentMethod,
                    TotalAmount = totalAmount,
                    FinalAmount = totalAmount, 
                    Status = 0, // Pending
                    PaymentStatus = "Unpaid"
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // Để lấy OrderId

                // Bước 4: Tạo OrderDetails (Snapshot Product Data) - SỬA: Dùng Class OrderDetail (Số ít)
                foreach (var item in cartItems)
                {
                    decimal price = item.Product.Price + (item.ProductVariant.PriceModifier ?? 0);
                    var detail = new OrderDetail
                    {
                        OrderId = order.Id,
                        ProductVariantId = item.ProductVariantId,
                        Quantity = item.Quantity ?? 0,
                        UnitPrice = price,
                        // SỬA: Tên thuộc tính PascalCase (bỏ dấu gạch dưới)
                        SnapshotProductName = item.Product.Name, 
                        SnapshotSku = item.ProductVariant.Sku,
                        SnapshotThumbnail = item.Product.Thumbnail
                    };
                    _context.OrderDetails.Add(detail);
                }

                // Bước 5: Ghi log trạng thái khởi tạo - SỬA: DbSet OrderStatusHistories
                _context.OrderStatusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    NewStatus = 0,
                    Note = "Đơn hàng được khởi tạo",
                    Timestamp = DateTime.Now,
                    UpdatedBy = "Customer"
                });

                // Bước 6: Xóa giỏ hàng
                _context.CartItems.RemoveRange(cartItems);
                await _context.SaveChangesAsync();

                // Commit Transaction
                await transaction.CommitAsync();

                return order.OrderCode;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // --- 3. ADMIN ORDER LOGIC ---
        public async Task<List<OrderResponseDto>> GetOrdersAsync(int? status, DateTime? fromDate, DateTime? toDate)
        {
            var query = _context.Orders.AsQueryable();

            if (status.HasValue) query = query.Where(o => o.Status == status);
            if (fromDate.HasValue) query = query.Where(o => o.OrderDate >= fromDate);
            if (toDate.HasValue) query = query.Where(o => o.OrderDate <= toDate);

            return await query.OrderByDescending(o => o.OrderDate)
                .Select(o => new OrderResponseDto
                {
                    Id = o.Id,
                    OrderCode = o.OrderCode,
                    OrderDate = o.OrderDate ?? DateTime.Now,
                    Status = GetStatusName(o.Status ?? 0),
                    TotalAmount = o.TotalAmount,
                    FinalAmount = o.FinalAmount,
                    ShippingName = o.ShippingName
                }).ToListAsync();
        }

        public async Task<OrderResponseDto?> GetOrderByIdAsync(int id)
        {
            // SỬA: Include OrderStatusHistories (số nhiều)
            var o = await _context.Orders
                .Include(x => x.OrderDetails)
                .Include(x => x.OrderStatusHistories)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (o == null) return null;

            return new OrderResponseDto
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                OrderDate = o.OrderDate ?? DateTime.Now,
                Status = GetStatusName(o.Status ?? 0),
                ShippingName = o.ShippingName,
                ShippingAddress = o.ShippingAddress,
                PaymentMethod = o.PaymentMethod,
                FinalAmount = o.FinalAmount,
                OrderDetails = o.OrderDetails.Select(d => new OrderDetailDto
                {
                    // SỬA: Tên thuộc tính PascalCase
                    ProductName = d.SnapshotProductName, 
                    Sku = d.SnapshotSku,
                    Thumbnail = d.SnapshotThumbnail,
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice
                }).ToList(),
                History = o.OrderStatusHistories.OrderByDescending(h => h.Timestamp).Select(h => new OrderStatusHistoryDto
                {
                    StatusName = GetStatusName(h.NewStatus),
                    Note = h.Note,
                    Timestamp = h.Timestamp ?? DateTime.Now,
                    UpdatedBy = h.UpdatedBy
                }).ToList()
            };
        }

        // --- 4. STATE MACHINE ---
        public async Task UpdateOrderStatusAsync(int orderId, int newStatus, string? note, string updatedBy)
        {
            var order = await _context.Orders.FindAsync(orderId);
            if (order == null) throw new Exception("Đơn hàng không tồn tại");

            int oldStatus = order.Status ?? 0;
            
            bool isValid = false;
            if (newStatus == 4 && oldStatus < 2) isValid = true; 
            else if (newStatus == oldStatus + 1 && oldStatus < 3) isValid = true; 
            else if (oldStatus == 2 && newStatus == 5) isValid = true; 

            if (!isValid) throw new Exception($"Không thể chuyển trạng thái từ {GetStatusName(oldStatus)} sang {GetStatusName(newStatus)}");

            order.Status = newStatus;
            
            // SỬA: DbSet OrderStatusHistories
            _context.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                PreviousStatus = oldStatus,
                NewStatus = newStatus,
                Note = note,
                UpdatedBy = updatedBy,
                Timestamp = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }

        // --- 5. STATISTICS ---
        public async Task<List<RevenueStatisticDto>> GetDailyRevenueAsync(int days)
        {
            var fromDate = DateTime.Now.AddDays(-days);
            
            var stats = await _context.Orders
                .Where(o => o.OrderDate >= fromDate && o.Status == 3) // Chỉ tính đơn thành công
                .GroupBy(o => o.OrderDate.Value.Date) // Sửa: Gom nhóm theo ngày (bỏ giờ phút)
                .Select(g => new RevenueStatisticDto
                {
                    Date = g.Key.ToString("dd/MM/yyyy"),
                    TotalOrders = g.Count(),
                    TotalRevenue = g.Sum(o => o.FinalAmount)
                })
                .ToListAsync();

            return stats;
        }

        private static string GetStatusName(int status)
        {
            return status switch
            {
                0 => "Chờ xác nhận",
                1 => "Đã xác nhận",
                2 => "Đang giao",
                3 => "Hoàn thành",
                4 => "Đã hủy",
                5 => "Giao thất bại",
                _ => "Không xác định"
            };
        }
    }
}