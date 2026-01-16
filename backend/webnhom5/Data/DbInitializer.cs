using BCrypt.Net;
using webnhom5.Models;

namespace webnhom5.Data
{
    public static class DbInitializer
    {
        public static void Seed(FashionDbContext context)
        {
            // 1. SEED MASTER DATA (MÀU & SIZE)
            if (!context.MasterColors.Any()) 
            {
                var colors = new List<MasterColor>
                {
                    new MasterColor { Name = "Đen", HexCode = "#000000" },
                    new MasterColor { Name = "Trắng", HexCode = "#FFFFFF" },
                    new MasterColor { Name = "Be", HexCode = "#F5F5DC" },
                    new MasterColor { Name = "Hồng Pastel", HexCode = "#FFD1DC" },
                    new MasterColor { Name = "Xanh Baby", HexCode = "#89CFF0" },
                    new MasterColor { Name = "Đỏ", HexCode = "#FF0000" },
                    new MasterColor { Name = "Xanh Navy", HexCode = "#000080" },
                    new MasterColor { Name = "Nâu Tây", HexCode = "#93785B" },
                    new MasterColor { Name = "Vàng", HexCode = "#FFD700" },
                    new MasterColor { Name = "Xám", HexCode = "#808080" }
                };
                context.MasterColors.AddRange(colors);
                context.SaveChanges();
            }

            if (!context.MasterSizes.Any())
            {
                var sizes = new List<MasterSize>
                {
                    new MasterSize { Name = "S" },
                    new MasterSize { Name = "M" },
                    new MasterSize { Name = "L" },
                    new MasterSize { Name = "XL" }
                };
                context.MasterSizes.AddRange(sizes);
                context.SaveChanges(); 
            }

            // 2. SEED DANH MỤC
            if (!context.Categories.Any()) // Chỉ tạo nếu chưa có
            {
                var catAo = new Category { Name = "Áo (Tops)", Slug = "ao-tops", ParentId = null, IsActive = true };
                var catQuan = new Category { Name = "Quần (Bottoms)", Slug = "quan-bottoms", ParentId = null, IsActive = true };
                var catVayDam = new Category { Name = "Váy & Đầm", Slug = "vay-dam", ParentId = null, IsActive = true };
                var catOuterwear = new Category { Name = "Áo Khoác", Slug = "ao-khoac-outerwear", ParentId = null, IsActive = true };

                context.Categories.AddRange(catAo, catQuan, catVayDam, catOuterwear);
                context.SaveChanges(); 

                var subCats = new List<Category>
                {
                    new Category { Name = "Áo Sơ Mi", Slug = "ao-so-mi", ParentId = catAo.Id, IsActive = true },
                    new Category { Name = "Áo Kiểu (Blouse)", Slug = "ao-kieu", ParentId = catAo.Id, IsActive = true },
                    new Category { Name = "Áo Thun (T-shirt)", Slug = "ao-thun", ParentId = catAo.Id, IsActive = true },
                    new Category { Name = "Áo Croptop", Slug = "ao-croptop", ParentId = catAo.Id, IsActive = true },
                    new Category { Name = "Baby Tee", Slug = "baby-tee", ParentId = catAo.Id, IsActive = true },
                    new Category { Name = "Quần Jeans", Slug = "quan-jeans", ParentId = catQuan.Id, IsActive = true },
                    new Category { Name = "Quần Tây", Slug = "quan-tay", ParentId = catQuan.Id, IsActive = true },
                    new Category { Name = "Quần Shorts", Slug = "quan-shorts", ParentId = catQuan.Id, IsActive = true },
                    new Category { Name = "Đầm Liền", Slug = "dam-lien", ParentId = catVayDam.Id, IsActive = true },
                    new Category { Name = "Chân Váy", Slug = "chan-vay", ParentId = catVayDam.Id, IsActive = true },
                    new Category { Name = "Blazer & Vest", Slug = "blazer-vest", ParentId = catOuterwear.Id, IsActive = true },
                    new Category { Name = "Cardigan & Len", Slug = "cardigan-len", ParentId = catOuterwear.Id, IsActive = true }
                };
                context.Categories.AddRange(subCats);
                context.SaveChanges();
            }

            // 3. SEED USERS
            if (!context.Users.Any())
            {
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");
                var users = new List<User>
                {
                    new User { FullName = "Admin Quản Trị", Email = "admin@webnhom5.com", PasswordHash = passwordHash, Role = "Admin", CreatedAt = DateTime.Now },
                    new User { FullName = "Nhân Viên", Email = "staff@webnhom5.com", PasswordHash = passwordHash, Role = "Staff", CreatedAt = DateTime.Now },
                    new User { FullName = "Khách Hàng Mẫu", Email = "khach@webnhom5.com", PasswordHash = passwordHash, Role = "Customer", CreatedAt = DateTime.Now }
                };
                context.Users.AddRange(users);
                context.SaveChanges();
            }

            // 4. SEED PRODUCTS 
            if (!context.Products.Any()) //Kiểm tra riêng bảng Products
            {
                int GetCatId(string slug) => context.Categories.First(c => c.Slug == slug).Id;
                int Col(string name) => context.MasterColors.First(c => c.Name.Contains(name)).Id;
                int Sz(string name) => context.MasterSizes.First(s => s.Name == name).Id;

                var products = new List<Product>();

                // --- 10 SẢN PHẨM MẪU ---

                // 1. Blazer
                products.Add(CreateProduct(GetCatId("blazer-vest"), 
                    "Blazer Hàn Quốc Dáng Rộng Minimalist", "blazer-han-quoc-dang-rong", 
                    "Tuyệt phẩm Blazer oversize mang đậm hơi thở thời trang Seoul. Chất liệu vải Tuyết Mưa (Vitex) cao cấp nhập khẩu: bề mặt lì, đanh mịn, đứng form hoàn hảo và khả năng hạn chế nhăn tối đa sau nhiều giờ mặc. Thiết kế tối giản (Minimalist) nhưng tinh tế từng đường kim mũi chỉ, nâng tầm khí chất thanh lịch, sang trọng cho quý cô công sở hiện đại.", 
                    550000, "/images/products/blazer-han-quoc-dang-rong.jpg", 
                    new[] { Col("Be"), Col("Đen") }, new[] { Sz("S"), Sz("M"), Sz("L") }, 3));

                // 2. Đầm Dự Tiệc
                products.Add(CreateProduct(GetCatId("dam-lien"), 
                    "Đầm Dự Tiệc Taffeta Nơ Vai Sang Trọng", "dam-du-tiec-sang-trong", 
                    "Quyến rũ và kiêu sa với thiết kế đầm dự tiệc từ chất liệu Taffeta ánh kim thượng hạng. Phom váy A-line nhẹ nhàng giúp che khuyết điểm vòng 2 hoàn hảo. Điểm nhấn đắt giá là hai chiếc nơ đính kết thủ công tinh tế trên bờ vai, tôn vinh nét đẹp nữ tính đầy quyền lực. Gam màu đỏ đô nồng nàn giúp bạn trở thành tâm điểm của mọi ánh nhìn trong những buổi tiệc đêm.", 
                    850000, "/images/products/dam-du-tiec-gan-no-hai-ben.jpg", 
                    new[] { Col("Đỏ") }, new[] { Sz("S"), Sz("M"), Sz("L") }, 2));

                // 3. Sơ Mi
                products.Add(CreateProduct(GetCatId("ao-so-mi"), 
                    "Sơ Mi Lụa Hàng Châu Tay Đính Nơ", "somi-kieu-dinh-no", 
                    "Sự giao thoa ngọt ngào giữa nét cổ điển và hiện đại. Áo sơ mi được dệt từ sợi lụa Hàng Châu mềm mại, thoáng mát, nuông chiều làn da nhạy cảm nhất. Thiết kế tay áo bồng bềnh điểm xuyết chi tiết nơ thắt thủ công tạo nên vẻ đẹp tiểu thư đài các. Item hoàn hảo để phối cùng chân váy bút chì cho những ngày công sở cần sự tinh tế, chỉn chu.", 
                    320000, "/images/products/ao-so-mi-tay-nhung-dinh-no-hai-ben.jpg", 
                    new[] { Col("Trắng"), Col("Be") }, new[] { Sz("S"), Sz("M"), Sz("L"), Sz("XL") }, 2));

                // 4. Quần Tây
                products.Add(CreateProduct(GetCatId("quan-tay"), 
                    "Quần Tây Wide Leg Hack Dáng Đỉnh Cao", "quan-tay-cong-so-ong-suong", 
                    "Chiếc quần 'hack dáng' thần thánh mà mọi cô gái GenZ đều khao khát. Form quần ống suông rộng (Wide Leg) với phần cạp siêu cao giúp kéo dài đôi chân miên man và che khuyết điểm. Chất liệu vải Ruby Hàn Quốc dày dặn, rủ nhẹ, co giãn 4 chiều mang lại sự thoải mái tuyệt đối khi di chuyển. Kỹ thuật may giấu đường chỉ tinh tế chuẩn hàng hiệu.", 
                    420000, "/images/products/quan-tay-cong-so-ong-rong.jpg", 
                    new[] { Col("Đen"), Col("Trắng"), Col("Nâu Tây") }, new[] { Sz("M"), Sz("L"), Sz("XL") }, 3));

                // 5. Baby Tee
                products.Add(CreateProduct(GetCatId("baby-tee"), 
                    "Baby Tee Cotton Premium Dáng Slim-fit", "baby-tee-tron-basic", 
                    "Đơn giản là đỉnh cao của sự tinh tế. Chiếc Baby Tee phom dáng Slim-fit ôm nhẹ cơ thể, tôn lên đường cong khỏe khoắn đầy sức sống. Chất liệu 100% Cotton Premium định lượng 250gsm dày dặn, thấm hút mồ hôi vượt trội, cam kết không bai dão sau nhiều lần giặt. Bảng màu Trendy cân mọi outfit từ quần Jeans bụi bặm đến chân váy điệu đà.", 
                    190000, "/images/products/babytee-tron.jpg", 
                    new[] { Col("Trắng"), Col("Đen"), Col("Be"), Col("Hồng Pastel"), Col("Đỏ"), Col("Xám") }, new[] { Sz("S"), Sz("M"), Sz("L"), Sz("XL") }, 2));

                // 6. Chân Váy Tennis
                products.Add(CreateProduct(GetCatId("chan-vay"), 
                    "Chân Váy Tennis Xếp Ly Cạp Cao", "chan-vay-tennis", 
                    "Biểu tượng của năng lượng trẻ trung bùng nổ. Chân váy xếp ly Tennis được may tỉ mỉ, các nếp xếp sắc sảo được định hình bằng công nghệ ép nhiệt bền bỉ. Chất liệu Kaki Tuyết dày dặn. Đặc biệt tích hợp quần bảo hộ thun lạnh bên trong giúp nàng tự tin vận động, chạy nhảy suốt ngày dài mà không lo ngại sự cố.", 
                    250000, "/images/products/chan-vay-tennis-xep-ly-cap-cao.jpg", 
                    new[] { Col("Đen"), Col("Trắng"), Col("Be"), Col("Xám") }, new[] { Sz("S"), Sz("M"), Sz("L"), Sz("XL") }, 5));

                // 7. Áo Tweed
                products.Add(CreateProduct(GetCatId("blazer-vest"), 
                    "Áo Khoác Dạ Tweed Viền Sang Trọng", "ao-da-tweed-sang-trong", 
                    "Định nghĩa của sự đẳng cấp và quý phái. Áo khoác được chế tác từ vải Dạ Tweed dệt sợi kim tuyến lấp lánh thủ công. Cấu trúc 2 lớp dày dặn với lớp lót lụa Habutai êm ái. Thiết kế viền lé tương phản tinh xảo cùng hàng cúc ngọc trai sang trọng tạo nên vẻ đẹp tiểu thư đài các. Mảnh ghép hoàn hảo cho những set đồ thu đông sành điệu.", 
                    890000, "/images/products/ao-khoac-da-tweed-vien.jpg", 
                    new[] { Col("Đen"), Col("Trắng") }, new[] { Sz("S"), Sz("M") }, 1));

                // 8. Áo Thun
                products.Add(CreateProduct(GetCatId("ao-thun"), 
                    "Áo Thun Basic Cotton Organic", "ao-thun-basic", 
                    "Chất lượng làm nên sự khác biệt. Dòng áo thun Premium Basic được sản xuất từ sợi bông Cotton Organic thân thiện với làn da. Công nghệ dệt Compact giúp bề mặt vải nhẵn mịn, hạn chế tối đa xù lông sau nhiều lần giặt. Form dáng Unisex rộng rãi, thoải mái, là item bền bỉ đi cùng năm tháng trong tủ đồ của bạn.", 
                    150000, "/images/products/ao-thun-tron.jpg", 
                    new[] { Col("Đen"), Col("Trắng"), Col("Xanh Navy"), Col("Be"), Col("Đỏ"), Col("Nâu Tây") }, new[] { Sz("S"), Sz("M"), Sz("L"), Sz("XL") }, 6));

                // 9. Cardigan
                products.Add(CreateProduct(GetCatId("cardigan-len"), 
                    "Cardigan Len Lông Cừu Mùa Thu", "cardigan-len-cao-cap", 
                    "Sự ấm áp dịu dàng như cái ôm của mùa thu. Áo Cardigan được dệt từ sợi len lông cừu tổng hợp mềm mịn, tuyệt đối không gây dặm ngứa. Kết cấu len đan chắc chắn nhưng vẫn giữ được độ xốp nhẹ. Dáng áo Basic dễ dàng khoác ngoài váy dây hoặc phối layer cùng sơ mi, mang lại vẻ ngoài Vintage đầy cuốn hút.", 
                    180000, "/images/products/cardigan-len-mua-thu-thanh-lich.jpg", 
                    new[] { Col("Be"), Col("Nâu Tây") }, new[] { Sz("S"), Sz("M") }, 4));

                // 10. Váy Hoa Nhí
                products.Add(CreateProduct(GetCatId("dam-lien"), 
                    "Váy Hoa Nhí Voan Tơ Vintage", "vay-hoa-nhi-di-bien", 
                    "Mang cả vườn hoa rực rỡ vào tủ đồ của bạn. Đầm dáng dài thướt tha với chất liệu Voan Tơ Hàn Quốc bay bổng, nhẹ nhàng như mây trời. Họa tiết hoa nhí Vintage in nhiệt sắc nét, bền màu. Thiết kế bo chun eo thoải mái, là 'chân ái' cho những chuyến du lịch biển hay buổi hẹn hò lãng mạn dưới ánh hoàng hôn.", 
                    450000, "/images/products/vay-dai-hoa-nhi-di-bien.jpg", 
                    new[] { Col("Vàng"), Col("Hồng Pastel"), Col("Đỏ"), Col("Trắng"), Col("Đen") }, new[] { Sz("M"), Sz("L") }, 4));

                context.Products.AddRange(products);
                context.SaveChanges();
            }
        }

