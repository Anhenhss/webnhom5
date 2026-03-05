let allUsers = [];
let currentTab = 'Customer'; // Mặc định hiện Khách hàng
let currentUserRole = ''; // Lưu role người đang đăng nhập
let currentUserId = 0; // Lưu ID của chính mình để tránh tự khóa/tự xóa

document.addEventListener('DOMContentLoaded', () => {
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUserRole = userInfo.role;
    
    // Lấy ID từ token 
    const token = authManager.getAccessToken();
    if(token) {
        try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            currentUserId = parseInt(decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || decoded["nameid"] || 0);
        } catch(e){}
    }

    if (currentUserRole !== 'Admin' && currentUserRole !== 'Staff') {
        window.location.href = 'index.html'; return;
    }

    const roleTitle = currentUserRole === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const nameElem = document.getElementById('display-admin-name');
    if (nameElem) nameElem.innerText = `${roleTitle} (${userInfo.fullName})`;

    loadUsers();

    let searchTimeout;
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { renderCurrentTable(); }, 500);
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Không có dữ liệu.</td></tr>';
        return;
    }

    const isReadOnly = currentUserRole !== 'Admin';

    filtered.forEach(u => {
        const initial = u.fullName ? u.fullName.charAt(0).toUpperCase() : '?';
        const isMe = u.id === currentUserId; // Đánh dấu đây là chính mình

        // Tạo một style làm mờ nhưng KHÔNG dùng thuộc tính disabled của HTML
        const lockStyle = (isReadOnly || isMe) ? 'opacity: 0.6; cursor: not-allowed;' : '';

        const tr = `
            <tr>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-placeholder">${initial}</div>
                        <span class="user-name-txt">${u.fullName} ${isMe ? '<span style="color:red;font-size:0.8rem">(Bạn)</span>' : ''}</span>
                    </div>
                </td>
                <td class="user-contact-txt">${u.email}<br><small>${u.phoneNumber || ''}</small></td>
                <td>
                    <select class="role-select" onchange="changeRole(${u.id}, this.value)" style="${lockStyle}">
                        <option value="Customer" ${u.role === 'Customer'?'selected':''}>Khách hàng</option>
                        <option value="Staff" ${u.role === 'Staff'?'selected':''}>Nhân viên</option>
                        <option value="Admin" ${u.role === 'Admin'?'selected':''}>Quản trị viên</option>
                    </select>
                </td>
                <td>
                    <label class="switch" style="${lockStyle}">
                        <input type="checkbox" ${u.isLocked ? 'checked' : ''} onchange="toggleLock(${u.id}, this.checked)">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.85rem; ${isReadOnly ? 'opacity:0.5; cursor:not-allowed;' : ''}" 
                            onclick="openEditUserModal(${u.id})">
                            <i class="ph ph-pencil-simple"></i> Sửa
                        </button>
                        
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.85rem; color:var(--color-accent-dark); border-color:var(--color-accent-dark); ${(isReadOnly || isMe) ? 'opacity:0.5; cursor:not-allowed;' : ''}" 
                            onclick="deleteUser(${u.id}, '${u.fullName}')">
                            <i class="ph ph-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// --- THAY ĐỔI ROLE & LOCK ---
async function changeRole(userId, newRole) {
    if (currentUserRole !== 'Admin') {
        showToast("Chỉ Quản trị viên mới được thao tác!", "error");
        loadUsers(); 
        return;
    }
    try {
        await apiFetch(`/admin/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ Role: newRole }) });
        showToast("Đã cập nhật quyền hạn!", "success");
        loadUsers();
    } catch (error) { loadUsers(); }
}

async function toggleLock(userId, isLocked) {
    if (currentUserRole !== 'Admin') {
        showToast("Chỉ Quản trị viên mới được thao tác!", "error");
        loadUsers(); 
        return;
    }
    try {
        await apiFetch(`/admin/users/${userId}/lock`, { method: 'PUT', body: JSON.stringify(isLocked) });
        showToast(isLocked ? "Tài khoản đã bị khóa!" : "Đã mở khóa tài khoản!", "success");
    } catch (error) { loadUsers(); }
}

// ==========================================
// FORM THÊM & SỬA USER (DÙNG CHUNG 1 MODAL)
// ==========================================
function openAddUserModal() {
    if (currentUserRole !== 'Admin') { showToast("Chỉ Quản trị viên mới được thao tác!", "error"); return; }
    
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-id').value = '';
    document.getElementById('modal-title').innerText = 'Tạo tài khoản mới';
    document.getElementById('btn-submit-user').innerText = 'Tạo tài khoản';
    
    const passInput = document.getElementById('user-password');
    passInput.required = true;
    document.getElementById('lbl-password').innerText = 'Mật khẩu *';

    document.getElementById('user-modal').style.display = 'flex';
}

function openEditUserModal(id) {
    if (currentUserRole !== 'Admin') {
        showToast("Chỉ Quản trị viên mới được thao tác!", "error");
        return;
    }
    
    const user = allUsers.find(u => u.id === id);
    if(!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('user-fullname').value = user.fullName;
    document.getElementById('user-email').value = user.email;
    document.getElementById('user-role').value = user.role;
    
    document.getElementById('modal-title').innerText = 'Cập nhật tài khoản';
    document.getElementById('btn-submit-user').innerText = 'Lưu thay đổi';

    const passInput = document.getElementById('user-password');
    passInput.required = false;
    passInput.value = '';
    document.getElementById('lbl-password').innerText = 'Mật khẩu mới (Bỏ trống nếu không đổi)';

    document.getElementById('user-modal').style.display = 'flex';
}

function closeUserModal() { 
    document.getElementById('user-modal').style.display = 'none'; 
}

// XỬ LÝ NÚT SUBMIT 
async function submitUserForm(event) {
    event.preventDefault();
    if (currentUserRole !== 'Admin') return;

    const id = document.getElementById('edit-user-id').value;
    const isEdit = id !== ''; 

    const dto = {
        FullName: document.getElementById('user-fullname').value,
        Email: document.getElementById('user-email').value,
        Role: document.getElementById('user-role').value
    };
    
    const password = document.getElementById('user-password').value;
    if(password) dto.Password = password; 

    try {
        if(isEdit) {
            await apiFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(dto) });
            showToast("Đã cập nhật thông tin thành công!", "success");
        } else {
            await apiFetch('/admin/users/create-account', { method: 'POST', body: JSON.stringify(dto) });
            showToast("Tạo tài khoản thành công!", "success");
        }
        
        closeUserModal();
        loadUsers(); 
    } catch (error) {
        // api.js tự show Toast đỏ
    }
}

// ==========================================
// XÓA TÀI KHOẢN (SỬ DỤNG GLOBAL MODAL TỪ API.JS)
// ==========================================
function deleteUser(id, name) {
    if (currentUserRole !== 'Admin') {
        showToast("Chỉ Quản trị viên mới được thao tác!", "error");
        return;
    }
    
    // Gọi hàm Modal dùng chung, code trở nên cực kỳ ngắn gọn và sạch sẽ
    showConfirmModal(
        "Xóa Tài Khoản?", 
        `Hành động này không thể hoàn tác.<br>Bạn có chắc muốn xóa tài khoản <strong>"${name}"</strong> không?`, 
        "Đồng ý Xóa", 
        async () => {
            try {
                await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
                showToast(`Đã xóa vĩnh viễn tài khoản!`, "success");
                loadUsers(); // Load lại lưới dữ liệu
            } catch(error) {
                // Lỗi C# sẽ do apiFetch tự hiện Toast đỏ
            }
        }
    );
}