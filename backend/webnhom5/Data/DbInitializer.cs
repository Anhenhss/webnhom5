using BCrypt.Net;
using webnhom5.Models;
using System.Collections.Generic;
using System.Linq;
using System;

namespace webnhom5.Data
{
    public static class DbInitializer
    {
        public static void Seed(FashionDbContext context)
        {
            // 1. SEED DỮ LIỆU TÀI KHOẢN
            if (!context.Users.Any()) // CHỈ TẠO DỮ LIỆU TÀI KHOẢN (Nếu bảng Users đang trống)
            {
                // Tạo mật khẩu mã hóa chung là "123456" cho tất cả các tài khoản
                var passwordHash = BCrypt.Net.BCrypt.HashPassword("123456");

                var users = new List<User>();

                // 1. TẠO TÀI KHOẢN ADMIN
                users.Add(new User
                {
                    FullName = "WebNhom5",
                    Email = "admin@webnhom5.com",
                    PasswordHash = passwordHash,
                    Role = "Admin",
                    IsLocked = false,
                    CreatedAt = DateTime.Now
                });

                // 2. TẠO TÀI KHOẢN NHÂN VIÊN
                users.Add(new User
                {
                    FullName = "Nguyễn Văn Nhân",
                    Email = "staff@webnhom5.com",
                    PasswordHash = passwordHash,
                    Role = "Staff",
                    IsLocked = false,
                    CreatedAt = DateTime.Now
                });

                // 3. TẠO DANH SÁCH 20 KHÁCH HÀNG VỚI TÊN THẬT
                string[] customerNames = {
                    "Nguyễn Thị Nga", "Trần Văn An", "Lê Thị Bích", "Phạm Hoàng Long",
                    "Hoàng Thu Thảo", "Vũ Minh Tuấn", "Phan Thanh Hải", "Đặng Thùy Chi",
                    "Bùi Quang Huy", "Đỗ Kim Ngân", "Ngô Đức Phúc", "Trương Mỹ Linh",
                    "Lý Việt Hoàng", "Dương Hồng Nhung", "Hồ Xuân Hùng", "Đinh Mạnh Cường",
                    "Võ Thị Tuyết", "Cao Minh Khôi", "Mai Phương Thúy", "Trịnh Công Sơn"
                };

                string[] customerEmails = {
                    "nganthi@gmail.com", "antran@gmail.com", "bichle@gmail.com", "longpham@gmail.com",
                    "thaoh@gmail.com", "tuanvu@gmail.com", "haiphan@gmail.com", "chidang@gmail.com",
                    "huybui@gmail.com", "ngando@gmail.com", "phucngo@gmail.com", "linhtruong@gmail.com",
                    "hoangly@gmail.com", "nhungduong@gmail.com", "hungho@gmail.com", "cuongdinh@gmail.com",
                    "tuyetvo@gmail.com", "khoicao@gmail.com", "thuymai@gmail.com", "sontrinh@gmail.com"
                };

                for (int i = 0; i < 20; i++)
                {
                    users.Add(new User
                    {
                        FullName = customerNames[i],
                        Email = customerEmails[i],
                        PasswordHash = passwordHash,
                        Role = "Customer",
                        IsLocked = false,
                        CreatedAt = DateTime.Now.AddDays(-i) // Giả lập thời gian đăng ký khác nhau
                    });
                }

                context.Users.AddRange(users);
                context.SaveChanges();
            }
            // 2. SEED DANH MỤC SẢN PHẨM PHÂN CẤP
            if (!context.Categories.Any())
            {
                // --- BƯỚC A: TẠO CÁC DANH MỤC CHA ---
                var catTops = new Category { Name = "Áo (Tops)", Slug = "ao-tops", IsActive = true };
                var catBottoms = new Category { Name = "Quần (Bottoms)", Slug = "quan-bottoms", IsActive = true };
                var catDresses = new Category { Name = "Váy & Đầm", Slug = "vay-va-dam", IsActive = true };
                var catJackets = new Category { Name = "Áo Khoác", Slug = "ao-khoac", IsActive = true };
                var catAoDai = new Category { Name = "Áo Dài", Slug = "ao-dai", IsActive = true };

                context.Categories.AddRange(catTops, catBottoms, catDresses, catJackets, catAoDai);
                context.SaveChanges(); // Lưu để SQL sinh ra ID cho các danh mục cha

                // --- BƯỚC B: TẠO CÁC DANH MỤC CON DỰA TRÊN ID CHA ---
                var subCategories = new List<Category>
                {
                    // Con của Áo (Tops)
                    new Category { Name = "Áo Sơ Mi", Slug = "ao-so-mi", ParentId = catTops.Id, IsActive = true },
                    new Category { Name = "Áo Kiểu", Slug = "ao-kieu", ParentId = catTops.Id, IsActive = true },
                    new Category { Name = "Áo Thun", Slug = "ao-thun", ParentId = catTops.Id, IsActive = true },
                    new Category { Name = "Áo Croptop", Slug = "ao-croptop", ParentId = catTops.Id, IsActive = true },
                    new Category { Name = "Baby Tee", Slug = "baby-tee", ParentId = catTops.Id, IsActive = true },

                    // Con của Quần (Bottoms)
                    new Category { Name = "Quần Jeans", Slug = "quan-jeans", ParentId = catBottoms.Id, IsActive = true },
                    new Category { Name = "Quần Tây", Slug = "quan-tay", ParentId = catBottoms.Id, IsActive = true },
                    new Category { Name = "Quần Shorts", Slug = "quan-shorts", ParentId = catBottoms.Id, IsActive = true },

                    // Con của Váy & Đầm
                    new Category { Name = "Đầm Liền", Slug = "dam-lien", ParentId = catDresses.Id, IsActive = true },
                    new Category { Name = "Chân Váy", Slug = "chan-vay", ParentId = catDresses.Id, IsActive = true },

                    // Con của Áo Khoác
                    new Category { Name = "Blazer & Vest", Slug = "blazer-vest", ParentId = catJackets.Id, IsActive = true },
                    new Category { Name = "Cardigan & Len", Slug = "cardigan-len", ParentId = catJackets.Id, IsActive = true },
                    new Category { Name = "Hoodie", Slug = "hoodie", ParentId = catJackets.Id, IsActive = true }
                };

                context.Categories.AddRange(subCategories);
                context.SaveChanges();
            }
            // 3. SEED DỮ LIỆU MÀU SẮC (MasterColors)
            if (!context.MasterColors.Any())
            {
                var colors = new List<MasterColor>
                {
                    new MasterColor { Name = "Đen", HexCode = "#000000" },
                    new MasterColor { Name = "Trắng", HexCode = "#FFFFFF" },
                    new MasterColor { Name = "Xám", HexCode = "#808080" },
                    new MasterColor { Name = "Be (Beige)", HexCode = "#F5F5DC" },
                    new MasterColor { Name = "Hồng Pastel", HexCode = "#FFD1DC" },
                    new MasterColor { Name = "Xanh Baby", HexCode = "#89CFF0" },
                    new MasterColor { Name = "Đỏ", HexCode = "#FF0000" },
                    new MasterColor { Name = "Vàng", HexCode = "#FFFF00" },
                    new MasterColor { Name = "Xanh Navy", HexCode = "#000080" },
                    new MasterColor { Name = "Nâu Tây", HexCode = "#964B00" }
                };

                context.MasterColors.AddRange(colors);
                context.SaveChanges();
            }

            // 4. SEED DỮ LIỆU KÍCH THƯỚC (MasterSizes)
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
            // 5. SEED PRODUCTS 
            if (!context.Products.Any())
            {

                // 11. Áo Kiểu (Danh mục: ao-kieu)
                CreateProduct(context, GetCatId(context, "ao-kieu"),
                    "Áo Kiểu Trễ Vai Phối Bèo Tầng", "ao-kieu-tre-vai-beo-tang",
                    "Chất liệu voan cát mềm mại, không nhăn. Thiết kế trễ vai quyến rũ phối bèo tầng tạo độ bồng bềnh. Sản xuất tại Việt Nam. Phù hợp diện vào mùa Hè, trong các buổi tiệc ngoài trời hoặc đi dạo phố.",
                    350000, "/images/products/ao-kieu-tre-vai.jpg",
                    new[] { Col(context, "Trắng"), Col(context, "Hồng Pastel") }, new[] { Sz(context, "S"), Sz(context, "M") }, 1);

                // 12. Áo Croptop (Danh mục: ao-croptop)
                CreateProduct(context, GetCatId(context, "ao-croptop"),
                    "Áo Croptop Len Tăm Cổ Vuông", "ao-croptop-len-tam",
                    "Chất liệu len tăm co giãn tốt, ôm sát tôn dáng. Thiết kế cổ vuông hiện đại giúp khoe xương quai xanh. Sản xuất tại Việt Nam. Phù hợp cho mùa Xuân và mùa Hè, dễ dàng phối cùng quần cạp cao.",
                    220000, "/images/products/ao-croptop-len-tam.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Be") }, new[] { Sz(context, "S"), Sz(context, "M") }, 1);