        private static Product CreateProduct(int catId, string name, string slug, string desc, decimal price, string img, int[] colorIds, int[] sizeIds, int extraImages = 3)
        {
            var p = new Product
            {
                Name = name,
                Slug = slug,
                Description = desc,
                Price = price,
                CategoryId = catId,
                Thumbnail = img, 
                IsActive = true,
                ProductVariants = new List<ProductVariant>(),
                ProductImages = new List<ProductImage>() 
            };

            string imgName = Path.GetFileNameWithoutExtension(img);
            string imgExt = Path.GetExtension(img);
            string dir = "/images/products"; 

            for (int i = 1; i <= extraImages; i++)
            {
                p.ProductImages.Add(new ProductImage 
                { 
                    ImageUrl = $"{dir}/{imgName}-{i}{imgExt}", 
                    SortOrder = i 
                });
            }

            foreach(var cId in colorIds)
            {
                foreach(var sId in sizeIds)
                {
                    string sku = $"{slug}-{cId}-{sId}".ToUpper(); 
                    p.ProductVariants.Add(new ProductVariant
                    {
                        ColorId = cId,
                        SizeId = sId,
                        Sku = sku,
                        Quantity = 20,
                        PriceModifier = 0
                    });
                }
            }
            return p;
        }
    }
}