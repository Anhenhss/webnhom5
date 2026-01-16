using webnhom5.DTOs;
using webnhom5.Models;

namespace webnhom5.Services
{
    public interface IProductService
    {
        // Category
        Task<List<CategoryTreeDto>> GetCategoryTreeAsync();
        Task<Category> CreateCategoryAsync(CreateCategoryDto dto);
        Task DeleteCategoryAsync(int id);

        // Product (Full CRUD)
        Task<List<ProductResponseDto>> GetAllProductsAsync();
        Task<ProductResponseDto?> GetProductByIdAsync(int id); 
        Task<ProductResponseDto> CreateProductAsync(CreateProductDto dto);
        Task<ProductResponseDto> UpdateProductAsync(int id, UpdateProductDto dto); 
        Task DeleteProductAsync(int id);

        // Variant (Full CRUD)
        Task<VariantResponseDto?> GetVariantByIdAsync(int id); 
        Task<List<VariantResponseDto>> GetVariantsByProductIdAsync(int productId);
        Task<ProductVariant> CreateVariantAsync(CreateVariantDto dto);
        Task<ProductVariant> UpdateVariantAsync(int id, UpdateVariantDto dto); 
        Task DeleteVariantAsync(int id); 
        
        // Master Data
        Task<IEnumerable<MasterColor>> GetColorsAsync();
        Task<IEnumerable<MasterSize>> GetSizesAsync();
    }
}