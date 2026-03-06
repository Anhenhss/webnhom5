document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutSummary();
    
    // Khởi tạo Tỉnh/Thành, sau khi tải xong thì tự động điền địa chỉ mặc định
    initRealLocations().then(() => {
        loadDefaultAddress();
    });
});

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// ==========================================
// CÁC BIẾN TOÀN CỤC LƯU TRỮ TRẠNG THÁI
// ==========================================
let subtotal = 0;
let shippingFee = 0;
let itemCount = 0;
let locationData = []; 
let discountAmount = 0;
let appliedCouponCode = "";

// ==========================================
// 1. TẢI DỮ LIỆU GIỎ HÀNG
// ==========================================
async function loadCheckoutSummary() {
    try {
        const response = await apiFetch('/cart');
        const cartItems = response.items || response;

        if (!cartItems || cartItems.length === 0) {
            window.location.href = "cart.html"; 
            return;
        }

        cartItems.forEach(item => {
            subtotal += (item.price * item.quantity);
            itemCount += item.quantity;
        });

        document.getElementById('item-count').innerText = itemCount;
        document.getElementById('subtotal-amount').innerText = formatCurrency(subtotal);
        updateGrandTotal();

    } catch (error) {
        console.error("Lỗi tải thông tin thanh toán", error);
    }
}

// ==========================================
// 2. TẢI API TỈNH THÀNH (NGUỒN GITHUB ỔN ĐỊNH)
// ==========================================
async function initRealLocations() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json');
        locationData = await response.json();
        
        const provinceSelect = document.getElementById('province');
        provinceSelect.innerHTML = '<option value="" disabled selected>Chọn Tỉnh/Thành phố</option>';
        
        locationData.forEach(p => {
            let opt = document.createElement('option');
            opt.value = p.Id;
            opt.text = p.Name;
            provinceSelect.add(opt);
        });
    } catch (error) {
        console.error("Lỗi tải dữ liệu địa giới hành chính:", error);
    }
}

// Khi chọn Tỉnh -> Xổ danh sách Quận
document.getElementById('province').addEventListener('change', function() {
    const provinceId = this.value;
    const province = locationData.find(p => p.Id === provinceId);
    
    const districtSelect = document.getElementById('district');
    districtSelect.innerHTML = '<option value="" disabled selected>Chọn Quận/Huyện</option>';
    document.getElementById('ward').innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (province && province.Districts) {
        province.Districts.forEach(d => {
            let opt = document.createElement('option');
            opt.value = d.Id;
            opt.text = d.Name;
            districtSelect.add(opt);
        });
        
        // Tính phí ship theo tên Tỉnh
        calculateShipping(province.Name);
    }
});

// Khi chọn Quận -> Xổ danh sách Phường
document.getElementById('district').addEventListener('change', function() {
    const provinceId = document.getElementById('province').value;
    const districtId = this.value;
    
    const province = locationData.find(p => p.Id === provinceId);
    const district = province?.Districts.find(d => d.Id === districtId);
    
    const wardSelect = document.getElementById('ward');
    wardSelect.innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (district && district.Wards) {
        district.Wards.forEach(w => {
            let opt = document.createElement('option');
            opt.value = w.Id;
            opt.text = w.Name;
            wardSelect.add(opt);
        });
    }
});

// ==========================================
// 3. TÍNH PHÍ SHIP & TỔNG TIỀN
// ==========================================
function calculateShipping(provinceName) {
    if (provinceName.includes("Đồng Nai") || provinceName.includes("Hồ Chí Minh") || provinceName.includes("Hà Nội")) {
        shippingFee = 30000;
    } else {
        shippingFee = 50000;
    }

    document.getElementById('shipping-fee-amount').innerText = formatCurrency(shippingFee);
    updateGrandTotal();
}

function updateGrandTotal() {
    let total = subtotal + shippingFee - discountAmount;
    if (total < 0) total = 0;
    document.getElementById('total-amount').innerText = formatCurrency(total);
}

// ==========================================
// 4. MÃ GIẢM GIÁ
// ==========================================
async function applyCoupon() {
    const code = document.getElementById('voucher-code').value.trim().toUpperCase();
    const msgEl = document.getElementById('voucher-message');

    if (!code) {
        msgEl.innerHTML = '<span style="color: var(--color-accent-dark);">Vui lòng nhập mã giảm giá!</span>';
        return;
    }

    try {
        msgEl.innerHTML = '<span style="color: var(--text-muted);">Đang kiểm tra mã...</span>';
        const response = await apiFetch(`/cart/apply-coupon?code=${code}`, { method: 'POST' });

        // Xử lý dữ liệu API trả về (Hỗ trợ cả CamelCase và PascalCase)
        discountAmount = response.discountAmount || response.DiscountAmount || 0;
        appliedCouponCode = code;
        let promoName = response.appliedPromotionName || response.AppliedPromotionName || "Khuyến mãi";
        
        msgEl.innerHTML = `<span style="color: #2e7d32;"><i class="ph-fill ph-check-circle"></i> Áp dụng thành công: ${promoName}</span>`;
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('discount-amount').innerText = '-' + formatCurrency(discountAmount);
        
        updateGrandTotal();

    } catch (error) {
        msgEl.innerHTML = `<span style="color: var(--color-accent-dark);"><i class="ph-fill ph-warning-circle"></i> ${error.message || "Mã không hợp lệ!"}</span>`;
        discountAmount = 0;
        appliedCouponCode = "";
        document.getElementById('discount-row').style.display = 'none';
        updateGrandTotal();
    }
}

