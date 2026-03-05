// ==========================================================================
// CẤU HÌNH CƠ BẢN
// ==========================================================================
// Đổi lại port này theo đúng cổng mà backend ASP.NET Core đang chạy (vd: 5001, 7123...)
const BASE_URL = 'http://localhost:5195/api'; 

// ==========================================================================
// QUẢN LÝ TOKEN (LOCAL STORAGE)
// ==========================================================================
const authManager = {
    setTokens(accessToken, refreshToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    },
    getAccessToken() {
        return localStorage.getItem('accessToken');
    },
    getRefreshToken() {
        return localStorage.getItem('refreshToken');
    },
    clear() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
    isLoggedIn() {
        return !!this.getAccessToken();
    }
};

// ==========================================================================
// HÀM GỌI API CHÍNH (DÙNG CHUNG CHO CẢ NHÓM)
// ==========================================================================
/**
 * @param {string} endpoint - Ví dụ: '/admin/products' (không cần ghi /api)
 * @param {object} options - Cấu hình method, body (mặc định là GET)
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Khởi tạo headers mặc định
    const headers = { ...options.headers };

    // 💥 ĐIỂM SỬA QUAN TRỌNG: Chỉ gán là JSON nếu dữ liệu KHÔNG PHẢI là FormData
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    // Tự động đính kèm Token nếu có
    const token = authManager.getAccessToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions = {
        ...options,
        headers
    };

    try {
        let response = await fetch(url, fetchOptions);

        // --- XỬ LÝ LỖI 401: HẾT HẠN TOKEN ---
        if (response.status === 401 && token) {
            console.warn("Token hết hạn, đang tự động gọi Refresh Token...");
            const isRefreshed = await handleRefreshToken();
            
            if (isRefreshed) {
                // Nếu refresh thành công, đính kèm token mới và GỌI LẠI request vừa hỏng
                const newToken = authManager.getAccessToken();
                fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, fetchOptions); 
            } else {
                // Nếu refresh thất bại (refreshToken cũng hết hạn), đẩy về trang Login
                authManager.clear();
                showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!", "error");
                setTimeout(() => window.location.href = 'login.html', 1500);
                throw new Error("Unauthorized");
            }
        }

        // --- XỬ LÝ CÁC LỖI KHÁC (400, 403, 404, 500) ---
        // --- XỬ LÝ CÁC LỖI KHÁC (400, 403, 404, 500) ---
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            let errorMessage = "Lỗi hệ thống không xác định.";
            
            // Xử lý lỗi Validation (400) đặc trưng của ASP.NET Core
            if (response.status === 400 && errorData.errors) {
                // Rút trích lỗi đầu tiên trong mảng errors của C#
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0]; 
            } 
            // Xử lý lỗi Exception tự quăng (throw new Exception("..."))
            else if (errorData.message) {
                errorMessage = errorData.message;
            } 
            else {
                errorMessage = `Lỗi ${response.status}: Yêu cầu bị máy chủ từ chối.`;
            }
            
            showToast(errorMessage, "error");
            throw new Error(errorMessage);
        }

        // --- NẾU THÀNH CÔNG (200, 201) ---
        // Xử lý trường hợp API trả về rỗng (No Content) để không bị lỗi parse JSON
        // Dùng clone() để tránh lỗi đọc body 2 lần. 
        // Trả về JSON nếu là JSON, trả về Text nếu là Text, rỗng nếu rỗng.
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else {
            const text = await response.text();
            return text ? text : {};
        }

    } catch (error) {
        console.error(`[API Error] ${endpoint}:`, error);
        throw error; // Ném lỗi ra để file gọi API (vd: login.js, cart.js) tự bắt tiếp nếu cần
    }
}

// ==========================================================================
// HÀM XỬ LÝ REFRESH TOKEN NGẦM
// ==========================================================================
let isRefreshing = false; // Khóa chống gọi refresh nhiều lần cùng lúc
let refreshPromise = null;

async function handleRefreshToken() {
    if (isRefreshing) {
        return refreshPromise; 
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const accToken = authManager.getAccessToken();
            const refToken = authManager.getRefreshToken();
            
            if (!accToken || !refToken) return false;

            // Gọi backend API do Nhung viết
            const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accessToken: accToken, 
                    refreshToken: refToken 
                })
            });

            if (!response.ok) return false;

            const data = await response.json();
            // Lưu lại cặp token mới
            authManager.setTokens(data.accessToken, data.refreshToken);
            return true;

        } catch (error) {
            return false;
        } finally {
            isRefreshing = false;
        }
    })();

    return refreshPromise;
}
// ==========================================================================
// GLOBAL SEARCH & GLOBAL HEADER MENU
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderGlobalHeader();
    const searchInput = document.getElementById('global-search-input');
    const searchBtn = document.getElementById('global-search-btn');

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeGlobalSearch(searchInput.value);
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (searchInput) executeGlobalSearch(searchInput.value);
        });
    }

    // GỌI HÀM LOAD DANH MỤC LÊN HEADER CHO MỌI TRANG
    loadHeaderCategories();
    renderUserMenu();
    
    // 👉 GỌI HÀM NÀY MỖI KHI LOAD TRANG ĐỂ HIỆN SỐ GIỎ HÀNG
    updateGlobalCartBadge();
    
});
function renderGlobalHeader() {
    const placeholder = document.getElementById('global-header-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
    <header class="site-header">
        <div class="logo-wrapper">
            <a href="index.html" style="display:flex; align-items:center; gap:12px;">
                <img src="image/logo.png" alt="Logo" onerror="this.src='https://ui-avatars.com/api/?name=W5&background=003049&color=fff'">
                <span class="brand-name">WebNhom5</span>
            </a>
        </div>
        
        <nav class="main-nav">
            <a href="index.html">Trang chủ</a>
            <div class="nav-item-dropdown">
                <a href="shop.html">Sản phẩm <i class="ph-bold ph-caret-down"></i></a>
                <ul class="dropdown-menu" id="header-category-dropdown"></ul>
            </div>
            <a href="about.html">Về chúng tôi</a>
        </nav>

        <div class="header-actions">
            <div class="search-box">
                <input type="text" id="global-search-input" placeholder="Tìm kiếm sản phẩm...">
                <i class="ph ph-magnifying-glass" id="global-search-btn" style="cursor: pointer;"></i>
            </div>
            <a href="cart.html" class="icon-link cart-icon-wrapper">
                <i class="ph ph-shopping-bag"></i>
                <span class="cart-badge" id="global-cart-badge" style="display: none;">0</span>
            </a>
            <div class="user-menu-container" id="user-menu-container">
                <a href="login.html" class="icon-link"><i class="ph ph-user"></i></a>
            </div>
        </div>
    </header>
    `;
}
// ==========================================================================
// HÀM TOÀN CỤC: CẬP NHẬT SỐ LƯỢNG GIỎ HÀNG TRÊN HEADER
// ==========================================================================
async function updateGlobalCartBadge() {
    const badge = document.getElementById('global-cart-badge');
    if (!badge) return; // Nếu trang admin không có giỏ hàng thì bỏ qua

    // Khách chưa đăng nhập -> Ẩn bong bóng
    if (!authManager.isLoggedIn()) {
        badge.style.display = 'none';
        return;
    }

    try {
        // Tắt thông báo lỗi đỏ ngầm bằng cách bẫy lỗi catch(() => null)
        const response = await apiFetch('/cart').catch(() => null);
        if (response) {
            const cartItems = response.items || response;
            
            // Tính tổng số lượng các món trong giỏ
            const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            
            if (totalCount > 0) {
                // Nếu > 99 thì hiện 99+ cho chuyên nghiệp
                badge.innerText = totalCount > 99 ? '99+' : totalCount; 
                badge.style.display = 'flex';
                
                // Thêm/Xóa class để kích hoạt lại hiệu ứng nảy nảy (Animation)
                badge.style.animation = 'none';
                setTimeout(() => badge.style.animation = 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 10);
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.warn("Chưa tải được số lượng giỏ hàng.");
    }
}

// Hàm lấy API danh mục đổ lên thanh menu ngang (Hỗ trợ Đa cấp)
async function loadHeaderCategories() {
    try {
        const categories = await apiFetch('/categories').catch(() => []);
        const dropdown = document.getElementById('header-category-dropdown');
        if (!dropdown) return;
        
        dropdown.innerHTML = '';
        
        categories.forEach(cat => {
            // Nếu danh mục cha CÓ danh mục con bên trong
            if (cat.children && cat.children.length > 0) {
                let html = `
                    <li class="has-submenu">
                        <a href="shop.html?catId=${cat.id}">
                            ${cat.name} 
                            <i class="ph-bold ph-caret-right"></i> </a>
                        <ul class="submenu">
                `;
                // Duyệt vòng lặp vẽ các danh mục con
                cat.children.forEach(child => {
                    html += `<li><a href="shop.html?catId=${child.id}">${child.name}</a></li>`;
                });
                
                html += `</ul></li>`;
                dropdown.insertAdjacentHTML('beforeend', html);
            } 
            // Nếu danh mục KHÔNG CÓ con (VD: Phụ kiện)
            else {
                dropdown.insertAdjacentHTML('beforeend', `<li><a href="shop.html?catId=${cat.id}">${cat.name}</a></li>`);
            }
        });
    } catch (e) {
        console.error("Lỗi tải danh mục header");
    }
}

function executeGlobalSearch(keyword) {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;
    const isShopPage = window.location.pathname.includes('shop.html');
    if (!isShopPage) {
        window.location.href = `shop.html?search=${encodeURIComponent(trimmedKeyword)}`;
    }
}
// ==========================================================================
// RENDER MENU TÀI KHOẢN & ĐĂNG XUẤT LÊN HEADER
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    renderUserMenu(); // Tự động chạy khi load mọi trang web
});

function renderUserMenu() {
    const container = document.getElementById('user-menu-container');
    if (!container) return;

    // Kiểm tra xem khách đã đăng nhập chưa (Kiểm tra token)
    if (authManager.isLoggedIn()) {
        const userInfoStr = localStorage.getItem('userInfo');
        let userName = "Thành viên";
        let role = "Customer";

        // Lấy tên để chào
        if (userInfoStr) {
            try {
                const userInfo = JSON.parse(userInfoStr);
                userName = userInfo.fullName || "Thành viên";
                role = userInfo.role || "Customer";
            } catch (e) {}
        }

        // Nếu là Admin/Staff thì hiện thêm link vào Trang Quản Trị
        let adminLink = '';
        if (role === 'Admin' || role === 'Staff') {
            adminLink = `<a href="admin-dashboard.html"><i class="ph ph-shield-check"></i> Quản trị hệ thống</a>`;
        }

        // Đổ HTML menu xổ xuống vào Header (Biến icon rỗng thành icon tô đậm ph-fill)
        container.innerHTML = `
            <a href="profile.html" class="icon-link"><i class="ph-fill ph-user" style="color: var(--color-accent-light)"></i></a>
            <div class="user-menu-dropdown">
                <div class="user-name-display">Xin chào, ${userName}</div>
                ${adminLink}
                <a href="profile.html?tab=orders"><i class="ph ph-receipt"></i> Đơn mua của tôi</a>
                
                <a href="profile.html"><i class="ph ph-user-circle"></i> Hồ sơ tài khoản</a>
                <button class="btn-logout" onclick="handleGlobalLogout()">
                    <i class="ph ph-sign-out"></i> Đăng xuất
                </button>
            </div>
        `;
    } else {
        // Nếu chưa đăng nhập, giữ nguyên nút link tới trang login
        container.innerHTML = `<a href="login.html" class="icon-link"><i class="ph ph-user"></i></a>`;
    }
}

// Hàm Xử lý Đăng xuất toàn cục
function handleGlobalLogout() {
    // 1. Xóa Token
    authManager.clear();
    // 2. Xóa thông tin User
    localStorage.removeItem('userInfo');
    
    // 3. (Tùy chọn) Xóa giỏ hàng nếu muốn: localStorage.removeItem('webnhom5_cart');

    // 4. Báo thành công
    showToast("Đã đăng xuất thành công!", "success");

    // 5. Đá văng về trang chủ sau 1 giây
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}
/* ==========================================================================
   TÍNH NĂNG ADMIN: CHUÔNG THÔNG BÁO & ĐĂNG XUẤT (DÙNG CHUNG MỌI TRANG)
   ========================================================================== */
   document.addEventListener('DOMContentLoaded', () => {
    initAdminNotificationBell();
});

