using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.Models;
using webnhom5.DTOs;

namespace webnhom5.Repositories
{
        public class CatalogRepository : ICatalogRepository {
        private readonly FashionDbContext _context;
        public CatalogRepository(FashionDbContext context) => _context = context;

        public async Task<List<Category>> GetAllCategoriesAsync() => await _context.Categories.ToListAsync();
        
        public async Task<bool> IsSkuExists(string sku) => await _context.ProductVariants.AnyAsync(v => v.Sku == sku);

        public async Task<bool> CategoryHasProducts(int categoryId) => await _context.Products.AnyAsync(p => p.CategoryId == categoryId);

        public async Task SaveProductAsync(Product product, List<string> imageUrls) {
            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            foreach (var url in imageUrls) {
                _context.ProductImages.Add(new ProductImage { ProductId = product.Id, ImageUrl = url });
            }
            await _context.SaveChangesAsync();
        }

        public async Task AddVariantAsync(ProductVariant variant) {
            _context.ProductVariants.Add(variant);
            await _context.SaveChangesAsync();
        }
    }
}