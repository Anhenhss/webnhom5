const BASE_URL = "https://localhost:7123/api";

document.addEventListener('DOMContentLoaded', () => {
    loadMasterData(); // Gọi màu/size cho sidebar
    loadProducts();   // Gọi danh sách sản phẩm
});

// 1. GỌI API MASTER DATA (Màu/Size)
async function loadMasterData() {
    try {
        // Gọi song song các API Master Data
        const [catRes, colorRes, sizeRes] = await Promise.all([
            fetch(`${BASE_URL}/categories`),
            fetch(`${BASE_URL}/masterdata/colors`),
            fetch(`${BASE_URL}/masterdata/sizes`)
        ]);

        const categories = await catRes.json();
        const colors = await colorRes.json();
        const sizes = await sizeRes.json();

        // Render Sidebar
        renderCategories(categories);
        renderFilterOptions('color-filter', colors, 'color');
        renderFilterOptions('size-filter', sizes, 'size');

    } catch (err) { console.error("Lỗi load Master Data", err); }
}

function renderFilterOptions(containerId, data, name) {
    const container = document.getElementById(containerId);
    container.innerHTML = data.map(item => `
        <input type="checkbox" id="${name}-${item.id}" name="${name}" value="${item.id}" 
               class="filter-checkbox" onchange="loadProducts()">
        <label for="${name}-${item.id}" class="filter-label">${item.name}</label>
    `).join('');
}

// 2. GỌI API DANH SÁCH SẢN PHẨM (Có kèm Filter)
async function loadProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '<p>Đang tải sản phẩm...</p>';

    // Lấy các giá trị đang filter
    const selectedColors = Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value);
    const selectedSizes = Array.from(document.querySelectorAll('input[name="size"]:checked')).map(cb => cb.value);
    const sort = document.getElementById('sort-select').value;

    // Xây dựng Query String
    let query = `?sort=${sort}`;
    if(selectedColors.length) query += `&colors=${selectedColors.join(',')}`;
    if(selectedSizes.length) query += `&sizes=${selectedSizes.join(',')}`;

    try {
        const response = await fetch(`${BASE_URL}/products${query}`);
        const products = await response.json();

        document.getElementById('product-count').innerText = products.length;
        
        grid.innerHTML = products.map(p => `
            <div class="product-card" onclick="location.href='product-detail.html?id=${p.id}'">
                <div class="product-img">
                    <img src="${p.imageUrl || 'image/placeholder.png'}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <p class="product-name">${p.name}</p>
                    <p class="product-price">${p.basePrice.toLocaleString()}đ</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        grid.innerHTML = '<p>Lỗi kết nối máy chủ.</p>';
    }
}

function resetFilters() {
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    loadProducts();
}