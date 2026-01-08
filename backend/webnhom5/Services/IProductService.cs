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
        Task<ProductResponseDto?> GetProductByIdAsync(int id); // Mới
        Task<ProductResponseDto> CreateProductAsync(CreateProductDto dto);
        Task<ProductResponseDto> UpdateProductAsync(int id, UpdateProductDto dto); // Mới
        Task DeleteProductAsync(int id);

        // Variant (Full CRUD)
        Task<VariantResponseDto?> GetVariantByIdAsync(int id); // <--- THÊM DÒNG NÀY
        Task<ProductVariant> CreateVariantAsync(CreateVariantDto dto);
        Task<ProductVariant> UpdateVariantAsync(int id, UpdateVariantDto dto); // Mới
        Task DeleteVariantAsync(int id); // Mới
        
        // Master Data
        Task<IEnumerable<MasterColor>> GetColorsAsync();
        Task<IEnumerable<MasterSize>> GetSizesAsync();
    }
}