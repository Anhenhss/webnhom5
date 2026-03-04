document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra quyền (Chỉ Admin/Staff mới được thao tác)
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    document.getElementById('display-admin-name').innerText = userInfo.fullName || "Quản trị viên";
    const avatarElem = document.getElementById('admin-avatar');
    if (avatarElem) {
        // Tự động tạo ảnh đại diện theo tên (UI Avatars)
        avatarElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=003049&color=fff`;
    }
    
    if (userInfo.role === 'Customer') {
        window.location.href = 'index.html'; return;
    }

    loadCategories();
});

let categoryTreeData = [];

// 1. GỌI API & RENDER CÂY DANH MỤC
async function loadCategories() {
    try {
        const response = await apiFetch('/categories'); // Trả về List<CategoryTreeDto>
        categoryTreeData = Array.isArray(response) ? response : (response.items || []);
        
        renderTreeUI();
        updateParentDropdown();
    } catch (error) {
        console.error("Lỗi tải danh mục:", error);
        document.getElementById('category-tree').innerHTML = '<p class="text-danger text-center">Lỗi tải dữ liệu!</p>';
    }
}

// Gọi hàm đệ quy để vẽ HTML
function renderTreeUI() {
    const container = document.getElementById('category-tree');
    if (categoryTreeData.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Chưa có danh mục nào.</p>';
        return;
    }
    
    container.innerHTML = buildTreeHTML(categoryTreeData);
    bindToggleEvents();
}

// 💥 THUẬT TOÁN ĐỆ QUY VẼ CÂY (RECURSIVE RENDER) 💥
function buildTreeHTML(nodes) {
    if (!nodes || nodes.length === 0) return '';
    
    let html = '<ul class="cat-tree">';
    nodes.forEach(n => {
        const hasChildren = n.children && n.children.length > 0;
        
        html += `
            <li class="cat-node">
                <div class="cat-row">
                    ${hasChildren 
                        ? `<i class="ph-bold ph-caret-down toggle-icon" data-target="child-ul-${n.id}"></i>` 
                        : `<span class="spacer"></span>`}
                    
                    <span class="cat-name">${n.name}</span>
                    
                    <div class="cat-actions">
                        <button type="button" class="btn-icon-sm" title="Thêm danh mục con" onclick="setupAddChild(${n.id}, '${n.name}')">
                            <i class="ph ph-plus"></i>
                        </button>
                        <button type="button" class="btn-icon-sm text-danger" title="Xóa" onclick="deleteCategory(${n.id})">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
                <div id="child-ul-${n.id}">
                    ${hasChildren ? buildTreeHTML(n.children) : ''}
                </div>
            </li>
        `;
    });
    html += '</ul>';
    return html;
}

// Gắn sự kiện đóng/mở nhánh cây
function bindToggleEvents() {
    const icons = document.querySelectorAll('.toggle-icon');
    icons.forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.toggle('d-none'); // Ẩn/hiện thẻ div con
                this.classList.toggle('collapsed'); // Quay mũi tên
            }
        });
    });
}

// 2. LOGIC CẬP NHẬT SELECT BOX "DANH MỤC CHA"
function updateParentDropdown() {
    const select = document.getElementById('cat-parent');
    select.innerHTML = '<option value="">-- Là danh mục gốc (Root) --</option>';
    
    // Đệ quy làm phẳng cây để đưa vào thẻ Select
    const flatList = flattenCategories(categoryTreeData);
    flatList.forEach(c => {
        select.add(new Option(c.name, c.id));
    });
}

function flattenCategories(tree, prefix = "") {
    let list = [];
    tree.forEach(node => {
        list.push({ id: node.id, name: prefix + node.name });
        if (node.children && node.children.length > 0) {
            // Thêm tiền tố "--" để thụt lề trực quan trong thẻ Select
            list = list.concat(flattenCategories(node.children, prefix + "--- "));
        }
    });
    return list;
}

// 3. THAO TÁC FORM (THÊM / CHUẨN BỊ THÊM CON)
function setupAddChild(parentId, parentName) {
    // Khi bấm nút [+] trên 1 dòng, form sẽ tự động set Danh mục cha là dòng đó
    document.getElementById('cat-parent').value = parentId;
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-name').focus();
    showToast(`Đang thêm danh mục con cho "${parentName}"`, "success");
}

function resetForm() {
    document.getElementById('category-form').reset();
    document.getElementById('cat-parent').value = "";
    document.getElementById('cat-name').focus();
}

async function saveCategory(event) {
    event.preventDefault();
    
    const parentIdValue = document.getElementById('cat-parent').value;
    
    const dto = {
        Name: document.getElementById('cat-name').value.trim(),
        ParentId: parentIdValue ? parseInt(parentIdValue) : null // null nghĩa là Root
    };

    try {
        await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(dto)
        });
        showToast("Thêm danh mục thành công!", "success");
        resetForm();
        loadCategories(); // Render lại cây
    } catch (error) {
        // apiFetch tự báo lỗi
    }
}

// 4. XÓA DANH MỤC
async function deleteCategory(id) {
    if(!confirm("CẢNH BÁO: Bạn có chắc muốn xóa danh mục này? Nếu có danh mục con, chúng cũng có thể bị ảnh hưởng!")) return;
    
    try {
        await apiFetch(`/categories/${id}`, { method: 'DELETE' });
        showToast("Đã xóa danh mục", "success");
        loadCategories();
    } catch (error) {
        // Lỗi (như danh mục đang chứa sản phẩm) sẽ được báo ở đây dựa trên logic Backend C#
    }
}

function logout() {
    authManager.clear();
    window.location.href = 'login.html';
}