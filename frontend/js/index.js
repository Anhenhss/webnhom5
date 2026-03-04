const BACKEND_URL = 'http://localhost:5195'; 

document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProducts();
    loadParentCategories();
    loadActiveVouchers(); // Gọi API lấy Voucher
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// 1. SẢN PHẨM MỚI VỀ
async function loadFeaturedProducts() {
    try {
        const response = await apiFetch('/products');
        let products = Array.isArray(response) ? response : (response.items || []);
        let newArrivals = products.filter(p => p.isActive).sort((a, b) => b.id - a.id).slice(0, 8);
        renderNewArrivals(newArrivals);
    } catch (error) {
        document.getElementById('new-arrivals-grid').innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Lỗi tải dữ liệu.</p>';
    }
}
function renderNewArrivals(products) {
    const grid = document.getElementById('new-arrivals-grid');
    grid.innerHTML = '';
    products.forEach(p => {
        let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
        const card = `
            <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
                <div class="product-image"><img src="${imgUrl}" onerror="this.src='image/placeholder.jpg'"></div>
                <div class="product-info">
                    <div class="product-brand">${p.categoryName || 'WebNhom5'}</div>
                    <h4 class="product-name" title="${p.name}">${p.name}</h4>
                    <div class="product-price">${new Intl.NumberFormat('vi-VN').format(p.price)} ₫</div>
                    <div style="font-size:0.8rem; color:#888; margin-top:5px;">Đã bán ${p.soldCount || 0}</div>
                </div>
            </div>`;
        grid.insertAdjacentHTML('beforeend', card);
    });
}

// 2. SLIDER DANH MỤC TRƯỢT NGANG
async function loadParentCategories() {
    try {
        const categories = await apiFetch('/categories');
        const grid = document.getElementById('dynamic-categories');
        grid.innerHTML = '';

        const defaultCategoryImages = [
            'https://i.pinimg.com/webp/1200x/f5/d3/a8/f5d3a86b0fc21f6369f5a3d7d9011c39.webp', 
            'https://i.pinimg.com/webp/1200x/ff/66/20/ff66208479e41d80905fce8caa99fe11.webp', 
            'https://i.pinimg.com/webp/1200x/bb/68/d4/bb68d4e4fb6754ea1ffbc9fb1d8c96aa.webp', 
            'https://i.pinimg.com/736x/a2/9b/b3/a29bb3a78c377dd4a402dfbf8aeaff68.jpg'
        ];

        categories.forEach((cat, index) => {
            const imgSrc = defaultCategoryImages[index % defaultCategoryImages.length];
            const card = `
                <a href="shop.html?catId=${cat.id}" class="cat-card">
                    <img src="${imgSrc}" alt="${cat.name}">
                    <div class="cat-overlay"><h3>${cat.name}</h3></div>
                </a>`;
            grid.insertAdjacentHTML('beforeend', card);
        });
    } catch (error) { console.error("Lỗi tải Danh mục", error); }
}

// Logic bấm nút Mũi tên trái/phải để trượt danh mục
function scrollCategories(direction) {
    const grid = document.getElementById('dynamic-categories');
    const scrollAmount = 350; // Trượt mỗi lần 350px (tương đương 1 thẻ)
    if (direction === 1) {
        grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
        grid.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
}

// 3. API VOUCHER TỪ ADMIN-MARKETING
async function loadActiveVouchers() {
    try {
        // Cần dặn backend gỡ chặn [Authorize] ở hàm Get All Promotions để khách vãng lai cũng đọc được
        const response = await apiFetch('/promotions').catch(() => null);
        const promos = Array.isArray(response) ? response : (response?.items || []);
        
        const grid = document.getElementById('dynamic-vouchers');
        grid.innerHTML = '';

        // Lọc ra các voucher Đang chạy (StartDate <= Now <= EndDate)
        const now = new Date();
        const activePromos = promos.filter(p => new Date(p.startDate) <= now && new Date(p.endDate) >= now && p.isActive);

        if (activePromos.length === 0) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--text-muted);">Hiện chưa có chương trình khuyến mãi nào.</p>';
            return;
        }

        activePromos.forEach(p => {
            const valStr = p.discountType === 'PERCENTAGE' ? p.discountValue + '%' : new Intl.NumberFormat('vi-VN').format(p.discountValue) + '₫';
            const html = `
                <div class="voucher-card">
                    <div class="voucher-info">
                        <h4>GIẢM ${valStr}</h4>
                        <p>${p.name}</p>
                    </div>
                    <button class="btn-copy" onclick="copyVoucher('VOUCHER_${p.id}')">Sao chép</button>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });

    } catch (error) {
        document.getElementById('dynamic-vouchers').innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Đang cập nhật ưu đãi...</p>';
    }
}

function copyVoucher(code) {
    navigator.clipboard.writeText(code).then(() => {
        showToast(`Đã sao chép mã: ${code}`, "success");
    });
}