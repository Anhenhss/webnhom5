const BASE_URL = "https://localhost:7123/api"; 
let currentProduct = null;
let selectedColor = null;
let selectedSize = null;
let currentSKU = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy Product ID từ query string (Ví dụ: product-detail.html?id=10)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        fetchProductDetail(productId);
    } else {
        window.location.href = 'shop.html';
    }
});

// 2. Gọi API lấy chi tiết sản phẩm 
async function fetchProductDetail(id) {
    try {
        const response = await fetch(`${BASE_URL}/products/${id}`);
        if (!response.ok) throw new Error("Không tìm thấy sản phẩm");
        
        currentProduct = await response.json();
        renderProductUI();
    } catch (error) {
        console.error("Lỗi:", error);
        alert("Có lỗi khi tải thông tin sản phẩm.");
    }
}

// 3. Hiển thị dữ liệu lên giao diện
function renderProductUI() {
    document.getElementById('prod-name').innerText = currentProduct.name;
    document.getElementById('prod-desc').innerText = currentProduct.description;
    document.getElementById('bread-name').innerText = currentProduct.categoryName;
    
    // Hiển thị ảnh 
    const imgElement = document.getElementById('primary-img');
    if (currentProduct.imageUrl) {
        imgElement.src = currentProduct.imageUrl;
        document.getElementById('img-placeholder').style.display = 'none';
    }

    // Xử lý danh sách Màu và Size từ mảng Biến thể (Variants)
    const colors = [...new Set(currentProduct.variants.map(v => v.color))];
    const sizes = [...new Set(currentProduct.variants.map(v => v.size))];

    renderOptions('color-options', colors, 'color');
    renderOptions('size-options', sizes, 'size');
    
    // Hiển thị giá cơ bản ban đầu
    document.getElementById('prod-price').innerText = currentProduct.basePrice.toLocaleString() + "đ";
}

function renderOptions(containerId, list, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = list.map(item => `
        <button class="opt-btn" data-type="${type}" data-value="${item}" onclick="selectOption(this, '${type}', '${item}')">
            ${item}
        </button>
    `).join('');
}

// 4. Logic chọn Màu/Size và lọc Biến thể (SKU)
function selectOption(btn, type, value) {
    const siblings = btn.parentElement.querySelectorAll('.opt-btn');
    siblings.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');

    if (type === 'color') {
        selectedColor = value;
        document.getElementById('selected-color').innerText = value;
        updateSizeAvailability(); // Ẩn/hiện size dựa trên màu
    } else {
        selectedSize = value;
        document.getElementById('selected-size').innerText = value;
    }

    matchSKU();
}

function updateSizeAvailability() {
    const sizeButtons = document.querySelectorAll('[data-type="size"]');
    sizeButtons.forEach(btn => {
        const sizeVal = btn.dataset.value;
        // Kiểm tra SKU có cặp Color-Size này còn hàng không
        const match = currentProduct.variants.find(v => v.color === selectedColor && v.size === sizeVal);
        
        if (!match || match.stock <= 0) {
            btn.classList.add('disabled');
            if (selectedSize === sizeVal) {
                selectedSize = null;
                document.getElementById('selected-size').innerText = "Chưa chọn";
            }
        } else {
            btn.classList.remove('disabled');
        }
    });
}

function matchSKU() {
    if (selectedColor && selectedSize) {
        currentSKU = currentProduct.variants.find(v => v.color === selectedColor && v.size === selectedSize);
        
        if (currentSKU && currentSKU.stock > 0) {
            // Cập nhật giá theo SKU (vì đầm size to hoặc màu hiếm có thể đắt hơn)
            document.getElementById('prod-price').innerText = currentSKU.price.toLocaleString() + "đ";
            document.getElementById('stock-hint').innerText = `Kho còn: ${currentSKU.stock}`;
            document.getElementById('btn-add-cart').disabled = false;
        } else {
            document.getElementById('btn-add-cart').disabled = true;
            document.getElementById('stock-hint').innerText = "Hết hàng";
        }
    }
}

// 5. Thêm vào giỏ hàng 
async function handleAddToCart() {
    const quantity = parseInt(document.getElementById('buy-qty').value);
    
    // Kiểm tra login 
    const token = localStorage.getItem('accessToken'); 
    if (!token) {
        alert("Vui lòng đăng nhập để mua hàng!");
        window.location.href = 'login.html';
        return;
    }

    const cartData = {
        productId: currentProduct.id,
        skuId: currentSKU.id, // Duy dùng SKU ID để quản lý kho
        quantity: quantity
    };

    try {
        // Gọi API Cart 
        const response = await fetch(`${BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cartData)
        });

        if (response.ok) {
            alert("Đã thêm vào giỏ hàng thành công!");
        } else if (response.status === 401) {
            // Nếu token hết hạn, gọi hàm refresh
            const refreshed = await handleRefreshToken();
            if (refreshed) handleAddToCart(); 
        }
    } catch (error) {
        alert("Lỗi kết nối giỏ hàng");
    }
}

function changeQty(n) {
    let input = document.getElementById('buy-qty');
    let newVal = parseInt(input.value) + n;
    if (newVal >= 1 && (!currentSKU || newVal <= currentSKU.stock)) {
        input.value = newVal;
    }
}