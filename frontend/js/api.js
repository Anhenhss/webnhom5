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
// GLOBAL SEARCH LOGIC (TÌM KIẾM TOÀN CỤC TRÊN HEADER)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('global-search-input');
    const searchBtn = document.getElementById('global-search-btn');

    if (searchInput) {
        // 1. Khi người dùng ấn phím Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                executeGlobalSearch(searchInput.value);
            }
        });
    }

    if (searchBtn) {
        // 2. Khi người dùng click vào icon kính lúp
        searchBtn.addEventListener('click', () => {
            if (searchInput) executeGlobalSearch(searchInput.value);
        });
    }
});

function executeGlobalSearch(keyword) {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return; // Không gõ gì thì không tìm

    // Kiểm tra xem trình duyệt có đang ở trang shop.html không
    const isShopPage = window.location.pathname.includes('shop.html');

    if (!isShopPage) {
        // Nếu ĐANG Ở TRANG CHỦ (hoặc trang khác): Chuyển hướng sang Shop kèm theo từ khóa
        window.location.href = `shop.html?search=${encodeURIComponent(trimmedKeyword)}`;
    }
    // Ghi chú: Nếu ĐÃ Ở TRANG SHOP, file shop.js đã tự động xử lý Live Search (gõ tới đâu lọc tới đó), 
    // nên ta không cần redirect trang ở đây nữa.
}