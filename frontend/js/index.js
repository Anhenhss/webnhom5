// Chỉ cần đổi port nếu backend chạy cổng khác
const BACKEND_URL = 'http://localhost:5195'; 

document.addEventListener('DOMContentLoaded', () => {
    // Gọi các hàm tải dữ liệu ngay khi trang web vừa tải xong
    loadFeaturedProducts();
    loadParentCategories();
    loadActiveVouchers(); 
});

// ==============================================================
// 1. TẢI VÀ HIỂN THỊ SẢN PHẨM MỚI VỀ
// ==============================================================
async function loadFeaturedProducts() {
    try {
        const response = await apiFetch('/products');
        let products = Array.isArray(response) ? response : (response.items || []);
        
        // Logic: Lọc sản phẩm đang Bật (isActive) -> Xếp mới nhất lên đầu -> Lấy 8 cái
        let newArrivals = products
            .filter(p => p.isActive)
            .sort((a, b) => b.id - a.id)
            .slice(0, 8);
            
        renderNewArrivals(newArrivals);
    } catch (error) {
        document.getElementById('new-arrivals-grid').innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--color-accent-dark);">Tạm thời không thể tải danh sách sản phẩm.</p>';
    }
}

function renderNewArrivals(products) {
    const grid = document.getElementById('new-arrivals-grid');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">Sản phẩm mới đang được cập nhật...</p>';
        return;
    }

    products.forEach(p => {
        // Nối URL hình ảnh nếu cần
        let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
        
        const card = `
            <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor: pointer;">
                <div class="product-image">
                    <img src="${imgUrl}" alt="${p.name}" onerror="this.src='image/placeholder.jpg'">
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.categoryName || 'WebNhom5'}</div>
                    <h4 class="product-name" title="${p.name}">${p.name}</h4>
                    
                    <div style="color: #FFC107; font-size: 0.95rem; margin: 4px 0; display:flex; justify-content:center; gap:2px;">
                        <i class="ph-fill ph-star"></i>
                        <i class="ph-fill ph-star"></i>
                        <i class="ph-fill ph-star"></i>
                        <i class="ph-fill ph-star"></i>
                        <i class="ph-fill ph-star"></i>
                        <span style="color:#888; font-size:0.8rem; margin-left:4px;">(5.0)</span>
                    </div>

                    <div class="product-price">${new Intl.NumberFormat('vi-VN').format(p.price)} ₫</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">
                        <i class="ph-fill ph-shopping-cart" style="margin-right: 4px;"></i>Đã bán ${p.soldCount || 0}
                    </div>
                </div>
            </div>`;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

// ==============================================================
// 2. SLIDER DANH MỤC TRƯỢT NGANG
// ==============================================================
async function loadParentCategories() {
    try {
        const categories = await apiFetch('/categories');
        const grid = document.getElementById('dynamic-categories');
        grid.innerHTML = '';

        if (!categories || categories.length === 0) {
            grid.innerHTML = '<p style="padding: 20px;">Danh mục đang được cập nhật.</p>';
            return;
        }

        // Mảng hình ảnh dự phòng cao cấp
        const defaultCategoryImages = [
            'https://i.pinimg.com/webp/1200x/f5/d3/a8/f5d3a86b0fc21f6369f5a3d7d9011c39.webp', 
            'https://i.pinimg.com/webp/1200x/ff/66/20/ff66208479e41d80905fce8caa99fe11.webp', 
            'https://i.pinimg.com/webp/1200x/bb/68/d4/bb68d4e4fb6754ea1ffbc9fb1d8c96aa.webp', 
            'https://i.pinimg.com/736x/a2/9b/b3/a29bb3a78c377dd4a402dfbf8aeaff68.jpg'
        ];

        // Chỉ lấy các danh mục gốc (không có con hoặc là tầng cao nhất)
        categories.forEach((cat, index) => {
            const imgSrc = defaultCategoryImages[index % defaultCategoryImages.length];
            const card = `
                <a href="shop.html?catId=${cat.id}" class="cat-card">
                    <img src="${imgSrc}" alt="${cat.name}" loading="lazy">
                    <div class="cat-overlay"><h3>${cat.name}</h3></div>
                </a>`;
            grid.insertAdjacentHTML('beforeend', card);
        });
    } catch (error) { 
        console.error("Lỗi tải Danh mục", error); 
    }
}

// Logic bấm nút Mũi tên trái/phải để trượt danh mục
function scrollCategories(direction) {
    const grid = document.getElementById('dynamic-categories');
    if (!grid) return;
    
    // Tìm kích thước của thẻ đầu tiên để trượt chính xác
    const firstCard = grid.querySelector('.cat-card');
    const scrollAmount = firstCard ? firstCard.offsetWidth + 30 : 350; // 30px là gap
    
    grid.scrollBy({ 
        left: direction * scrollAmount, 
        behavior: 'smooth' 
    });
}

// ==============================================================
// 3. HIỂN THỊ VOUCHER KHUYẾN MÃI (Fix lỗi 404)
// ==============================================================
async function loadActiveVouchers() {
    try {
        // 👉 ĐIỂM SỬA QUAN TRỌNG: Thêm /admin vào đường dẫn
        const response = await apiFetch('/admin/promotions').catch(() => null);
        
        if (!response) {
            throw new Error("Không lấy được dữ liệu Voucher");
        }
        
        const promos = Array.isArray(response) ? response : (response.items || []);
        const grid = document.getElementById('dynamic-vouchers');
        grid.innerHTML = '';

        // Lọc ra các voucher Đang chạy và Đang bật
        const now = new Date();
        const activePromos = promos.filter(p => {
            const start = new Date(p.startDate);
            const end = new Date(p.endDate);
            // Đảm bảo thời gian hợp lệ và cờ IsActive = true
            return p.isActive && start <= now && end >= now;
        });

        if (activePromos.length === 0) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">Hiện chưa có chương trình khuyến mãi nào. Quý khách vui lòng quay lại sau!</p>';
            return;
        }

        activePromos.forEach(p => {
            const valStr = p.discountType === 'PERCENTAGE' 
                ? `${p.discountValue}%` 
                : `${new Intl.NumberFormat('vi-VN').format(p.discountValue)}₫`;
                
            // Giả lập mã Coupon (Trong thực tế, khách phải đăng nhập mới phát sinh mã riêng, 
            // ở đây ta lấy tiền tố Tên để giả lập)
            const demoCode = "SALE-" + getInitials(p.name) + p.id;

            const html = `
                <div class="voucher-card">
                    <div class="voucher-info">
                        <h4>GIẢM ${valStr}</h4>
                        <p title="${p.name}">${p.name.length > 30 ? p.name.substring(0,30) + '...' : p.name}</p>
                    </div>
                    <button class="btn-copy" onclick="copyVoucher('${demoCode}')">Nhận mã</button>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });

    } catch (error) {
        document.getElementById('dynamic-vouchers').innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">Hệ thống khuyến mãi đang bảo trì...</p>';
    }
}

// Hàm hỗ trợ tạo mã giả lập từ tên
function getInitials(str) {
    if (!str) return "W5";
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    return str.split(' ').filter(w => w.length > 0).map(w => w[0].toUpperCase()).join('').substring(0, 4);
}

// Hàm sao chép mã (Sử dụng showToast từ api.js)
function copyVoucher(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Đảm bảo hàm showToast có sẵn trong file api.js của em
        if (typeof showToast === "function") {
            showToast(`Đã sao chép mã: ${code}`, "success");
        } else {
            alert(`Đã sao chép mã: ${code}`);
        }
    }).catch(err => {
        console.error('Không thể sao chép:', err);
    });
}