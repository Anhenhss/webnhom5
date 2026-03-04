document.addEventListener('DOMContentLoaded', () => {
    loadCartData();
});

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

let currentCart = [];

async function loadCartData() {
    try {
        const response = await apiFetch('/cart');
        
        // Dựa vào DTO CartItemResponseDto con gửi
        currentCart = response.items || response; 

        if (!currentCart || currentCart.length === 0) {
            document.getElementById('cart-content').style.display = 'none';
            document.getElementById('empty-cart-message').style.display = 'block';
            return;
        }

        renderCartTable();
        calculateTotal();

    } catch (error) {
        console.error("Lỗi tải giỏ hàng", error);
    }
}

function renderCartTable() {
    const tbody = document.getElementById('cart-tbody');
    tbody.innerHTML = '';

    currentCart.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="cart-item-info">
                    <img src="${item.productImage || 'image/placeholder.jpg'}" class="cart-item-img" alt="${item.productName}">
                    <div>
                        <div class="cart-item-title">${item.productName}</div>
                        <div class="cart-item-variant">Size: ${item.size} | Màu: ${item.color}</div>
                    </div>
                </div>
            </td>
            <td class="text-center price-text">${formatCurrency(item.price)}</td>
            <td class="text-center">
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)"><i class="ph ph-minus"></i></button>
                    <input type="text" class="qty-input" value="${item.quantity}" readonly>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)"><i class="ph ph-plus"></i></button>
                </div>
            </td>
            <td class="text-center">
                <button class="btn-remove" onclick="removeItem(${item.id})" title="Xóa khỏi giỏ">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateQuantity(index, change) {
    const item = currentCart[index];
    let newQty = item.quantity + change;

    // Chặn số lượng < 1 hoặc vượt quá tồn kho (maxStock)
    if (newQty < 1) return;
    if (item.maxStock && newQty > item.maxStock) {
        showToast(`Chỉ còn ${item.maxStock} sản phẩm trong kho.`, "warning");
        return;
    }

    // Cập nhật State & UI
    item.quantity = newQty;
    document.querySelectorAll('.qty-input')[index].value = newQty;
    
    calculateTotal();

    // Đồng bộ API ngầm
    try {
        await apiFetch('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ 
                productId: item.productId, 
                productVariantId: item.productVariantId, 
                quantity: newQty 
            })
        });
    } catch (error) {
        loadCartData(); // Revert nếu lỗi
    }
}

async function removeItem(itemId) {
    if (!confirm("Bạn muốn xóa sản phẩm này khỏi giỏ hàng?")) return;

    try {
        await apiFetch(`/cart/remove/${itemId}`, { method: 'DELETE' });
        showToast("Đã xóa sản phẩm", "success");
        loadCartData(); 
    } catch (error) {
        console.error("Lỗi xóa item", error);
    }
}

function calculateTotal() {
    let subtotal = 0;
    currentCart.forEach(item => {
        subtotal += (item.price * item.quantity);
    });

    document.getElementById('subtotal-amount').innerText = formatCurrency(subtotal);
    document.getElementById('total-amount').innerText = formatCurrency(subtotal);
}

function goToCheckout() {
    if (currentCart.length === 0) {
        showToast("Giỏ hàng trống", "error");
        return;
    }
    window.location.href = "checkout.html";
}