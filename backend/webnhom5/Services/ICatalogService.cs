using webnhom5.DTOs;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Services
{
    public interface ICatalogService {
        Task<List<CategoryNodeDTO>> GetCategoryTree();
        Task CreateProduct(ProductCreateDTO dto);
        Task CreateVariant(VariantDTO dto);
    }
}