let currentPendingCount = -1; // Khởi tạo -1 để biết đây là lần load đầu tiên

function initAdminNotificationBell() {
    const bellBtn = document.querySelector('.notification-bell');
    const notifyBadge = document.getElementById('new-order-badge');

    // Nếu không tìm thấy chuông (nghĩa là đang ở trang ngoài của khách hàng) thì dừng lại ngay
    if (!bellBtn || !notifyBadge) return;

    // 1. Gọi ngay 1 lần khi vừa vào trang để kiểm tra
    pollForNewOrders();

    // 2. Cài đặt vòng lặp: Cứ mỗi 30 giây sẽ âm thầm gọi xuống C# hỏi xem có đơn mới không
    setInterval(pollForNewOrders, 30000); 

    // 3. Sự kiện bấm vào cái chuông
    bellBtn.addEventListener('click', () => {
        notifyBadge.style.display = 'none'; // Tắt chấm đỏ
        // Nhảy sang trang quản lý đơn hàng và tự động lọc đơn Chờ xử lý (status=0)
        window.location.href = 'admin-orders.html?status=0';
    });
}

async function pollForNewOrders() {
    const notifyBadge = document.getElementById('new-order-badge');
    if (!notifyBadge) return;

    try {
        // Gọi API lấy danh sách đơn hàng (Giả định em có API này trong AdminOrderController)
        // Lọc lấy Status = 0 (Đang chờ duyệt)
        const response = await apiFetch(`/admin/orders?status=0`).catch(() => null);
        if (!response) return;

        const pendingOrders = Array.isArray(response) ? response : (response.items || []);
        const newPendingCount = pendingOrders.length;

        // Nếu số lượng đơn chờ duyệt mới > số lượng cũ (Và không phải là lần load đầu tiên)
        if (currentPendingCount !== -1 && newPendingCount > currentPendingCount) {
            notifyBadge.style.display = 'block'; // Bật chấm đỏ lên
            showToast("🔔 Bạn vừa có đơn đặt hàng mới! Vui lòng kiểm tra.", "success");
        }

        // Lưu lại mốc số lượng mới
        currentPendingCount = newPendingCount;

        // (Tùy chọn) Nếu đang đứng ở trang Admin Dashboard, cập nhật luôn số trên thẻ Cảnh báo
        const alertElem = document.getElementById('alert-pending-orders');
        if (alertElem) alertElem.innerText = newPendingCount;

    } catch (error) {
        console.warn("Lỗi kiểm tra thông báo ngầm:", error);
    }
}

