document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra xem khách hàng đã đăng nhập chưa
    if (!authManager.isLoggedIn()) { 
        window.location.href = 'login.html'; 
        return; 
    }
    
    // 2. Hiển thị Tên Khách hàng
    // Lấy thông tin từ localStorage mà hệ thống lưu lại khi đăng nhập thành công
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    document.getElementById('display-fullname').innerText = userInfo.fullName || "Khách hàng";

    // 3. Khởi tạo dữ liệu khi vừa vào trang
    loadAddresses();     // Tải sổ địa chỉ
    initRealLocations(); // Tải 63 tỉnh thành Việt Nam
    // 4. KIỂM TRA XEM KHÁCH CÓ MUỐN MỞ TAB ĐƠN HÀNG KHÔNG
    const urlParams = new URLSearchParams(window.location.search);
    const tabRequest = urlParams.get('tab');

    if (tabRequest === 'orders') {
        // Tự động click vào tab đơn hàng cho khách
        const ordersTabBtn = document.querySelector('.profile-nav a[onclick*="orders-tab"]');
        if (ordersTabBtn) {
            ordersTabBtn.click();
        }
    }
});

// Biến lưu trữ dữ liệu Tỉnh/Thành
let locationData = [];

// Hàm định dạng tiền tệ VNĐ (ví dụ: 1.500.000 ₫)
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// --------------------------------------------------------------------------
// XỬ LÝ CHUYỂN TAB (SỔ ĐỊA CHỈ <--> LỊCH SỬ ĐƠN HÀNG)
// --------------------------------------------------------------------------
function switchTab(tabId, event) {
    if(event) event.preventDefault(); // Ngăn trình duyệt nhảy trang khi bấm vào thẻ <a>

    // Ẩn tất cả các nội dung tab
    document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
    // Xóa màu nổi bật ở tất cả các nút menu
    document.querySelectorAll('.profile-nav a').forEach(el => el.classList.remove('active'));
    
    // Hiện tab được chọn và tô màu nút menu đó
    document.getElementById(tabId).style.display = 'block';
    if(event) event.currentTarget.classList.add('active');

    // NẾU KHÁCH BẤM VÀO TAB "LỊCH SỬ ĐƠN HÀNG" THÌ MỚI GỌI API LẤY ĐƠN HÀNG
    if (tabId === 'orders-tab') {
        loadMyOrders();
    }
}

