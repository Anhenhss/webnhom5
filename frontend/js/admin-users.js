let allUsers = [];
let currentTab = 'Customer'; // Mặc định hiện Khách hàng
let currentUserRole = ''; // Lưu role người đang đăng nhập

document.addEventListener('DOMContentLoaded', () => {
    // 1. RÀNG BUỘC ĐĂNG NHẬP
    if (!authManager.isLoggedIn()) { 
        window.location.href = 'login.html'; 
        return; 
    }
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUserRole = userInfo.role;

    // Cho phép cả Admin và Staff vào xem, nhưng Staff bị giới hạn thao tác
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Staff') {
        showToast("Bạn không có quyền truy cập trang này!", "error");
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    // 2. HIỂN THỊ LỜI CHÀO 
    const roleTitle = currentUserRole === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const nameElem = document.getElementById('display-admin-name');
    if (nameElem) {
        nameElem.innerText = `${roleTitle} (${userInfo.fullName})`;
    }
    const avatarElem = document.getElementById('admin-avatar');
    if (avatarElem) {
        // Tự động tạo ảnh đại diện theo tên (UI Avatars)
        avatarElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=003049&color=fff`;
    }

    // 3. KHỞI TẠO DỮ LIỆU
    loadUsers();

    // Tìm kiếm (Debounce 500ms)
    let searchTimeout;
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderCurrentTable();
            }, 500);
        });
    }
});

async function loadUsers() {
    try {
        const response = await apiFetch('/admin/users?pageSize=1000');
        allUsers = response.items || response;
        
        updateCounts();
        renderCurrentTable();
    } catch (error) { console.error(error); }
}

function updateCounts() {
    ['Customer', 'Staff', 'Admin'].forEach(role => {
        const elem = document.getElementById(`cnt-${role}`);
        if (elem) {
            const count = allUsers.filter(u => u.role === role).length;
            elem.innerText = count;
        }
    });
}

function switchUserTab(role, event) {
    currentTab = role;
    document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderCurrentTable();
}

function renderCurrentTable() {
    const kw = document.getElementById('user-search-input').value.toLowerCase();
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '';

    const filtered = allUsers.filter(u => 
        u.role === currentTab && 
        (u.fullName.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Không có dữ liệu trong mục này.</td></tr>';
        return;
    }

    // Kiểm tra quyền: Nếu không phải Admin thì khóa mọi thao tác
    const isReadOnly = currentUserRole !== 'Admin';

    filtered.forEach(u => {
        const initial = u.fullName ? u.fullName.charAt(0).toUpperCase() : '?';
        const tr = `
            <tr>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-placeholder">${initial}</div>
                        <span class="user-name-txt">${u.fullName}</span>
                    </div>
                </td>
                <td class="user-contact-txt">${u.email}<br><small>${u.phoneNumber || ''}</small></td>
                <td>
                    <select class="role-select" onchange="changeRole(${u.id}, this.value)" ${isReadOnly ? 'disabled' : ''}>
                        <option value="Customer" ${u.role === 'Customer'?'selected':''}>Khách hàng</option>
                        <option value="Staff" ${u.role === 'Staff'?'selected':''}>Nhân viên</option>
                        <option value="Admin" ${u.role === 'Admin'?'selected':''}>Quản trị viên</option>
                    </select>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${u.isLocked ? 'checked' : ''} onchange="toggleLock(${u.id}, this.checked)" ${isReadOnly ? 'disabled' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px" 
                        onclick="${isReadOnly ? "showToast('Chỉ Quản trị viên mới có quyền sửa!','error')" : "showToast('Sắp có!','warning')"}" 
                        ${isReadOnly ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                        Sửa
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

async function changeRole(userId, newRole) {
    if (currentUserRole !== 'Admin') {
        showToast("Lỗi: Bạn không có quyền thay đổi phân quyền!", "error");
        loadUsers(); // Refresh để trả về giá trị cũ
        return;
    }
    try {
        await apiFetch(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ Role: newRole })
        });
        showToast("Đã cập nhật quyền hạn!", "success");
        const idx = allUsers.findIndex(u => u.id === userId);
        if (idx !== -1) {
            allUsers[idx].role = newRole;
            updateCounts();
            renderCurrentTable();
        }
    } catch (error) { loadUsers(); }
}

async function toggleLock(userId, isLocked) {
    if (currentUserRole !== 'Admin') {
        showToast("Lỗi: Bạn không có quyền khóa/mở khóa tài khoản!", "error");
        loadUsers();
        return;
    }
    try {
        await apiFetch(`/admin/users/${userId}/lock`, { method: 'PUT', body: JSON.stringify(isLocked) });
        showToast(isLocked ? "Đã khóa" : "Đã mở khóa", "success");
    } catch (error) { loadUsers(); }
}

// MODAL THÊM USER
function openAddUserModal() {
    if (currentUserRole !== 'Admin') {
        showToast("Chỉ Quản trị viên mới có quyền thêm tài khoản!", "error");
        return;
    }
    document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() { document.getElementById('add-user-modal').style.display = 'none'; }

async function submitAddUser(event) {
    event.preventDefault();
    if (currentUserRole !== 'Admin') {
        showToast("Thao tác bị từ chối!", "error");
        return;
    }
    const dto = {
        FullName: document.getElementById('add-fullname').value,
        Email: document.getElementById('add-email').value,
        Password: document.getElementById('add-password').value,
        Role: document.getElementById('add-role').value
    };

    try {
        await apiFetch('/admin/users/create-account', { method: 'POST', body: JSON.stringify(dto) });
        showToast("Tạo tài khoản thành công!", "success");
        closeAddUserModal();
        loadUsers();
    } catch (error) {}
}