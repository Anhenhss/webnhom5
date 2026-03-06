document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutSummary();
    initRealLocations(); // Gọi API Tỉnh Thành thật từ Open API
});

// Hàm hỗ trợ format tiền tệ
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
// 1. TẢI DỮ LIỆU GIỎ HÀNG TỪ BACKEND
// ==========================================
async function loadCheckoutSummary() {
    try {
        const response = await apiFetch('/cart');
        const cartItems = response.items || response;

        // Nếu giỏ hàng trống, lập tức đá về trang cart
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
// 2. GỌI API LẤY TỈNH/THÀNH PHỐ VIỆT NAM THẬT
// ==========================================
async function initRealLocations() {
    try {
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
        locationData = await response.json();
        
        const provinceSelect = document.getElementById('province');
        provinceSelect.innerHTML = '<option value="" disabled selected>Chọn Tỉnh/Thành phố</option>';
        
        locationData.forEach(p => {
            let opt = document.createElement('option');
            opt.value = p.code;
            opt.text = p.name;
            provinceSelect.add(opt);
        });

    } catch (error) {
        console.error("Lỗi tải dữ liệu địa giới hành chính:", error);
        showToast("Không thể tải danh sách địa chỉ. Vui lòng thử lại sau.", "error");
    }
}

// Khi chọn Tỉnh/Thành phố -> Load Quận/Huyện
document.getElementById('province').addEventListener('change', function() {
    const provinceCode = parseInt(this.value);
    const province = locationData.find(p => p.code === provinceCode);
    
    const districtSelect = document.getElementById('district');
    districtSelect.innerHTML = '<option value="" disabled selected>Chọn Quận/Huyện</option>';
    document.getElementById('ward').innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (province && province.districts) {
        province.districts.forEach(d => {
            let opt = document.createElement('option');
            opt.value = d.code;
            opt.text = d.name;
            districtSelect.add(opt);
        });
        
        // Cập nhật phí ship ngay lập tức khi biết tỉnh
        calculateShipping(province.name);
    }
});

// Khi chọn Quận/Huyện -> Load Phường/Xã
document.getElementById('district').addEventListener('change', function() {
    const provinceCode = parseInt(document.getElementById('province').value);
    const districtCode = parseInt(this.value);
    
    const province = locationData.find(p => p.code === provinceCode);
    const district = province.districts.find(d => d.code === districtCode);
    
    const wardSelect = document.getElementById('ward');
    wardSelect.innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (district && district.wards) {
        district.wards.forEach(w => {
            let opt = document.createElement('option');
            opt.value = w.code;
            opt.text = w.name;
            wardSelect.add(opt);
        });
    }
});

// ==========================================
// 3. LOGIC TÍNH PHÍ VẬN CHUYỂN & TỔNG TIỀN
// ==========================================
function calculateShipping(provinceName) {
    if (provinceName.includes("Đồng Nai") || 
        provinceName.includes("Hồ Chí Minh") || 
        provinceName.includes("Hà Nội")) {
        shippingFee = 30000;
    } else {
        shippingFee = 50000;
    }

    document.getElementById('shipping-fee-amount').innerText = formatCurrency(shippingFee);
    updateGrandTotal();
}

function updateGrandTotal() {
    let total = subtotal + shippingFee - discountAmount;
    if (total < 0) total = 0; // Chống bug tiền âm nếu giảm giá quá sâu
    document.getElementById('total-amount').innerText = formatCurrency(total);
}

// ==========================================
// 4. API KIỂM TRA MÃ GIẢM GIÁ (VOUCHER)
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
        
        // Gọi API C# (Đảm bảo em đã tạo hàm ApplyCouponAsync trong C# như bài trước)
        const response = await apiFetch(`/cart/apply-coupon?code=${code}`, { method: 'POST' });

        // Nếu mã hợp lệ, C# sẽ trả về object chứa discountAmount
        discountAmount = response.discountAmount;
        appliedCouponCode = code;
        
        msgEl.innerHTML = `<span style="color: #2e7d32;"><i class="ph-fill ph-check-circle"></i> Áp dụng thành công: ${response.appliedPromotionName}</span>`;
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('discount-amount').innerText = '-' + formatCurrency(discountAmount);
        
        updateGrandTotal();

    } catch (error) {
        // apiFetch sẽ tự động quăng lỗi (vd: Mã hết hạn, sai mã)
        msgEl.innerHTML = `<span style="color: var(--color-accent-dark);"><i class="ph-fill ph-warning-circle"></i> ${error.message || "Mã không hợp lệ!"}</span>`;
        discountAmount = 0;
        appliedCouponCode = "";
        document.getElementById('discount-row').style.display = 'none';
        updateGrandTotal();
    }
}

// ==========================================
// 5. XỬ LÝ ĐẶT HÀNG & CHUYỂN HƯỚNG VNPAY/MOMO
// ==========================================
async function submitOrder() {
    const form = document.getElementById('checkout-form');
    // Kiểm tra các trường HTML5 (required)
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

    // Thu thập dữ liệu form
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
        CouponCode: appliedCouponCode // Gửi mã giảm giá lên để C# ghi đè giá cuối
    };

    try {
        const btnCheckout = document.querySelector('.btn-checkout');
        btnCheckout.disabled = true;
        btnCheckout.innerText = "Đang xử lý...";

        // Bắn API Tạo Đơn
        const response = await apiFetch('/cart/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const finalTotal = subtotal + shippingFee - discountAmount;

        // ĐIỀU HƯỚNG CỔNG THANH TOÁN (MỞ MODAL GIẢ LẬP)
        if (paymentMethod === 'VNPAY' || paymentMethod === 'MOMO') {
            const modal = document.getElementById('payment-modal');
            const logo = document.getElementById('payment-logo');
            
            // Đổi Logo theo phương thức
            if(paymentMethod === 'VNPAY') {
                logo.src = "https://vnpay.vn/wp-content/uploads/2020/07/Logo-VNPAYQR-update.png";
            } else {
                logo.src = "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png";
            }

            // Điền thông tin vào Modal
            document.getElementById('payment-order-code').innerText = response.orderCode;
            document.getElementById('payment-amount').innerText = formatCurrency(finalTotal);
            
            // Lưu tạm mã đơn vào một thuộc tính ẩn để dùng cho nút "Đã chuyển khoản"
            document.getElementById('btn-confirm-payment').setAttribute('data-order', response.orderCode);
            
            // Hiện Modal
            modal.style.display = 'flex';
        } 
        else {
            // Thanh toán COD (Tiền mặt)
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
function cancelPayment() {
    document.getElementById('payment-modal').style.display = 'none';
    showToast("Đã hủy thanh toán. Đơn hàng của bạn đã được ghi nhận chờ xử lý.", "warning");
    
    // Đá về trang lịch sử đơn hàng
    setTimeout(() => {
        window.location.href = `profile.html?tab=orders`; 
    }, 2000);
}

function confirmFakePayment() {
    const btn = document.getElementById('btn-confirm-payment');
    btn.innerHTML = '<i class="ph-fill ph-spinner-gap"></i> Đang xác nhận...';
    btn.disabled = true;

    // Giả lập thời gian ngân hàng xử lý
    setTimeout(() => {
        document.getElementById('payment-modal').style.display = 'none';
        showToast("Thanh toán thành công!", "success");
        
        const orderCode = btn.getAttribute('data-order');
        // LÝ THUYẾT: Chỗ này sẽ gọi API C# để update Status đơn hàng thành "Đã thanh toán"
        
        setTimeout(() => {
            window.location.href = `success.html?code=${orderCode}`; 
        }, 1500);
    }, 2000);
}