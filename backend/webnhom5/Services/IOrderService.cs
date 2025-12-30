using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public interface IOrderService
    {
        // --- CART ---
        Task AddToCartAsync(int userId, AddToCartDto dto);
        Task<List<CartItemResponseDto>> GetMyCartAsync(int userId);
        Task RemoveFromCartAsync(int userId, int cartItemId);
        Task ClearCartAsync(int userId);

        // --- CHECKOUT (TRANSACTION) ---
        // Trả về OrderCode
        Task<string> CheckoutAsync(int userId, CheckoutDto dto);

        // --- ADMIN ORDER ---
        Task<List<OrderResponseDto>> GetOrdersAsync(int? status, DateTime? fromDate, DateTime? toDate);
        Task<OrderResponseDto?> GetOrderByIdAsync(int id);
        Task UpdateOrderStatusAsync(int orderId, int newStatus, string? note, string updatedBy);
        
        // --- STATISTICS ---
        Task<List<RevenueStatisticDto>> GetDailyRevenueAsync(int days);
    }
}