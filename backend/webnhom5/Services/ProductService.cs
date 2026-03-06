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
            if (dto.ParentId.HasValue && dto.ParentId.Value <= 0) dto.ParentId = null;

            if (dto.ParentId.HasValue)
            {
                bool parentExists = await _context.Categories.AnyAsync(c => c.Id == dto.ParentId.Value);
                if (!parentExists) throw new Exception($"Danh mục cha với ID {dto.ParentId} không tồn tại.");
            }

            var cat = new Category
            {
                Name = dto.Name,
                ParentId = dto.ParentId,
                Slug = GenerateSlug(dto.Name),
                IsActive = true
            };
            _context.Categories.Add(cat);
            await _context.SaveChangesAsync();
            return cat;
        }

        public async Task DeleteCategoryAsync(int id)
        {
            bool hasProduct = await _context.Products.AnyAsync(p => p.CategoryId == id);
            if (hasProduct) throw new Exception("Không thể xóa danh mục này vì đang chứa sản phẩm.");

            bool hasChild = await _context.Categories.AnyAsync(c => c.ParentId == id);
            if (hasChild) throw new Exception("Cần xóa các danh mục con trước.");

            var cat = await _context.Categories.FindAsync(id);
            if (cat != null)
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
                .Include(p => p.ProductImages)
                .Include(p => p.ProductVariants)
                .Select(p => new ProductResponseDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Slug = p.Slug,
                    Price = p.Price,
                    Thumbnail = p.Thumbnail,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    IsActive = p.IsActive,
                    TotalStock = p.ProductVariants.Sum(v => v.Quantity ?? 0),

                    SoldCount = _context.OrderDetails
                        .Where(od => od.ProductVariant.ProductId == p.Id && od.Order.Status == 3)
                        .Sum(od => (int?)od.Quantity) ?? 0,

                    Variants = p.ProductVariants.Select(v => new VariantResponseDto
                    {
                        ColorId = v.ColorId,
                        SizeId = v.SizeId
                    }).ToList()
                })
                .OrderByDescending(p => p.Id) // Xếp sp mới lên đầu
                .ToListAsync();
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

            // 💥 TÍNH TOÁN SỐ LƯỢNG ĐÃ BÁN (Chỉ tính đơn hàng đã giao thành công)
            int soldQuantity = await _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.ProductVariant)
                .Where(od => od.ProductVariant.ProductId == id && od.Order.Status == 3)
                .SumAsync(od => od.Quantity);

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
                
                // 👉 Đưa số lượng bán vào thuộc tính TotalStock (Hoặc tạo thêm thuộc tính SoldCount trong Dto)
                SoldCount = soldQuantity, 

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
                int sort = 1;
                foreach (var file in dto.GalleryFiles)
                {
                    string imgPath = await SaveFileAsync(file);
                    var prodImg = new ProductImage { ProductId = product.Id, ImageUrl = imgPath, SortOrder = sort++ };
                    _context.ProductImages.Add(prodImg);
                }
                await _context.SaveChangesAsync();
            }
            if (dto.Variants != null && dto.Variants.Any())
            {
                foreach (var v in dto.Variants)
                {
                    var variant = new ProductVariant
                    {
                        ProductId = product.Id, // Đã có ID sau khi thêm Product ở trên
                        ColorId = v.ColorId,
                        SizeId = v.SizeId,
                        Sku = v.Sku,
                        Quantity = v.Quantity,
                        PriceModifier = v.PriceModifier
                    };
                    _context.ProductVariants.Add(variant);
                }
                await _context.SaveChangesAsync();
            }
            return await GetProductByIdAsync(product.Id) ?? new ProductResponseDto();
        }

        public async Task<ProductResponseDto> UpdateProductAsync(int id, UpdateProductDto dto)
        {
            // 1. Tìm sản phẩm và Include luôn danh sách biến thể cũ
            var product = await _context.Products
                .Include(p => p.ProductVariants)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) throw new Exception("Không tìm thấy sản phẩm");

            // 2. Cập nhật thông tin cơ bản
            product.Name = dto.Name;
            product.Price = dto.Price;
            product.Description = dto.Description;
            product.CategoryId = dto.CategoryId;
            // product.IsActive = dto.IsActive;

            // 3. Cập nhật ảnh đại diện
            if (dto.ThumbnailFile != null)
            {
                product.Thumbnail = await SaveFileAsync(dto.ThumbnailFile);
            }

            // 4. Cập nhật ảnh phụ
            if (dto.NewGalleryFiles != null && dto.NewGalleryFiles.Any())
            {
                int currentMaxSort = await _context.ProductImages.Where(p => p.ProductId == id).MaxAsync(p => (int?)p.SortOrder) ?? 0;
                foreach (var file in dto.NewGalleryFiles)
                {
                    currentMaxSort++;
                    string imgPath = await SaveFileAsync(file);
                    _context.ProductImages.Add(new ProductImage { ProductId = id, ImageUrl = imgPath, SortOrder = currentMaxSort });
                }
            }

            // ==============================================================
            // 5. XỬ LÝ CẬP NHẬT DANH SÁCH BIẾN THỂ (VARIANTS)
            // ==============================================================
            if (dto.Variants != null)
            {
                // Lấy danh sách SKU gửi lên từ Frontend
                var submittedSkus = dto.Variants.Select(v => v.Sku).ToList();

                // A. Xóa các biến thể cũ không còn tồn tại trong danh sách gửi lên
                var variantsToRemove = product.ProductVariants
                    .Where(v => !submittedSkus.Contains(v.Sku))
                    .ToList();
                _context.ProductVariants.RemoveRange(variantsToRemove);

                // B. Lặp qua danh sách gửi lên để Cập nhật hoặc Thêm mới
                foreach (var submittedVariant in dto.Variants)
                {
                    var existingVariant = product.ProductVariants
                        .FirstOrDefault(v => v.Sku == submittedVariant.Sku);

                    if (existingVariant != null)
                    {
                        // Nếu đã có -> CẬP NHẬT số lượng và giá chênh lệch
                        existingVariant.Quantity = submittedVariant.Quantity;
                        existingVariant.PriceModifier = submittedVariant.PriceModifier;
                        // (Không cho phép đổi Màu/Size của một SKU đã có, nếu muốn đổi thì coi như tạo dòng mới)
                    }
                    else
                    {
                        // Nếu chưa có -> THÊM MỚI biến thể
                        var newVariant = new ProductVariant
                        {
                            ProductId = product.Id,
                            ColorId = submittedVariant.ColorId,
                            SizeId = submittedVariant.SizeId,
                            Sku = submittedVariant.Sku,
                            Quantity = submittedVariant.Quantity,
                            PriceModifier = submittedVariant.PriceModifier
                        };
                        _context.ProductVariants.Add(newVariant);
                    }
                }
            }

            // 6. Lưu toàn bộ thay đổi xuống Database
            await _productRepo.UpdateAsync(product);
            // Ghi chú: _productRepo.UpdateAsync thường đã gọi _context.SaveChangesAsync() bên trong.

            return await GetProductByIdAsync(id) ?? new ProductResponseDto();
        }

        public async Task DeleteProductAsync(int id)
        {
            await _productRepo.DeleteAsync(id);
        }

        // --- 3. VARIANT (FULL CRUD) ---

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

        public async Task<List<VariantResponseDto>> GetVariantsByProductIdAsync(int productId)
        {
            return await _context.ProductVariants
                .Include(v => v.Color)
                .Include(v => v.Size)
                .Where(v => v.ProductId == productId) // Lọc theo sản phẩm cha
                .OrderBy(v => v.Color.Name) // Sắp xếp cho dễ nhìn
                .Select(v => new VariantResponseDto
                {
                    Id = v.Id,
                    ColorId = v.ColorId,
                    SizeId = v.SizeId,
                    ColorName = v.Color.Name,
                    SizeName = v.Size.Name,
                    Sku = v.Sku,
                    Quantity = v.Quantity ?? 0,
                    PriceModifier = v.PriceModifier ?? 0
                }).ToListAsync();
        }

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
        public async Task<bool> ToggleProductStatusAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) throw new Exception("Không tìm thấy sản phẩm");

            product.IsActive = !product.IsActive; // Đổi trạng thái Bật <-> Ẩn
            await _context.SaveChangesAsync();

            return product.IsActive ?? false;
        }
        // --- 4. MASTER DATA ---
        public async Task<int> AddColorAsync(MasterDataDto dto)
        {
            // 1. Kiểm tra trùng lặp Tên màu hoặc Mã Hex
            bool exists = await _context.MasterColors.AnyAsync(c => c.Name.ToLower() == dto.Name.ToLower() || c.HexCode.ToLower() == dto.HexCode!.ToLower());
            if (exists) throw new Exception("Tên màu hoặc mã Hex màu này đã tồn tại!");

            var color = new MasterColor
            {
                Name = dto.Name.Trim(),
                HexCode = dto.HexCode!.Trim() // Lưu mã Hex chuẩn (VD: #FF0000)
            };

            _context.MasterColors.Add(color);
            await _context.SaveChangesAsync();
            return color.Id;
        }

        public async Task<int> AddSizeAsync(MasterDataDto dto)
        {
            // 1. Kiểm tra trùng lặp Kích thước
            bool exists = await _context.MasterSizes.AnyAsync(s => s.Name.ToLower() == dto.Name.ToLower());
            if (exists) throw new Exception("Kích thước này đã tồn tại!");

            var size = new MasterSize
            {
                Name = dto.Name.Trim() // Lấy chính Name làm giá trị (S, M, 39, 40...)
            };

            _context.MasterSizes.Add(size);
            await _context.SaveChangesAsync();
            return size.Id;
        }

        // Chỉnh lại GetColors và GetSizes để trả dữ liệu sạch về Frontend
        public async Task<IEnumerable<object>> GetColorsAsync()
        {
            var colors = await _context.MasterColors.ToListAsync();
            return colors.Select(c => new { id = c.Id, name = c.Name, hexCode = c.HexCode });
        }

        public async Task<IEnumerable<object>> GetSizesAsync()
        {
            var sizes = await _context.MasterSizes.ToListAsync();
            return sizes.Select(s => new { id = s.Id, name = s.Name }); // Chỉ cần ID và Name
        }
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
        public async Task<List<ReviewResponseDto>> GetReviewsByProductIdAsync(int productId)
        {
            return await _context.ProductReviews
                .Include(r => r.User)
                .Where(r => r.ProductId == productId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewResponseDto
                {
                    Id = r.Id,
                    Rating = r.Rating ?? 5,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    UserName = r.User.FullName // Lấy tên khách hàng
                }).ToListAsync();
        }
        public async Task<ReviewResponseDto> CreateReviewAsync(int userId, CreateReviewDto dto)
        {
            // 1. Kiểm tra sản phẩm có tồn tại không
            bool productExists = await _context.Products.AnyAsync(p => p.Id == dto.ProductId);
            if (!productExists) throw new Exception("Sản phẩm không tồn tại.");

            // 💥 2. KIỂM TRA ĐÃ MUA HÀNG HAY CHƯA (Logic xịn cho đồ án)
            // Tìm xem người dùng này đã có Đơn hàng nào CHỨA sản phẩm này và đã HOÀN THÀNH (Status = 3) chưa?
            var purchasedOrder = await _context.OrderDetails
                .Include(od => od.Order)
                .Include(od => od.ProductVariant)
                .Where(od => od.Order.UserId == userId 
                          && od.ProductVariant.ProductId == dto.ProductId 
                          && od.Order.Status == 3) // Trạng thái 3 = Hoàn thành
                .OrderByDescending(od => od.OrderId)
                .FirstOrDefaultAsync();

            if (purchasedOrder == null) 
            {
                throw new Exception("Bạn phải mua và nhận thành công sản phẩm này mới được đánh giá!");
            }

            // 3. Tạo đối tượng Review mới
            var review = new ProductReview
            {
                ProductId = dto.ProductId,
                UserId = userId,
                OrderId = purchasedOrder.OrderId, // 👉 Lấy OrderId thật từ đơn hàng vừa tìm được
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.Now
            };

            _context.ProductReviews.Add(review);
            await _context.SaveChangesAsync();

            // 4. Trả về cho Frontend
            var user = await _context.Users.FindAsync(userId);
            return new ReviewResponseDto
            {
                Id = review.Id,
                Rating = review.Rating ?? 5,
                Comment = review.Comment,
                CreatedAt = review.CreatedAt,
                UserName = user?.FullName ?? "Thành viên"
            };
        }
    }
}