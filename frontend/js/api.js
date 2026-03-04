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
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

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
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Backend của em trả về lỗi dạng { message: ex.Message }
            const errorMessage = errorData.message || `Lỗi hệ thống: ${response.status}`;
            
            // Tự động bật Toast hiển thị lỗi, không cần alert
            showToast(errorMessage, "error");
            throw new Error(errorMessage);
        }

        // --- NẾU THÀNH CÔNG (200, 201) ---
        // Xử lý trường hợp API trả về rỗng (No Content) để không bị lỗi parse JSON
        const text = await response.text();
        return text ? JSON.parse(text) : {};

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
});

// Hàm lấy API danh mục đổ lên thanh menu ngang
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
            <a href="#" class="icon-link"><i class="ph-fill ph-user" style="color: var(--color-accent-light)"></i></a>
            <div class="user-menu-dropdown">
                <div class="user-name-display">Xin chào, ${userName}</div>
                ${adminLink}
                <a href="#"><i class="ph ph-receipt"></i> Đơn mua của tôi</a>
                <a href="#"><i class="ph ph-user-circle"></i> Hồ sơ tài khoản</a>
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