                // 13. Quần Jeans (Danh mục: quan-jeans)
                CreateProduct(context, GetCatId(context, "quan-jeans"),
                    "Quần Jeans Baggy Denim Rách Gối", "quan-jeans-baggy-rach",
                    "Chất liệu Denim dày dặn, bền màu, độ co giãn nhẹ. Phom dáng Baggy thoải mái với điểm nhấn rách gối bụi bặm. Sản xuất tại Việt Nam. Phù hợp mặc quanh năm, đặc biệt là phong cách dạo phố năng động.",
                    480000, "/images/products/quan-jeans-baggy.jpg",
                    new[] { Col(context, "Xanh Baby") }, new[] { Sz(context, "M"), Sz(context, "L"), Sz(context, "XL") }, 1);

                // 14. Quần Shorts (Danh mục: quan-shorts)
                CreateProduct(context, GetCatId(context, "quan-shorts"),
                    "Quần Shorts Kaki Basic Năng Động", "quan-shorts-kaki-basic",
                    "Chất liệu Kaki 100% cotton thoáng mát, thấm hút mồ hôi. Thiết kế đơn giản, đường may chắc chắn. Sản xuất tại Việt Nam. Sản phẩm dành riêng cho mùa Hè nắng nóng và các hoạt động dã ngoại.",
                    180000, "/images/products/quan-shorts-kaki.jpg",
                    new[] { Col(context, "Xám"), Col(context, "Be") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 1);

                // 15. Hoodie (Danh mục: hoodie)
                CreateProduct(context, GetCatId(context, "hoodie"),
                    "Áo Hoodie Nỉ Bông Oversize Streetwear", "hoodie-ni-bong-oversize",
                    "Chất liệu nỉ bông dày dặn, mặt trong mịn màng giữ nhiệt tốt. Phom dáng Oversize chuẩn phong cách Streetwear Hàn Quốc. Sản xuất tại Việt Nam. Là 'vũ khí' giữ ấm hoàn hảo cho mùa Thu - Đông.",
                    390000, "/images/products/hoodie-streetwear.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Xám") }, new[] { Sz(context, "M"), Sz(context, "L"), Sz(context, "XL") }, 1);

