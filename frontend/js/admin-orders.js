document.addEventListener('DOMContentLoaded', () => {
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    // 2. HIỂN THỊ LỜI CHÀO 
    const roleTitle = currentUserRole === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const nameElem = document.getElementById('display-admin-name');
    if (nameElem) {
        nameElem.innerText = `Xin chào, ${roleTitle} (${userInfo.fullName})`;
    }
    const avatarElem = document.getElementById('admin-avatar');
    if (avatarElem) {
        // Tự động tạo ảnh đại diện theo tên (UI Avatars)
        avatarElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=003049&color=fff`;
    }
    
    // Kiểm tra xem có parameter truyền từ trang Dashboard sang không (VD: ?search=ORD.. hoặc ?status=0)
    const urlParams = new URLSearchParams(window.location.search);
    const initialStatus = urlParams.get('status');
    const initialSearch = urlParams.get('search');
    
    if (initialStatus) document.getElementById('filter-status').value = initialStatus;
    if (initialSearch) document.getElementById('order-search-input').value = initialSearch;

    loadOrders();

    // Lắng nghe sự kiện ô tìm kiếm
    document.getElementById('order-search-input').addEventListener('input', function() {
        filterTableBySearch(this.value);
    });
});

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Biến lưu trữ toàn bộ đơn hàng trên Client để search cho mượt
let allOrdersData = [];

// 1. LOAD DANH SÁCH ĐƠN HÀNG
async function loadOrders() {
    const status = document.getElementById('filter-status').value;
    const from = document.getElementById('filter-from').value;
    const to = document.getElementById('filter-to').value;

    let query = '?';
    if (status) query += `status=${status}&`;
    if (from) query += `from=${from}&`;
    if (to) query += `to=${to}&`;

    try {
        const response = await apiFetch(`/admin/orders${query}`);
        allOrdersData = Array.isArray(response) ? response : (response.items || []);
        
        // Nếu có chữ trong ô tìm kiếm, lọc luôn
        const searchKw = document.getElementById('order-search-input').value;
        if(searchKw) {
            filterTableBySearch(searchKw);
        } else {
            renderOrdersTable(allOrdersData);
        }
    } catch (error) {
        console.error("Lỗi tải đơn hàng:", error);
    }
}

// Lọc bằng Javascript để mượt mà không cần gọi API nhiều lần
function filterTableBySearch(keyword) {
    if(!keyword) {
        renderOrdersTable(allOrdersData);
        return;
    }
    const kw = keyword.toLowerCase();
    const filtered = allOrdersData.filter(o => 
        o.orderCode.toLowerCase().includes(kw) || 
        o.shippingName.toLowerCase().includes(kw)
    );
    renderOrdersTable(filtered);
}

function resetFilters() {
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-from').value = "";
    document.getElementById('filter-to').value = "";
    document.getElementById('order-search-input').value = "";
    loadOrders();
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Không tìm thấy đơn hàng nào.</td></tr>';
        return;
    }

    orders.forEach(o => {
        const dateObj = new Date(o.orderDate);
        const dateStr = `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')} ${dateObj.getDate()}/${dateObj.getMonth()+1}/${dateObj.getFullYear()}`;
        
        // Match status string với class CSS
        const badgeInfo = getStatusBadge(o.status);

        const tr = `
            <tr>
                <td style="font-weight: 600; color: var(--color-primary);">${o.orderCode}</td>
                <td>${dateStr}</td>
                <td>${o.shippingName}</td>
                <td>${o.paymentMethod || 'COD'}</td>
                <td style="font-weight: 600; color: var(--color-accent-light);">${formatCurrency(o.finalAmount)}</td>
                <td><span class="badge ${badgeInfo.class}">${o.status}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewOrderDetail(${o.id})">
                        Chi tiết
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// 2. MỞ MODAL & XEM CHI TIẾT
let currentViewingOrderId = null;

async function viewOrderDetail(orderId) {
    currentViewingOrderId = orderId;
    try {
        // Dùng API GetByIdAsync của Quý
        const order = await apiFetch(`/admin/orders/${orderId}`);
        
        if (!order) {
            showToast("Không tìm thấy dữ liệu đơn hàng!", "error");
            return;
        }

        document.getElementById('modal-order-code').innerText = order.orderCode;
        document.getElementById('modal-customer-name').innerText = order.shippingName;
        document.getElementById('modal-address').innerText = order.shippingAddress;
        document.getElementById('modal-payment').innerText = order.paymentMethod || 'COD';
        document.getElementById('modal-total').innerText = formatCurrency(order.finalAmount);

        const badgeInfo = getStatusBadge(order.status);
        document.getElementById('modal-current-status').className = `badge ${badgeInfo.class}`;
        document.getElementById('modal-current-status').innerText = order.status;

        // Render Lịch sử
        const timelineUl = document.getElementById('modal-timeline');
        timelineUl.innerHTML = '';
        if (order.history && order.history.length > 0) {
            order.history.forEach(h => {
                const date = new Date(h.timestamp);
                timelineUl.innerHTML += `
                    <li>
                        <strong>${h.statusName}</strong>
                        <span class="timeline-date">${date.toLocaleString()} - Bởi: ${h.updatedBy || 'Hệ thống'}</span>
                        ${h.note ? `<span style="font-size: 0.85rem; color: #555;">Ghi chú: ${h.note}</span>` : ''}
                    </li>
                `;
            });
        }

        // Render Sản phẩm Snapshot
        const itemsDiv = document.getElementById('modal-items');
        itemsDiv.innerHTML = '';
        if (order.orderDetails && order.orderDetails.length > 0) {
            order.orderDetails.forEach(item => {
                const thumb = item.thumbnail || 'image/placeholder.jpg';
                itemsDiv.innerHTML += `
                    <div class="snapshot-item">
                        <img src="${thumb}" alt="product">
                        <div class="snapshot-details">
                            <p><strong>${item.productName}</strong></p>
                            <p style="color: var(--text-muted); font-size: 0.8rem;">SKU: ${item.sku}</p>
                            <p>${item.quantity} x ${formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div style="font-weight: 600;">
                            ${formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                    </div>
                `;
            });
        }

        // Dựa vào Trạng thái hiện tại (string), dịch ngược ra ID để vẽ nút bấm
        const statusCode = getStatusCodeFromName(order.status);
        renderStatusActions(statusCode);

        // Mở modal
        document.getElementById('order-modal').style.display = 'flex';

    } catch (error) {
        console.error("Lỗi xem chi tiết:", error);
    }
}

// 3. RENDER NÚT BẤM DỰA VÀO STATE MACHINE
function renderStatusActions(statusCode) {
    const btnArea = document.getElementById('modal-action-buttons');
    const inputArea = document.getElementById('action-inputs-area');
    const finishedMsg = document.getElementById('action-finished-msg');
    
    btnArea.innerHTML = '';
    document.getElementById('status-note').value = '';

    // Nếu đơn hàng đã Hoàn thành(3), Hủy(4), hoặc Thất bại(5) -> Ẩn thao tác
    if (statusCode >= 3) {
        inputArea.style.display = 'none';
        finishedMsg.style.display = 'block';
        return;
    }

    inputArea.style.display = 'block';
    finishedMsg.style.display = 'none';

    // Logic máy trạng thái Quý viết trong Backend:
    // 0 -> 1 hoặc 4
    if (statusCode === 0) {
        btnArea.innerHTML += `<button class="btn btn-primary" onclick="updateStatus(1)">Xác nhận đơn</button>`;
        btnArea.innerHTML += `<button class="btn btn-outline" style="color: var(--color-accent-light); border-color: var(--color-accent-light);" onclick="updateStatus(4)">Hủy đơn</button>`;
    }
    // 1 -> 2 hoặc 4
    else if (statusCode === 1) {
        btnArea.innerHTML += `<button class="btn btn-primary" style="background-color: #8E44AD;" onclick="updateStatus(2)">Giao hàng cho Shipper</button>`;
        btnArea.innerHTML += `<button class="btn btn-outline" style="color: var(--color-accent-light); border-color: var(--color-accent-light);" onclick="updateStatus(4)">Hủy đơn</button>`;
    }
    // 2 -> 3 hoặc 5
    else if (statusCode === 2) {
        btnArea.innerHTML += `<button class="btn btn-primary" style="background-color: #27AE60;" onclick="updateStatus(3)">Giao thành công</button>`;
        btnArea.innerHTML += `<button class="btn btn-outline" onclick="updateStatus(5)">Giao thất bại / Hoàn hàng</button>`;
    }
}

// Gọi API cập nhật
async function updateStatus(newStatus) {
    if (!currentViewingOrderId) return;
    
    const note = document.getElementById('status-note').value.trim();
    if (newStatus === 4 && !note) {
        showToast("Vui lòng nhập lý do hủy đơn vào ô Ghi chú!", "warning");
        return;
    }

    try {
        await apiFetch(`/admin/orders/${currentViewingOrderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ newStatus: newStatus, note: note })
        });
        
        showToast("Cập nhật trạng thái thành công!", "success");
        // Reload lại dữ liệu modal và bảng
        viewOrderDetail(currentViewingOrderId);
        loadOrders();
    } catch (error) {
        // apiFetch đã showToast lỗi
    }
}

function closeModal() {
    document.getElementById('order-modal').style.display = 'none';
    currentViewingOrderId = null;
}

// Helper functions để map UI
function getStatusBadge(statusName) {
    switch (statusName) {
        case "Chờ xác nhận": return { class: "badge-pending" };
        case "Đã xác nhận": return { class: "badge-confirmed" };
        case "Đang giao": return { class: "badge-shipping" };
        case "Hoàn thành": return { class: "badge-completed" };
        case "Đã hủy": return { class: "badge-cancelled" };
        case "Giao thất bại": return { class: "badge-failed" };
        default: return { class: "" };
    }
}

function getStatusCodeFromName(statusName) {
    switch (statusName) {
        case "Chờ xác nhận": return 0;
        case "Đã xác nhận": return 1;
        case "Đang giao": return 2;
        case "Hoàn thành": return 3;
        case "Đã hủy": return 4;
        case "Giao thất bại": return 5;
        default: return -1;
    }
}