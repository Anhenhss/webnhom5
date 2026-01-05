using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.Models;
using webnhom5.DTOs;

namespace webnhom5.Repositories
{
    public interface ICatalogRepository {
        Task<List<Category>> GetAllCategoriesAsync();
        Task<bool> IsSkuExists(string sku);
        Task<bool> CategoryHasProducts(int categoryId);
        Task SaveProductAsync(Product product, List<string> imageUrls);
        Task AddVariantAsync(ProductVariant variant);
    }
}