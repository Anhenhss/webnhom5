// ==========================================================================
// TỔNG HỢP LOGIC TRANG SHOP - CẬP NHẬT MỚI NHẤT
// ==========================================================================
const BACKEND_URL = 'http://localhost:5195'; // Nhớ đổi đúng cổng của Quý nếu cần

let allProducts = [];
let filteredProducts = [];
let categoryTreeData = []; // Lưu trữ cây danh mục để lọc cha-con

// Cấu hình phân trang
const ITEMS_PER_PAGE = 9; 
let currentPage = 1;

// Trạng thái bộ lọc hiện tại
let activeFilters = { 
    categoryId: null, 
    colorId: null, 
    sizeId: null,
    keyword: "",
    minPrice: null,
    maxPrice: null
};

// Hàm hỗ trợ thông báo (Vì api.js cần dùng)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. KẾT NỐI TỪ KHÓA TÌM KIẾM TỪ TRANG CHỦ (Nếu có)
    const urlParams = new URLSearchParams(window.location.search);
    const searchKeyword = urlParams.get('search');

    if (searchKeyword) {
        activeFilters.keyword = searchKeyword.toLowerCase();
        const searchInput = document.getElementById('global-search-input') || document.getElementById('live-search');
        if (searchInput) searchInput.value = searchKeyword;
    }

    // ĐỌC DANH MỤC NẾU CLICK TỪ TRANG CHỦ (Bổ sung phần này)
    const urlCatId = urlParams.get('catId');
    if (urlCatId) {
        activeFilters.categoryId = parseInt(urlCatId);
    }

    // 2. TẢI DỮ LIỆU
    loadMasterData();
    loadProducts();

    // 3. SỰ KIỆN LIVE SEARCH TẠI TRANG SHOP
    const liveSearchInput = document.getElementById('global-search-input') || document.getElementById('live-search');
    if (liveSearchInput) {
        liveSearchInput.addEventListener('input', (e) => {
            activeFilters.keyword = e.target.value.toLowerCase().trim();
            currentPage = 1; // Reset về trang 1
            applyFilters();
            
            // Cập nhật lại URL cho chuẩn
            const newUrl = new URL(window.location);
            if (activeFilters.keyword) newUrl.searchParams.set('search', activeFilters.keyword);
            else newUrl.searchParams.delete('search');
            window.history.replaceState({}, '', newUrl);
        });
    }
});

// ==========================================
// 1. TẢI DỮ LIỆU BỘ LỌC (MASTER DATA)
// ==========================================
async function loadMasterData() {
    try {
        const categories = await apiFetch('/categories').catch(() => []); 
        const colors = await apiFetch('/products/master-data/colors').catch(() => []); 
        const sizes = await apiFetch('/products/master-data/sizes').catch(() => []);

        renderCategories(categories);
        renderColors(colors);
        renderSizes(sizes);
    } catch (error) { 
        console.error("Lỗi tải bộ lọc:", error); 
    }
}

function renderCategories(categories) {
    categoryTreeData = categories; // Lưu lại để dùng cho hàm lấy ID cha/con
    const ul = document.getElementById('filter-categories');
    if (!ul) return;
    
    ul.innerHTML = `<li class="active cat-parent" onclick="toggleCategory(null, this)">Tất cả thiết kế</li>`;
    
    categories.forEach(parentCat => {
        let html = `<li class="cat-parent" onclick="toggleCategory(${parentCat.id}, this)">${parentCat.name}</li>`;
        // Nếu có danh mục con
        if (parentCat.children && parentCat.children.length > 0) {
            html += `<ul class="cat-children-list">`;
            parentCat.children.forEach(childCat => {
                html += `<li onclick="toggleCategory(${childCat.id}, this)">${childCat.name}</li>`;
            });
            html += `</ul>`;
        }
        ul.insertAdjacentHTML('beforeend', html);
    });
}