                // 16. Áo Dài (Danh mục: ao-dai)
                CreateProduct(context, GetCatId(context, "ao-dai"),
                    "Áo Dài Cách Tân Gấm Hoa Chìm", "ao-dai-cach-tan-gam",
                    "Chất liệu gấm thượng hạng với họa tiết hoa in chìm tinh tế, sang trọng. Phom dáng cách tân trẻ trung nhưng vẫn giữ nét truyền thống. Sản xuất tại Việt Nam. Phù hợp cho dịp Lễ, Tết hoặc các sự kiện quan trọng.",
                    1200000, "/images/products/ao-dai-gam.jpg",
                    new[] { Col(context, "Đỏ"), Col(context, "Vàng") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 1);

                // 17. Áo Kiểu (Danh mục: ao-kieu)
                CreateProduct(context, GetCatId(context, "ao-kieu"),
                    "Áo Kiểu Peplum Tay Phồng Thanh Lịch", "ao-kieu-peplum-tay-phong",
                    "Chất liệu lụa satin cao cấp, bề mặt bóng nhẹ sang trọng. Thiết kế Peplum che khuyết điểm vòng 2 kết hợp tay phồng điệu đà. Sản xuất tại Hàn Quốc. Phù hợp mặc đi làm hoặc đi tiệc vào mùa Thu.",
                    450000, "/images/products/ao-peplum.jpg",
                    new[] { Col(context, "Trắng"), Col(context, "Xanh Navy") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 1);

                // 18. Áo Croptop (Danh mục: ao-croptop)
                CreateProduct(context, GetCatId(context, "ao-croptop"),
                    "Áo Croptop Sơ Mi Phối Nút Gỗ", "ao-croptop-somi-nut-go",
                    "Chất liệu Linen (vải lanh) tự nhiên, cực kỳ thoáng mát. Thiết kế dáng lửng trẻ trung phối hàng nút gỗ phong cách Vintage. Sản xuất tại Việt Nam. Phù hợp nhất cho mùa Hè hoặc các chuyến du lịch biển.",
                    280000, "/images/products/ao-croptop-linen.jpg",
                    new[] { Col(context, "Be"), Col(context, "Trắng") }, new[] { Sz(context, "S"), Sz(context, "M") }, 1);

                // 19. Quần Jeans (Danh mục: quan-jeans)
                CreateProduct(context, GetCatId(context, "quan-jeans"),
                    "Quần Jeans Ống Rộng Minimalist Style", "quan-jeans-ong-rong-minimalist",
                    "Chất liệu vải bò chính phẩm, đứng phom. Thiết kế tối giản, ống rộng suông dài giúp tôn dáng tối đa. Sản xuất tại Việt Nam. Phù hợp mặc quanh năm và rất dễ phối cùng nhiều loại áo khác nhau.",
                    520000, "/images/products/quan-jeans-wide-leg.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Xanh Baby") }, new[] { Sz(context, "M"), Sz(context, "L") }, 1);