// XỬ LÝ ĐĂNG XUẤT CHO NÚT Ở TOPBAR ADMIN
function logout() {
    // Gọi hàm clear có sẵn trong authManager
    authManager.clear();
    localStorage.removeItem('userInfo');
    
    showToast("Đã đăng xuất!", "success");
    
    // Đá văng về trang đăng nhập
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
}
// ==========================================================================
// HỘP THOẠI XÁC NHẬN DÙNG CHUNG (GLOBAL CONFIRM MODAL)
// ==========================================================================
function showConfirmModal(title, message, confirmText, onConfirmCallback) {
    let modal = document.getElementById('global-confirm-modal');
    
    // Nếu chưa có Modal trong HTML thì JS tự động tạo ra
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'global-confirm-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px 30px; z-index: 10000;">
                <div style="font-size: 3.5rem; color: var(--color-accent-dark); margin-bottom: 15px;">
                    <i class="ph-fill ph-warning-circle"></i>
                </div>
                <h2 id="global-confirm-title" style="margin-bottom: 10px; color: var(--color-primary); font-size: 1.5rem;"></h2>
                <p id="global-confirm-message" style="color: var(--text-muted); margin-bottom: 25px; line-height: 1.5; font-size: 0.95rem;"></p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="btn btn-outline" onclick="closeConfirmModal()">Hủy bỏ</button>
                    <button class="btn btn-primary" id="btn-global-confirm" style="background-color: var(--color-accent-dark);"></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Đổ nội dung vào Modal
    document.getElementById('global-confirm-title').innerText = title;
    document.getElementById('global-confirm-message').innerHTML = message;
    
    const confirmBtn = document.getElementById('btn-global-confirm');
    confirmBtn.innerText = confirmText || "Đồng ý";
    
    // Xóa sự kiện click cũ (tránh bị gọi 2 lần) và gài sự kiện mới
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', async () => {
        newConfirmBtn.disabled = true;
        newConfirmBtn.innerText = "Đang xử lý...";
        await onConfirmCallback(); // Chạy hàm thực thi (Xóa)
        closeConfirmModal();
    });

    modal.style.display = 'flex';
}

function closeConfirmModal() {
    const modal = document.getElementById('global-confirm-modal');
    if (modal) modal.style.display = 'none';
}
// ==========================================================================
// HÀM HIỂN THỊ THÔNG BÁO (TOAST) - ĐẶT TRÊN CÙNG ĐỂ DÙNG CHUNG TOÀN HỆ THỐNG
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Tự động xóa thông báo sau 3 giây
    setTimeout(() => { 
        if (toast.parentNode) {
            toast.remove(); 
        }
    }, 3000);
}