function renderColors(colors) {
    const container = document.getElementById('filter-colors');
    if (!container) return;
    container.innerHTML = '';
    colors.forEach(c => {
        if (c.name !== "Không áp dụng" && c.hexCode !== "NA") {
            container.innerHTML += `<div class="color-swatch" style="background-color: ${c.hexCode}" title="${c.name}" onclick="toggleColor(${c.id}, this)"></div>`;
        }
    });
}

function renderSizes(sizes) {
    const container = document.getElementById('filter-sizes');
    if (!container) return;
    container.innerHTML = '';
    sizes.forEach(s => {
        if (s.name !== "Không áp dụng" && s.code !== "NA") {
            container.innerHTML += `<div class="size-box" onclick="toggleSize(${s.id}, this)">${s.name}</div>`;
        }
    });
}

// ==========================================
// 2. TẢI SẢN PHẨM TỪ BACKEND
// ==========================================
async function loadProducts() {
    try {
        const response = await apiFetch('/products');
        const products = Array.isArray(response) ? response : (response.items || []);
        // Chỉ hiện sản phẩm đang Bật (isActive == true)
        allProducts = products.filter(p => p.isActive === true); 
        applyFilters(); 
    } catch (error) {
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = '<p class="loading-text" style="grid-column: 1/-1; text-align: center; padding: 50px;">Hệ thống đang bảo trì, vui lòng quay lại sau.</p>';
    }
}

// ==========================================
// 3. XỬ LÝ SỰ KIỆN CLICK BỘ LỌC
// ==========================================
function toggleCategory(id, el) {
    activeFilters.categoryId = id;
    document.querySelectorAll('#filter-categories li').forEach(li => li.classList.remove('active'));
    if (el) el.classList.add('active');
    currentPage = 1;
    applyFilters();
}

function toggleColor(id, el) {
    if (activeFilters.colorId === id) {
        activeFilters.colorId = null; 
        el.classList.remove('active');
    } else {
        activeFilters.colorId = id;
        document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
        el.classList.add('active');
    }
    currentPage = 1;
    applyFilters();
}

function toggleSize(id, el) {
    if (activeFilters.sizeId === id) {
        activeFilters.sizeId = null; 
        el.classList.remove('active');
    } else {
        activeFilters.sizeId = id;
        document.querySelectorAll('.size-box').forEach(sb => sb.classList.remove('active'));
        el.classList.add('active');
    }
    currentPage = 1;
    applyFilters();
}

// Bộ lọc giá (Khách tự nhập số)
function applyPriceFilter() {
    const minVal = document.getElementById('min-price').value;
    const maxVal = document.getElementById('max-price').value;
    
    activeFilters.minPrice = minVal ? parseFloat(minVal) : null;
    activeFilters.maxPrice = maxVal ? parseFloat(maxVal) : null;
    
    document.querySelectorAll('#quick-price li').forEach(li => li.classList.remove('active'));
    currentPage = 1;
    applyFilters();
}

// Bộ lọc giá (Khách bấm chọn nhanh)
function setQuickPrice(min, max, el) {
    activeFilters.minPrice = min;
    activeFilters.maxPrice = max;
    
    document.getElementById('min-price').value = min > 0 ? min : '';
    document.getElementById('max-price').value = max < 999999999 ? max : '';

    document.querySelectorAll('#quick-price li').forEach(li => li.classList.remove('active'));
    el.classList.add('active');

    currentPage = 1;
    applyFilters();
}

// Xóa toàn bộ bộ lọc
function clearFilters() {
    const searchInput = document.getElementById('global-search-input') || document.getElementById('live-search');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

    activeFilters = { categoryId: null, colorId: null, sizeId: null, keyword: keyword, minPrice: null, maxPrice: null };
    
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    const allCatBtn = document.querySelector('#filter-categories li');
    if (allCatBtn) allCatBtn.classList.add('active'); 
    
    const minEl = document.getElementById('min-price');
    const maxEl = document.getElementById('max-price');
    if(minEl) minEl.value = '';
    if(maxEl) maxEl.value = '';
    
    currentPage = 1;
    applyFilters();
}

// ==========================================
// 4. ÁP DỤNG LỌC VÀ SẮP XẾP VÀO MẢNG
// ==========================================

