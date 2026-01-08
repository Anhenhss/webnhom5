using AutoMapper;
using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.DTOs;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Services
{
    public class ProductService : IProductService
    {
        private readonly FashionDbContext _context;
        private readonly IGenericRepository<Product> _productRepo;
        private readonly IWebHostEnvironment _env;
        private readonly IMapper _mapper;

        public ProductService(FashionDbContext context, IGenericRepository<Product> productRepo, IWebHostEnvironment env, IMapper mapper)
        {
            _context = context;
            _productRepo = productRepo;
            _env = env;
            _mapper = mapper;
        }

        // --- 1. CATEGORY ---
        public async Task<List<CategoryTreeDto>> GetCategoryTreeAsync()
        {
            var allCats = await _context.Categories.Where(c => c.IsActive == true).ToListAsync();
            var rootCats = allCats.Where(c => c.ParentId == null).ToList();
            return rootCats.Select(c => MapToTreeDto(c, allCats)).ToList();
        }

        private CategoryTreeDto MapToTreeDto(Category cat, List<Category> allCats)
        {
            return new CategoryTreeDto
            {
                Id = cat.Id,
                Name = cat.Name,
                Slug = cat.Slug,
                Children = allCats.Where(c => c.ParentId == cat.Id)
                                  .Select(c => MapToTreeDto(c, allCats))
                                  .ToList()
            };
        }

        public async Task<Category> CreateCategoryAsync(CreateCategoryDto dto)
        {
            var cat = new Category
            {
                Name = dto.Name,
                ParentId = dto.ParentId,
                Slug = GenerateSlug(dto.Name),
                IsActive = true
            };
            _context.Categories.Add(cat);
            await _context.SaveChangesAsync();
            return cat ;
        }

        public async Task DeleteCategoryAsync(int id)
        {
            bool hasProduct = await _context.Products.AnyAsync(p => p.CategoryId == id);
            if (hasProduct) throw new Exception("Không thể xóa danh mục này vì đang chứa sản phẩm.");
            
            bool hasChild = await _context.Categories.AnyAsync(c => c.ParentId == id);
            if (hasChild) throw new Exception("Cần xóa các danh mục con trước.");

            var cat = await _context.Categories.FindAsync(id);
            if(cat != null) 
            {
                _context.Categories.Remove(cat);
                await _context.SaveChangesAsync();
            }
        }

        // --- 2. PRODUCT (FULL CRUD) ---
        public async Task<List<ProductResponseDto>> GetAllProductsAsync()
        {
            return await _context.Products
                .Include(p => p.Category)
                .Where(p => p.IsActive == true) // Chỉ lấy sản phẩm active
                .Select(p => new ProductResponseDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Slug = p.Slug,
                    Price = p.Price,
                    Thumbnail = p.Thumbnail,
                    CategoryName = p.Category.Name,
                    IsActive = p.IsActive
                }).ToListAsync();
        }

        public async Task<ProductResponseDto?> GetProductByIdAsync(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.ProductImages)
                .Include(p => p.ProductVariants).ThenInclude(v => v.Color)
                .Include(p => p.ProductVariants).ThenInclude(v => v.Size)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return null;

            return new ProductResponseDto
            {
                Id = product.Id,
                Name = product.Name,
                Slug = product.Slug,
                Price = product.Price,
                Description = product.Description,
                Thumbnail = product.Thumbnail,
                CategoryId = product.CategoryId,
                CategoryName = product.Category.Name,
                IsActive = product.IsActive,
                ImageUrls = product.ProductImages.OrderBy(i => i.SortOrder).Select(i => i.ImageUrl).ToList(),
                Variants = product.ProductVariants.Select(v => new VariantResponseDto
                {
                    Id = v.Id,
                    ColorId = v.ColorId,
                    SizeId = v.SizeId,
                    ColorName = v.Color.Name,
                    SizeName = v.Size.Name,
                    Sku = v.Sku,
                    Quantity = v.Quantity ?? 0,
                    PriceModifier = v.PriceModifier ?? 0
                }).ToList()
            };
        }

        public async Task<ProductResponseDto> CreateProductAsync(CreateProductDto dto)
        {
            string thumbPath = await SaveFileAsync(dto.ThumbnailFile);

            var product = new Product
            {
                Name = dto.Name,
                Slug = GenerateSlug(dto.Name) + "-" + Guid.NewGuid().ToString().Substring(0, 4),
                Price = dto.Price,
                Description = dto.Description,
                CategoryId = dto.CategoryId,
                Thumbnail = thumbPath,
                IsActive = true
            };
            
            await _productRepo.AddAsync(product);

            if (dto.GalleryFiles != null && dto.GalleryFiles.Any())
            {
                foreach (var file in dto.GalleryFiles)
                {
                    string imgPath = await SaveFileAsync(file);
                    var prodImg = new ProductImage { ProductId = product.Id, ImageUrl = imgPath, SortOrder = 0 };
                    _context.ProductImages.Add(prodImg);
                }
                await _context.SaveChangesAsync();
            }

            return await GetProductByIdAsync(product.Id) ?? new ProductResponseDto();
        }

        public async Task<ProductResponseDto> UpdateProductAsync(int id, UpdateProductDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) throw new Exception("Không tìm thấy sản phẩm");

            // Cập nhật thông tin cơ bản
            product.Name = dto.Name;
            product.Price = dto.Price;
            product.Description = dto.Description;
            product.CategoryId = dto.CategoryId;
            product.IsActive = dto.IsActive;

            // Nếu có ảnh Thumbnail mới -> Thay thế
            if (dto.ThumbnailFile != null)
            {
                product.Thumbnail = await SaveFileAsync(dto.ThumbnailFile);
            }

            // Nếu có ảnh Gallery mới -> Thêm vào (Không xóa ảnh cũ)
            if (dto.NewGalleryFiles != null && dto.NewGalleryFiles.Any())
            {
                foreach (var file in dto.NewGalleryFiles)
                {
                    string imgPath = await SaveFileAsync(file);
                    _context.ProductImages.Add(new ProductImage { ProductId = id, ImageUrl = imgPath, SortOrder = 0 });
                }
            }

            await _productRepo.UpdateAsync(product);
            return await GetProductByIdAsync(id) ?? new ProductResponseDto();
        }

        public async Task DeleteProductAsync(int id)
        {
            // Xóa cứng hoặc xóa mềm tùy nghiệp vụ. Ở đây dùng xóa cứng theo GenericRepo
            await _productRepo.DeleteAsync(id);
        }

        // --- 3. VARIANT (FULL CRUD) ---
        
        // <--- THÊM HÀM NÀY
        public async Task<VariantResponseDto?> GetVariantByIdAsync(int id)
        {
            var v = await _context.ProductVariants
                .Include(v => v.Color)
                .Include(v => v.Size)
                .FirstOrDefaultAsync(v => v.Id == id);
                
            if (v == null) return null;
            
            return new VariantResponseDto
            {
                Id = v.Id,
                ColorId = v.ColorId,
                SizeId = v.SizeId,
                ColorName = v.Color.Name,
                SizeName = v.Size.Name,
                Sku = v.Sku,
                Quantity = v.Quantity ?? 0,
                PriceModifier = v.PriceModifier ?? 0
            };
        }
        // ---> KẾT THÚC THÊM

        public async Task<ProductVariant> CreateVariantAsync(CreateVariantDto dto)
        {
            bool skuExists = await _context.ProductVariants.AnyAsync(v => v.Sku == dto.Sku);
            if (skuExists) throw new Exception($"SKU '{dto.Sku}' đã tồn tại.");

            bool variantExists = await _context.ProductVariants.AnyAsync(v => v.ProductId == dto.ProductId && v.ColorId == dto.ColorId && v.SizeId == dto.SizeId);
            if (variantExists) throw new Exception("Biến thể Màu/Size này đã tồn tại.");

            var variant = new ProductVariant
            {
                ProductId = dto.ProductId,
                ColorId = dto.ColorId,
                SizeId = dto.SizeId,
                Sku = dto.Sku,
                Quantity = dto.Quantity,
                PriceModifier = dto.PriceModifier
            };

            _context.ProductVariants.Add(variant);
            await _context.SaveChangesAsync();
            return variant;
        }

        public async Task<ProductVariant> UpdateVariantAsync(int id, UpdateVariantDto dto)
        {
            var variant = await _context.ProductVariants.FindAsync(id);
            if (variant == null) throw new Exception("Không tìm thấy biến thể");

            // Kiểm tra trùng SKU (trừ chính nó)
            bool skuDuplicate = await _context.ProductVariants.AnyAsync(v => v.Sku == dto.Sku && v.Id != id);
            if (skuDuplicate) throw new Exception($"SKU '{dto.Sku}' đã bị trùng.");

            variant.Sku = dto.Sku;
            variant.Quantity = dto.Quantity;
            variant.PriceModifier = dto.PriceModifier;

            await _context.SaveChangesAsync();
            return variant;
        }

        public async Task DeleteVariantAsync(int id)
        {
            var variant = await _context.ProductVariants.FindAsync(id);
            if (variant != null)
            {
                _context.ProductVariants.Remove(variant);
                await _context.SaveChangesAsync();
            }
        }

        // --- 4. MASTER DATA ---
        public async Task<IEnumerable<MasterColor>> GetColorsAsync() => await _context.MasterColors.ToListAsync();
        public async Task<IEnumerable<MasterSize>> GetSizesAsync() => await _context.MasterSizes.ToListAsync();

        // --- HELPER ---
        private async Task<string> SaveFileAsync(IFormFile? file)
        {
            if (file == null || file.Length == 0) return null!;
            string uploadFolder = Path.Combine(_env.WebRootPath, "images", "products");
            if (!Directory.Exists(uploadFolder)) Directory.CreateDirectory(uploadFolder);
            string uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
            string filePath = Path.Combine(uploadFolder, uniqueFileName);
            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }
            return "/images/products/" + uniqueFileName;
        }

        private string GenerateSlug(string name) => name.ToLower().Replace(" ", "-").Replace("đ", "d");
    }
}