                // 20. Áo Dài (Danh mục: ao-dai)
                CreateProduct(context, GetCatId(context, "ao-dai"),
                    "Áo Dài Tơ Tằm Thêu Tay Thủ Công", "ao-dai-to-tam-theu",
                    "Chất liệu tơ tằm thiên nhiên mềm mịn như lụa. Điểm nhấn là các họa tiết thêu tay thủ công tỉ mỉ từng đường kim mũi chỉ. Sản xuất tại Làng lụa Vạn Phúc, Việt Nam. Phù hợp cho mùa Xuân và các dịp cưới hỏi.",
                    2500000, "/images/products/ao-dai-to-tam.jpg",
                    new[] { Col(context, "Hồng Pastel"), Col(context, "Trắng") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 1);
                    
                // 1. Blazer
                CreateProduct(context, GetCatId(context, "blazer-vest"),
                    "Blazer Hàn Quốc Dáng Rộng Minimalist", "blazer-han-quoc-dang-rong",
                    "Tuyệt phẩm Blazer oversize mang đậm hơi thở Seoul. Chất liệu vải Tuyết Mưa cao cấp, đứng form hoàn hảo.",
                    550000, "/images/products/blazer-han-quoc-dang-rong.jpg",
                    new[] { Col(context, "Be"), Col(context, "Đen") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 3);

                // 2. Đầm Dự Tiệc
                CreateProduct(context, GetCatId(context, "dam-lien"),
                    "Đầm Dự Tiệc Taffeta Nơ Vai Sang Trọng", "dam-du-tiec-sang-trong",
                    "Quyến rũ và kiêu sa với chất liệu Taffeta ánh kim. Điểm nhấn nơ vai thủ công tinh tế.",
                    850000, "/images/products/dam-du-tiec-gan-no-hai-ben.jpg",
                    new[] { Col(context, "Đỏ") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 2);

                // 3. Sơ Mi
                CreateProduct(context, GetCatId(context, "ao-so-mi"),
                    "Sơ Mi Lụa Hàng Châu Tay Đính Nơ", "somi-kieu-dinh-no",
                    "Dệt từ sợi lụa Hàng Châu mềm mại. Thiết kế tay bồng điệu đà, phù hợp công sở thanh lịch.",
                    320000, "/images/products/ao-so-mi-tay-nhung-dinh-no-hai-ben.jpg",
                    new[] { Col(context, "Trắng"), Col(context, "Be") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 2);

                // 4. Quần Tây
                CreateProduct(context, GetCatId(context, "quan-tay"),
                    "Quần Tây Wide Leg Hack Dáng Đỉnh Cao", "quan-tay-cong-so-ong-suong",
                    "Form ống suông rộng, cạp siêu cao giúp kéo dài đôi chân. Vải Ruby Hàn Quốc co giãn 4 chiều.",
                    420000, "/images/products/quan-tay-cong-so-ong-rong.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Nâu Tây") }, new[] { Sz(context, "M"), Sz(context, "L"), Sz(context, "XL") }, 3);

                // 5. Baby Tee
                CreateProduct(context, GetCatId(context, "baby-tee"),
                    "Baby Tee Cotton Premium Dáng Slim-fit", "baby-tee-tron-basic",
                    "Chất liệu 100% Cotton Premium dày dặn. Phom ôm nhẹ tôn dáng khỏe khoắn.",
                    190000, "/images/products/babytee-tron.jpg",
                    new[] { Col(context, "Trắng"), Col(context, "Hồng Pastel"), Col(context, "Xanh Baby") }, new[] { Sz(context, "S"), Sz(context, "M") }, 2);

                // 6. Chân Váy Tennis
                CreateProduct(context, GetCatId(context, "chan-vay"),
                    "Chân Váy Tennis Xếp Ly Cạp Cao", "chan-vay-tennis",
                    "Năng lượng trẻ trung với nếp xếp sắc sảo. Có quần bảo hộ bên trong nàng tự tin vận động.",
                    250000, "/images/products/chan-vay-tennis-xep-ly-cap-cao.jpg",
                    new[] { Col(context, "Trắng"), Col(context, "Xám") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L") }, 5);

                // 7. Áo Tweed
                CreateProduct(context, GetCatId(context, "blazer-vest"),
                    "Áo Khoác Dạ Tweed Viền Sang Trọng", "ao-da-tweed-sang-trong",
                    "Vải dạ Tweed dệt kim tuyến lấp lánh. Hàng cúc ngọc trai tạo vẻ đẹp tiểu thư đài các.",
                    890000, "/images/products/ao-khoac-da-tweed-vien.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Trắng") }, new[] { Sz(context, "S"), Sz(context, "M") }, 1);

                // 8. Áo Thun
                CreateProduct(context, GetCatId(context, "ao-thun"),
                    "Áo Thun Basic Cotton Organic", "ao-thun-basic",
                    "Sợi bông Cotton Organic thân thiện. Form Unisex rộng rãi, không xù lông sau khi giặt.",
                    150000, "/images/products/ao-thun-tron.jpg",
                    new[] { Col(context, "Đen"), Col(context, "Xanh Navy"), Col(context, "Xám") }, new[] { Sz(context, "S"), Sz(context, "M"), Sz(context, "L"), Sz(context, "XL") }, 6);

                // 9. Cardigan
                CreateProduct(context, GetCatId(context, "cardigan-len"),
                    "Cardigan Len Lông Cừu Mùa Thu", "cardigan-len-cao-cap",
                    "Sợi len lông cừu mềm mịn, ấm áp. Dáng áo Vintage dễ dàng phối layer.",
                    180000, "/images/products/cardigan-len-mua-thu-thanh-lich.jpg",
                    new[] { Col(context, "Be"), Col(context, "Nâu Tây") }, new[] { Sz(context, "S"), Sz(context, "M") }, 4);

                // 10. Váy Hoa Nhí
                CreateProduct(context, GetCatId(context, "dam-lien"),
                    "Váy Hoa Nhí Voan Tơ Vintage", "vay-hoa-nhi-di-bien",
                    "Chất liệu Voan Tơ Hàn Quốc bay bổng. Họa tiết Vintage sắc nét, phù hợp du lịch biển.",
                    450000, "/images/products/vay-dai-hoa-nhi-di-bien.jpg",
                    new[] { Col(context, "Vàng"), Col(context, "Hồng Pastel") }, new[] { Sz(context, "M"), Sz(context, "L") }, 4);

            }
            // 6. SEED DỮ LIỆU KHUYẾN MÃI (Vouchers/Promotions)
            if (!context.Promotions.Any())
            {
                var promotions = new List<Promotion>
                {
                    // Voucher 1: Giảm theo % cho đơn hàng bất kỳ
                    // new Promotion
                    // {
                    //     Name = "Chào mừng bạn mới",
                    //     DiscountType = "PERCENTAGE",
                    //     DiscountValue = 10, // Giảm 10%
                    //     StartDate = DateTime.Now.AddDays(-1),
                    //     EndDate = DateTime.Now.AddMonths(1),
                    //     IsActive = true,
                    //     Priority = 10,
                    //     PromotionConditions = new List<PromotionCondition>
                    //     {
                    //         new PromotionCondition { Field = "TotalAmount", Operator = "GREATER_THAN", Value = "0" }
                    //     }
                    // },

                    // Voucher 2: Giảm số tiền cố định cho đơn hàng giá trị cao
                    new Promotion
                    {
                        Name = "Siêu sale mùa hè",
                        DiscountType = "FIXED_AMOUNT",
                        DiscountValue = 50000, // Giảm 50.000đ
                        StartDate = DateTime.Now.AddDays(-1),
                        EndDate = DateTime.Now.AddMonths(2),
                        IsActive = true,
                        Priority = 5,
                        PromotionConditions = new List<PromotionCondition>
                        {
                            new PromotionCondition { Field = "TotalAmount", Operator = "GREATER_OR_EQUAL", Value = "500000" }
                        }
                    },

                    // Voucher 3: Khuyến mãi đặc biệt (Voucher VIP)
                    new Promotion
                    {
                        Name = "Tri ân khách hàng thân thiết",
                        DiscountType = "PERCENTAGE",
                        DiscountValue = 15, // Giảm 15%
                        StartDate = DateTime.Now.AddDays(-5),
                        EndDate = DateTime.Now.AddDays(30),
                        IsActive = true,
                        Priority = 8,
                        PromotionConditions = new List<PromotionCondition>
                        {
                            new PromotionCondition { Field = "TotalAmount", Operator = "GREATER_OR_EQUAL", Value = "1000000" }
                        }
                    },

                    // Voucher 4: Hỗ trợ phí vận chuyển
                    new Promotion
                    {
                        Name = "Giảm giá phí vận chuyển",
                        DiscountType = "FIXED_AMOUNT",
                        DiscountValue = 30000, // Giảm 30.000đ
                        StartDate = DateTime.Now.AddDays(-2),
                        EndDate = DateTime.Now.AddMonths(3),
                        IsActive = true,
                        Priority = 1,
                        PromotionConditions = new List<PromotionCondition>
                        {
                            new PromotionCondition { Field = "TotalAmount", Operator = "GREATER_OR_EQUAL", Value = "300000" }
                        }
                    }
                };

                context.Promotions.AddRange(promotions);
                context.SaveChanges();
            }
            // 7. SEED DỮ LIỆU ĐƠN HÀNG (Tính toán chuẩn Total và Shipping)
            if (!context.Orders.Any())
            {
                var random = new Random();
                var customers = context.Users.Where(u => u.Role == "Customer").ToList();
                var variants = context.ProductVariants.ToList();

                if (customers.Any() && variants.Any())
                {
                    for (int i = 1; i <= 30; i++)
                    {
                        var customer = customers[random.Next(customers.Count)];
                        var orderDate = DateTime.Now.AddDays(-random.Next(0, 7));
                        
                        // Khởi tạo các biến tính toán
                        decimal subTotal = 0;
                        decimal shippingFee = 30000; // Lưu cứng 30k tiền ship theo ý em
                        var details = new List<OrderDetail>();

                        // Tạo ngẫu nhiên 1-3 món hàng trước để tính tổng tiền
                        int numItems = random.Next(1, 4); 
                        for (int j = 0; j < numItems; j++)
                        {
                            var variant = variants[random.Next(variants.Count)];
                            var product = context.Products.Find(variant.ProductId);
                            if (product == null) continue;

                            int qty = random.Next(1, 3);
                            decimal unitPrice = product.Price;

                            details.Add(new OrderDetail
                            {
                                ProductVariantId = variant.Id,
                                Quantity = qty,
                                UnitPrice = unitPrice,
                                SnapshotProductName = product.Name,
                                SnapshotSku = variant.Sku,
                                SnapshotThumbnail = product.Thumbnail
                            });
                            
                            subTotal += (unitPrice * qty);
                        }

                        // Sau khi có subTotal mới tạo Order hoàn chỉnh
                        var order = new Order
                        {
                            OrderCode = "ORD" + DateTime.Now.ToString("yyyyMMdd") + i.ToString("D3"),
                            UserId = customer.Id,
                            OrderDate = orderDate,
                            Status = (i % 5 == 0) ? 4 : (i % 3 == 0) ? 3 : 0, 
                            
                            // --- PHẦN TIỀN TỆ QUAN TRỌNG ---
                            TotalAmount = subTotal,            // Tổng tiền hàng
                            ShippingFee = shippingFee,          // Tiền ship 30k
                            FinalAmount = subTotal + shippingFee, // Tổng thanh toán cuối cùng
                            
                            PaymentMethod = (i % 2 == 0) ? "VNPAY" : "COD",
                            ShippingName = customer.FullName,
                            ShippingAddress = "123 Đường số " + i + ", Biên Hòa, Đồng Nai",
                            ShippingPhone = "090123456" + i,
                            OrderDetails = details
                        };

                        context.Orders.Add(order);
                    }
                    context.SaveChanges();
                }
            }
        }
        private static int GetCatId(FashionDbContext context, string slug) => context.Categories.First(c => c.Slug == slug).Id;
        private static int Col(FashionDbContext context, string name) => context.MasterColors.First(c => c.Name.Contains(name)).Id;
        private static int Sz(FashionDbContext context, string name) => context.MasterSizes.First(s => s.Name == name).Id;

