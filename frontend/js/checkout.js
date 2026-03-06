document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutSummary();
    initRealLocations(); // Gọi API Tỉnh Thành thật
});

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

let subtotal = 0;
let shippingFee = 0;
let itemCount = 0;
let locationData = []; // Lưu trữ dữ liệu 63 tỉnh thành
let discountAmount = 0;
let appliedCouponCode = "";
// 1. Tải dữ liệu giỏ hàng
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

// 2. Gọi API Dữ liệu Tỉnh/Thành Phố VN (provinces.open-api.vn)
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

// Khi người dùng chọn Tỉnh / Thành phố
document.getElementById('province').addEventListener('change', function() {
    const provinceCode = parseInt(this.value);
    const province = locationData.find(p => p.code === provinceCode);
    
    // Đổ dữ liệu Quận/Huyện
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
        
        // Tính phí vận chuyển theo tên tỉnh
        calculateShipping(province.name);
    }
});

// Khi người dùng chọn Quận / Huyện
document.getElementById('district').addEventListener('change', function() {
    const provinceCode = parseInt(document.getElementById('province').value);
    const districtCode = parseInt(this.value);
    
    const province = locationData.find(p => p.code === provinceCode);
    const district = province.districts.find(d => d.code === districtCode);
    
    // Đổ dữ liệu Phường/Xã
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

// 3. Tính phí ship ngầm dựa vào string tên Tỉnh/Thành 
function calculateShipping(provinceName) {
    // API trả về có thể là "Tỉnh Đồng Nai", "Thành phố Hồ Chí Minh", "Thành phố Hà Nội"...
    // Nên ta dùng "includes" cho an toàn
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
    if (total < 0) total = 0; // Không để tổng tiền bị âm
    document.getElementById('total-amount').innerText = formatCurrency(total);
}

// 4. Xử lý Đặt hàng
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
        CouponCode: appliedCouponCode // Gửi mã giảm giá lên C# nếu có
    };

    try {
        const btnCheckout = document.querySelector('.btn-checkout');
        btnCheckout.disabled = true;
        btnCheckout.innerText = "Đang xử lý...";

        const response = await apiFetch('/cart/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // =========================================================
        // LOGIC ĐIỀU HƯỚNG THANH TOÁN (COD, VNPAY, MOMO)
        // =========================================================
        if (paymentMethod === 'VNPAY') {
            showToast("Đang chuyển hướng sang cổng thanh toán VNPAY...", "success");
            
            // 👉 NẾU C# CỦA EM TRẢ VỀ LINK THẬT:
            // if (response.paymentUrl) { window.location.href = response.paymentUrl; return; }

            // 👉 MÔ PHỎNG HIỆU ỨNG CHO ĐỒ ÁN:
            setTimeout(() => {
                alert(`[MÔ PHỎNG API] Sẽ chuyển hướng đến VNPAY.\nMã ĐH: ${response.orderCode}\nSố tiền: ${formatCurrency(subtotal + shippingFee - discountAmount)}`);
                window.location.href = `success.html?code=${response.orderCode}`;
            }, 1500);
        } 
        else if (paymentMethod === 'MOMO') {
            showToast("Đang mở cổng thanh toán MoMo...", "success");
            setTimeout(() => {
                alert(`[MÔ PHỎNG API] Sẽ mở mã QR MoMo cho đơn hàng ${response.orderCode}.`);
                window.location.href = `success.html?code=${response.orderCode}`;
            }, 1500);
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