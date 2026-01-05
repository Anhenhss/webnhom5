using webnhom5.DTOs;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Services
{
    

    public class CatalogService : ICatalogService {
        private readonly ICatalogRepository _repo;
        private readonly IWebHostEnvironment _env;

        public CatalogService(ICatalogRepository repo, IWebHostEnvironment env) {
            _repo = repo;
            _env = env;
        }

        public async Task<List<CategoryNodeDTO>> GetCategoryTree() {
            var all = await _repo.GetAllCategoriesAsync();
            return all.Where(c => c.Parent == null).Select(c => Map(c, all)).ToList();
        }

        private CategoryNodeDTO Map(Category c, List<Category> all) => new() {
            Id = c.Id, Name = c.Name,
            Children = all.Where(x => x.ParentId == c.Id).Select(x => Map(x, all)).ToList()
        };

        public async Task CreateProduct(ProductCreateDTO dto) {
            var imageUrls = new List<string>();
            if (dto.Images != null) {
                string folder = Path.Combine(_env.WebRootPath, "uploads/products");
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);

                foreach (var file in dto.Images) {
                    string fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
                    string path = Path.Combine(folder, fileName);
                    using var stream = new FileStream(path, FileMode.Create);
                    await file.CopyToAsync(stream);
                    imageUrls.Add("/uploads/products/" + fileName);
                }
            }
            await _repo.SaveProductAsync(new Product { Name = dto.Name, CategoryId = dto.CategoryId, Description = dto.Description }, imageUrls);
        }

        public async Task CreateVariant(VariantDTO dto) 
{
    // Kiểm tra SKU trùng (Nhiệm vụ của Thảo)
    if (await _repo.IsSkuExists(dto.Sku)) 
        throw new Exception("Mã SKU này đã tồn tại!");

    var newVariant = new ProductVariant { 
        ProductId = dto.ProductId,
        ColorId = dto.ColorId,
        SizeId = dto.SizeId,
        Sku = dto.Sku,
        Price = dto.Price,           
        StockQuantity = dto.StockQuantity 
    };

    await _repo.AddVariantAsync(newVariant);
}
    }
}