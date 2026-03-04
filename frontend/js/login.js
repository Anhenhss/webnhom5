document.addEventListener('DOMContentLoaded', () => {
    const signUpButton = document.getElementById('signUpToggle');
    const signInButton = document.getElementById('signInToggle');
    const container = document.getElementById('auth-container');

    signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
    signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));

    // Nếu đã có token thì đẩy về trang chủ hoặc admin
    if (authManager.isLoggedIn()) {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        redirectByRole(userInfo.role);
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// ==========================================
// HÀM GIẢI MÃ TOKEN (Để lấy Role & Name từ C#)
// ==========================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Xử lý lưu thông tin user từ Token
function processAndLogin(accessToken, refreshToken) {
    authManager.setTokens(accessToken, refreshToken);
    
    // Giải mã token
    const decoded = parseJwt(accessToken);
    if (!decoded) return;

    // Trong C#, ClaimTypes.Role thường map thành key "role" hoặc link XML schema
    const role = decoded["role"] || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || "Customer";
    
    // ClaimTypes.Name thường map thành "unique_name" hoặc link XML
    const fullName = decoded["unique_name"] || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "Bạn";

    // Lưu vào LocalStorage
    localStorage.setItem('userInfo', JSON.stringify({ fullName, role }));

    showToast(`Xin chào ${fullName}!`, "success");
    setTimeout(() => redirectByRole(role), 1500);
}

function redirectByRole(role) {
    if (role === 'Admin' || role === 'Staff') window.location.href = 'admin-dashboard.html';
    else window.location.href = 'index.html'; 
}

// ==========================================
// 1. XỬ LÝ ĐĂNG KÝ
// ==========================================
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm').value;
    const btn = document.getElementById('btn-register');

    if (password !== confirmPassword) {
        showToast("Mật khẩu xác nhận không khớp!", "error");
        return;
    }

    try {
        btn.disabled = true; btn.innerText = "ĐANG XỬ LÝ...";
        // Gọi API C# (Dựa theo RegisterDto)
        await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ FullName: name, Email: email, Password: password, ConfirmPassword: confirmPassword })
        });

        showToast("Đăng ký thành công! Hãy đăng nhập.", "success");
        document.getElementById('auth-container').classList.remove("right-panel-active");
        document.getElementById('login-email').value = email;
        document.getElementById('register-form').reset();
    } catch (error) {
        // api.js tự show toast lỗi
    } finally {
        btn.disabled = false; btn.innerText = "ĐĂNG KÝ";
    }
}

// ==========================================
// 2. XỬ LÝ ĐĂNG NHẬP THƯỜNG
// ==========================================
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');

    try {
        btn.disabled = true; btn.innerText = "ĐANG VÀO...";
        // Gọi API C# (Dựa theo LoginDto)
        const response = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ Email: email, Password: password })
        });

        processAndLogin(response.accessToken, response.refreshToken);
    } catch (error) {
        document.getElementById('login-pass').value = ''; 
    } finally {
        btn.disabled = false; btn.innerText = "ĐĂNG NHẬP";
    }
}

// ==========================================
// 3. XỬ LÝ GOOGLE LOGIN CALLBACK
// ==========================================
// Hàm này được Google gọi tự động khi khách hàng chọn tài khoản xong
async function handleGoogleLogin(response) {
    try {
        // response.credential chính là cục Token mà Google cấp
        const idToken = response.credential;
        
        // Bắn IdToken xuống cho Backend C# (Dựa theo GoogleLoginDto)
        const apiRes = await apiFetch('/auth/google-login', {
            method: 'POST',
            body: JSON.stringify({ IdToken: idToken })
        });

        processAndLogin(apiRes.accessToken, apiRes.refreshToken);
    } catch (err) {
        showToast("Lỗi đăng nhập Google", "error");
    }
}