// Hàm đệ quy tìm tất cả ID danh mục con thuộc danh mục cha
function getAllCategoryIdsToFilter(catId) {
    let ids = [catId];
    const findNode = (nodes) => {
        for (let n of nodes) {
            if (n.id === catId) return n;
            if (n.children) {
                let found = findNode(n.children);
                if (found) return found;
            }
        }
        return null;
    };
    const node = findNode(categoryTreeData);
    if (node && node.children) {
        node.children.forEach(c => ids.push(c.id));
    }
    return ids;
}

function applyFilters() {
    filteredProducts = allProducts;

    // 1. Tên (Keyword)
    if (activeFilters.keyword) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(activeFilters.keyword));
    }

    // 2. Danh mục (Bao gồm cả Cha lẫn Con)
    if (activeFilters.categoryId) {
        const validCatIds = getAllCategoryIdsToFilter(activeFilters.categoryId);
        filteredProducts = filteredProducts.filter(p => validCatIds.includes(p.categoryId));
    }

    // 3. Màu & Size
    if (activeFilters.colorId) {
        filteredProducts = filteredProducts.filter(p => p.variants && p.variants.some(v => v.colorId === activeFilters.colorId));
    }
    if (activeFilters.sizeId) {
        filteredProducts = filteredProducts.filter(p => p.variants && p.variants.some(v => v.sizeId === activeFilters.sizeId));
    }

    // 4. Khoảng giá
    if (activeFilters.minPrice !== null) {
        filteredProducts = filteredProducts.filter(p => p.price >= activeFilters.minPrice);
    }
    if (activeFilters.maxPrice !== null) {
        filteredProducts = filteredProducts.filter(p => p.price <= activeFilters.maxPrice);
    }

    // 5. Sắp xếp
    const sortSelect = document.getElementById('sort-select');
    const sortValue = sortSelect ? sortSelect.value : 'newest';
    
    if (sortValue === 'price_asc') filteredProducts.sort((a, b) => a.price - b.price);
    else if (sortValue === 'price_desc') filteredProducts.sort((a, b) => b.price - a.price);
    else filteredProducts.sort((a, b) => b.id - a.id); // Mặc định mới nhất

    // Cập nhật số lượng
    const countEl = document.getElementById('product-count');
    if (countEl) countEl.innerText = filteredProducts.length;

    renderPagination();
    renderProductsForCurrentPage();
}

// ==========================================
// 5. PHÂN TRANG & VẼ HTML
// ==========================================
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;
    
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return; 

    // Nút Prev
    paginationEl.insertAdjacentHTML('beforeend', `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="ph ph-caret-left"></i></button>`);

    // Các trang
    for (let i = 1; i <= totalPages; i++) {
        paginationEl.insertAdjacentHTML('beforeend', `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`);
    }

    // Nút Next
    paginationEl.insertAdjacentHTML('beforeend', `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="ph ph-caret-right"></i></button>`);
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderPagination();
    renderProductsForCurrentPage();
    
    // Cuộn mượt mà lên đầu sản phẩm
    const topbar = document.querySelector('.shop-topbar');
    if (topbar) topbar.scrollIntoView({ behavior: 'smooth' });
}

function renderProductsForCurrentPage() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted); font-size: 1.1rem;">Không tìm thấy thiết kế nào phù hợp với bộ lọc hiện tại.</div>';
        return;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredProducts.slice(startIndex, endIndex);

    paginatedItems.forEach(p => {
        let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
        
        const card = `
            <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
                <div class="product-image">
                    <img src="${imgUrl}" alt="${p.name}" onerror="this.src='image/placeholder.jpg'">
                </div>
                <div class="product-info">
                    <div class="product-brand">${p.categoryName || 'WebNhom5 Exclusive'}</div>
                    <h4 class="product-name" title="${p.name}">${p.name}</h4>
                    <div class="product-price">${new Intl.NumberFormat('vi-VN').format(p.price)} ₫</div>
                    <div style="font-size:0.8rem; color:#888; margin-top:5px;">Đã bán ${p.soldCount || 0}</div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', card);
    });
}