// ==========================================================================
// QUẢN LÝ SỔ ĐỊA CHỈ (API CỦA ÁNH)
// ==========================================================================
async function loadAddresses() {
    try {
        const addresses = await apiFetch('/user/addresses');
        const container = document.getElementById('address-list-container');
        container.innerHTML = ''; // Xóa thông báo "Đang tải..."

        if (!addresses || addresses.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted" style="padding: 40px;">
                    <i class="ph ph-map-pin" style="font-size: 3rem; color: #ddd; margin-bottom: 10px;"></i>
                    <p>Bạn chưa lưu địa chỉ giao hàng nào.</p>
                </div>`;
            return;
        }

        // Vẽ từng thẻ địa chỉ ra màn hình
        addresses.forEach(addr => {
            const defaultTag = addr.isDefault ? '<span class="tag-default">Mặc định</span>' : '';
            const cardClass = addr.isDefault ? 'address-card is-default' : 'address-card';

            const html = `
                <div class="${cardClass}">
                    <div class="address-info">
                        <div class="addr-header">
                            <span class="addr-name">${addr.contactName}</span>
                            <span class="addr-phone">| ${addr.contactPhone}</span>
                            ${defaultTag}
                        </div>
                        <div class="addr-detail">
                            <p>${addr.addressLine}</p>
                            <p>${addr.ward}, ${addr.district}, ${addr.province}</p>
                        </div>
                    </div>
                    <div class="address-actions">
                        <button class="btn-link text-danger" onclick="deleteAddress(${addr.id})">Xóa</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (error) {
        console.error("Lỗi tải danh sách địa chỉ:", error);
    }
}

// Mở cửa sổ thêm địa chỉ
function openAddressModal() {
    document.getElementById('address-form').reset();
    document.getElementById('address-modal').style.display = 'flex';
}

// Đóng cửa sổ thêm địa chỉ
function closeAddressModal() {
    document.getElementById('address-modal').style.display = 'none';
}

// Gửi thông tin địa chỉ mới lên Server
async function saveAddress(event) {
    event.preventDefault(); // Ngăn form tự động reload trang

    const pSelect = document.getElementById('addr-province');
    const dSelect = document.getElementById('addr-district');
    const wSelect = document.getElementById('addr-ward');

    // Kiểm tra xem khách đã chọn đủ 3 cấp địa chỉ chưa
    if (!pSelect.value || !dSelect.value || !wSelect.value) {
        showToast("Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện, Phường/Xã", "warning");
        return;
    }

    const payload = {
        ContactName: document.getElementById('addr-name').value.trim(),
        ContactPhone: document.getElementById('addr-phone').value.trim(),
        Province: pSelect.options[pSelect.selectedIndex].text,
        District: dSelect.options[dSelect.selectedIndex].text,
        Ward: wSelect.options[wSelect.selectedIndex].text,
        AddressLine: document.getElementById('addr-street').value.trim(),
        IsDefault: document.getElementById('addr-default').checked
    };

    try {
        await apiFetch('/user/addresses', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        showToast("Đã lưu địa chỉ mới thành công!", "success");
        closeAddressModal();
        loadAddresses(); // Tải lại danh sách để hiện địa chỉ vừa thêm
    } catch (error) {
        // Lỗi sẽ tự động được showToast bởi hàm apiFetch
    }
}

// Xóa một địa chỉ
async function deleteAddress(id) {
    if(!confirm("Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ không?")) return;
    try {
        await apiFetch(`/user/addresses/${id}`, { method: 'DELETE' });
        showToast("Đã xóa địa chỉ", "success");
        loadAddresses();
    } catch (error) {}
}

// ==========================================================================
// QUẢN LÝ LỊCH SỬ ĐƠN HÀNG 
// ==========================================================================
let allMyOrders = []; // Khai báo thêm biến này ở đầu file profile.js để chứa danh sách gốc

async function loadMyOrders() {
    try {
        const orders = await apiFetch('/user/orders');
        allMyOrders = orders || []; // Lưu lại danh sách gốc để Lọc không cần gọi API nhiều lần
        renderOrdersTable(allMyOrders);
    } catch (error) {
        console.error("Lỗi tải lịch sử đơn hàng:", error);
    }
}

// 💥 HÀM MỚI: Render bảng đơn hàng
function renderOrdersTable(orderList) {
    const tbody = document.getElementById('my-orders-tbody');
    tbody.innerHTML = '';

    if (!orderList || orderList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 30px;">Không tìm thấy đơn hàng nào.</td></tr>';
        return;
    }

    orderList.forEach(o => {
        const dateObj = new Date(o.orderDate);
        const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')} ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        
        let badgeClass = "badge-pending"; 
        if (o.status === "Đã xác nhận") badgeClass = "badge-confirmed";
        if (o.status === "Đang giao") badgeClass = "badge-shipping";
        if (o.status === "Hoàn thành") badgeClass = "badge-completed";
        if (o.status === "Đã hủy") badgeClass = "badge-cancelled";
        if (o.status === "Giao thất bại") badgeClass = "badge-failed";

        // 👉 TÍNH NĂNG MỚI: Nếu đang ở trạng thái 0 (Chờ xác nhận), cho phép HỦY
        let actionHtml = '';
        if (o.status === "Chờ xác nhận") {
            actionHtml = `<button class="btn-link text-danger" style="font-size:0.85rem;" onclick="cancelMyOrder(${o.id}, '${o.orderCode}')">Hủy đơn</button>`;
        }

        const tr = `
            <tr>
                <td style="font-weight: 600; color: var(--color-primary);">${o.orderCode}</td>
                <td>${dateStr}</td>
                <td style="font-weight: 600; color: var(--color-accent-light);">${formatCurrency(o.finalAmount)}</td>
                <td><span class="badge ${badgeClass}">${o.status}</span></td>
                <td>${actionHtml}</td> </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// 💥 HÀM MỚI: Lọc trên giao diện
function filterOrders(statusKeyword, btnElement) {
    // Đổi màu nút
    document.querySelectorAll('.order-status-tabs .btn').forEach(btn => {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--color-primary)';
    });
    btnElement.style.backgroundColor = 'var(--color-primary)';
    btnElement.style.color = '#fff';

    // Lọc danh sách
    if (statusKeyword === null) {
        renderOrdersTable(allMyOrders); // Hiện tất cả
    } else {
        const filtered = allMyOrders.filter(o => o.status === statusKeyword);
        renderOrdersTable(filtered);
    }
}

// ==========================================================================
// LOGIC CHỌN TỈNH/THÀNH PHỐ THẬT Ở VIỆT NAM (DÙNG CHUNG CHO PROFILE VÀ CHECKOUT)
// ==========================================================================
async function initRealLocations() {
    try {
        // Sử dụng API miễn phí của Open API Việt Nam
        const response = await fetch('https://provinces.open-api.vn/api/?depth=3');
        locationData = await response.json();
        
        const provinceSelect = document.getElementById('addr-province');
        provinceSelect.innerHTML = '<option value="" disabled selected>Chọn Tỉnh/Thành phố</option>';
        
        locationData.forEach(p => provinceSelect.add(new Option(p.name, p.code)));
    } catch (error) {
        console.error("Lỗi tải dữ liệu Tỉnh thành:", error);
    }
}

// Khi người dùng chọn Tỉnh/Thành -> Xổ ra danh sách Quận/Huyện tương ứng
document.getElementById('addr-province').addEventListener('change', function() {
    const province = locationData.find(p => p.code === parseInt(this.value));
    const districtSelect = document.getElementById('addr-district');
    
    districtSelect.innerHTML = '<option value="" disabled selected>Chọn Quận/Huyện</option>';
    document.getElementById('addr-ward').innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (province) province.districts.forEach(d => districtSelect.add(new Option(d.name, d.code)));
});

// Khi người dùng chọn Quận/Huyện -> Xổ ra danh sách Phường/Xã tương ứng
document.getElementById('addr-district').addEventListener('change', function() {
    const province = locationData.find(p => p.code === parseInt(document.getElementById('addr-province').value));
    const district = province.districts.find(d => d.code === parseInt(this.value));
    const wardSelect = document.getElementById('addr-ward');
    
    wardSelect.innerHTML = '<option value="" disabled selected>Chọn Phường/Xã</option>';
    
    if (district) district.wards.forEach(w => wardSelect.add(new Option(w.name, w.code)));
});

// ==========================================================================
// ĐĂNG XUẤT
// ==========================================================================
function logout() {
    authManager.clear();
    window.location.href = 'login.html';
}
function cancelMyOrder(orderId, orderCode) {
    if(!confirm(`Bạn chắc chắn muốn hủy đơn hàng ${orderCode}? Thao tác này không thể hoàn tác.`)) return;

    apiFetch(`/user/orders/${orderId}/cancel`, { method: 'PUT' })
        .then(() => {
            showToast("Hủy đơn thành công!", "success");
            loadMyOrders(); // Load lại bảng
        })
        .catch(err => showToast("Lỗi khi hủy đơn: " + err.message, "error"));
}