        private static void CreateProduct(FashionDbContext context, int catId, string name, string slug, string desc, decimal price, string thumb, int[] colors, int[] sizes, int galleryCount)
        {
            // 1. Tạo sản phẩm chính
            var product = new Product
            {
                CategoryId = catId,
                Name = name,
                Slug = slug,
                Description = desc,
                Price = price,
                Thumbnail = thumb,
                IsActive = true
            };
            context.Products.Add(product);
            context.SaveChanges(); // Lưu để lấy ProductId

            // 2. Tự động tạo ảnh đính kèm (Gallery) theo số lượng yêu cầu
            if (galleryCount > 0)
            {
                string folder = thumb.Substring(0, thumb.LastIndexOf('.')); // Lấy đường dẫn bỏ đuôi .jpg
                for (int i = 1; i <= galleryCount; i++)
                {
                    context.ProductImages.Add(new ProductImage
                    {
                        ProductId = product.Id,
                        ImageUrl = $"{folder}-{i}.jpg", // VD: blazer-han-quoc-1.jpg
                        SortOrder = i
                    });
                }
            }

            // 3. Tự động tạo biến thể (Variants) cho mọi tổ hợp Màu & Size
            foreach (var colorId in colors)
            {
                foreach (var sizeId in sizes)
                {
                    context.ProductVariants.Add(new ProductVariant
                    {
                        ProductId = product.Id,
                        ColorId = colorId,
                        SizeId = sizeId,
                        Quantity = 50, // Tồn kho mặc định 50
                        Sku = $"{slug.ToUpper().Replace("-", "")}-{colorId}-{sizeId}", // VD: BLAZER-1-2
                        PriceModifier = 0
                    });
                }
            }
            context.SaveChanges();
        }
    }
}