// ==========================================
// 5. TỰ ĐỘNG ĐIỀN ĐỊA CHỈ MẶC ĐỊNH 
// ==========================================
async function loadDefaultAddress() {
    try {
        const addresses = await apiFetch('/user/addresses');
        if (!addresses || addresses.length === 0) return; 

        const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];

        // 1. Điền Tên, SĐT, Tên đường
        document.getElementById('shippingName').value = defaultAddr.contactName;
        document.getElementById('shippingPhone').value = defaultAddr.contactPhone;
        document.getElementById('street').value = defaultAddr.addressLine;

        // Hàm hỗ trợ chọn Dropdown thông minh theo Tên (Text)
        const selectOptionByText = (selectId, textToFind) => {
            const select = document.getElementById(selectId);
            if (!select || !textToFind) return;
            const normalizedTarget = textToFind.toLowerCase().trim();

            for (let i = 0; i < select.options.length; i++) {
                const optionText = select.options[i].text.toLowerCase().trim();
                if (optionText.includes(normalizedTarget) || normalizedTarget.includes(optionText)) {
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change')); 
                    return;
                }
            }
        };

        // 2. Chạy luồng chọn nối tiếp nhau
        selectOptionByText('province', defaultAddr.province);

        setTimeout(() => {
            selectOptionByText('district', defaultAddr.district);
            setTimeout(() => {
                selectOptionByText('ward', defaultAddr.ward);
            }, 400); // Đợi load phường
        }, 400); // Đợi load quận

        showToast("Đã tự động điền địa chỉ giao hàng.", "success");

    } catch (error) {
        console.warn("Không thể tải địa chỉ mặc định.");
    }
}

// ==========================================
// 6. XỬ LÝ ĐẶT HÀNG & CHUYỂN HƯỚNG VNPAY/MOMO
// ==========================================
async function submitOrder() {
    const form = document.getElementById('checkout-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const pSelect = document.getElementById('province');
    const dSelect = document.getElementById('district');
    const wSelect = document.getElementById('ward');
    
    if (!pSelect.value || !dSelect.value || !wSelect.value) {
        showToast("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã", "warning");
        return;
    }

    // 👉 LẤY TÊN (TEXT) THAY VÌ LẤY ID CỦA TỈNH/THÀNH ĐỂ GỬI LÊN SERVER
    const name = document.getElementById('shippingName').value.trim();
    const phone = document.getElementById('shippingPhone').value.trim();
    const province = pSelect.options[pSelect.selectedIndex].text;
    const district = dSelect.options[dSelect.selectedIndex].text;
    const ward = wSelect.options[wSelect.selectedIndex].text;
    const street = document.getElementById('street').value.trim();
    
    const fullAddress = `${street}, ${ward}, ${district}, ${province}`;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;

    const payload = {
        ShippingName: name,
        ShippingPhone: phone,
        ShippingAddress: fullAddress,
        PaymentMethod: paymentMethod,
        CouponCode: appliedCouponCode 
    };

    try {
        const btnCheckout = document.querySelector('.btn-checkout');
        btnCheckout.disabled = true;
        btnCheckout.innerHTML = '<i class="ph-fill ph-spinner-gap" style="animation: spin 1s linear infinite;"></i> Đang xử lý...';

        // Bắn API Tạo Đơn
        const response = await apiFetch('/cart/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const finalTotal = subtotal + shippingFee - discountAmount;

        // Mở Modal thanh toán nếu chọn QR Code
        if (paymentMethod === 'VNPAY' || paymentMethod === 'MOMO') {
            const modal = document.getElementById('payment-modal');
            const logo = document.getElementById('payment-logo');
            
            if(paymentMethod === 'VNPAY') {
                logo.src = "https://vnpay.vn/wp-content/uploads/2020/07/Logo-VNPAYQR-update.png";
            } else {
                logo.src = "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png";
            }

            document.getElementById('payment-order-code').innerText = response.orderCode;
            document.getElementById('payment-amount').innerText = formatCurrency(finalTotal);
            document.getElementById('btn-confirm-payment').setAttribute('data-order', response.orderCode);
            
            modal.style.display = 'flex';
        } 
        else {
            // Thanh toán COD
            showToast("Đặt hàng thành công! Đang chuyển hướng...", "success");
            setTimeout(() => {
                window.location.href = `success.html?code=${response.orderCode}`; 
            }, 1500);
        }

    } catch (error) {
        document.querySelector('.btn-checkout').disabled = false;
        document.querySelector('.btn-checkout').innerText = "Đặt hàng ngay";
    }
}

// Hàm Xử lý nút trong Modal QR Code
function cancelPayment() {
    document.getElementById('payment-modal').style.display = 'none';
    showToast("Giao dịch bị hủy. Đơn hàng sẽ ở trạng thái chờ thanh toán.", "warning");
    setTimeout(() => { window.location.href = `profile.html?tab=orders`; }, 2000);
}

function confirmFakePayment() {
    const btn = document.getElementById('btn-confirm-payment');
    btn.innerHTML = 'Đang xác nhận...';
    btn.disabled = true;

    setTimeout(() => {
        document.getElementById('payment-modal').style.display = 'none';
        showToast("Thanh toán thành công!", "success");
        const orderCode = btn.getAttribute('data-order');
        setTimeout(() => { window.location.href = `success.html?code=${orderCode}`; }, 1500);
    }, 2000);
}