let categoryTreeData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Ràng buộc quyền truy cập
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo.role !== 'Admin' && userInfo.role !== 'Staff') {
        window.location.href = 'index.html'; return;
    }

    const roleTitle = userInfo.role === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const nameElem = document.getElementById('display-admin-name');
    if(nameElem) nameElem.innerText = `${roleTitle} (${userInfo.fullName})`;

    // Tải dữ liệu lần đầu
    loadCategories();
});

// 1. GỌI API & RENDER CÂY DANH MỤC
async function loadCategories() {
    try {
        // Thêm ?t=thời_gian_hiện_tại để ép trình duyệt luôn lấy dữ liệu mới nhất từ C#, không dùng Cache
        const timestamp = new Date().getTime();
        const response = await apiFetch(`/categories?t=${timestamp}`); 
        
        categoryTreeData = Array.isArray(response) ? response : (response.items || []);
        
        renderTreeUI();
        updateParentDropdown();
    } catch (error) {
        console.error("Lỗi tải danh mục:", error);
        document.getElementById('category-tree').innerHTML = '<p class="text-danger text-center">Lỗi tải dữ liệu. Vui lòng thử lại!</p>';
    }
}

// 2. VẼ CÂY (ĐỆ QUY)
function renderTreeUI() {
    const container = document.getElementById('category-tree');
    if (!categoryTreeData || categoryTreeData.length === 0) {
        container.innerHTML = '<p class="text-center text-muted" style="padding: 20px;">Chưa có danh mục nào. Hãy tạo danh mục gốc đầu tiên!</p>';
        return;
    }
    
    container.innerHTML = buildTreeHTML(categoryTreeData);
    bindToggleEvents();
}

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
                        <button type="button" class="btn-icon-sm" title="Thêm danh mục con vào đây" onclick="setupAddChild(${n.id}, '${n.name}')">
                            <i class="ph ph-plus"></i>
                        </button>
                        <button type="button" class="btn-icon-sm text-danger" title="Xóa danh mục này" onclick="deleteCategory(${n.id}, '${n.name}')">
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

// Mở/Đóng nhánh cây
function bindToggleEvents() {
    const icons = document.querySelectorAll('.toggle-icon');
    icons.forEach(icon => {
        // Đảm bảo không bị bind sự kiện nhiều lần nếu load lại cây
        icon.replaceWith(icon.cloneNode(true));
    });

    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.classList.toggle('d-none');
                this.classList.toggle('collapsed');
            }
        });
    });
}

// 3. ĐỔ DỮ LIỆU VÀO SELECT BOX
function updateParentDropdown() {
    const select = document.getElementById('cat-parent');
    if (!select) return;

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
            list = list.concat(flattenCategories(node.children, prefix + "--- "));
        }
    });
    return list;
}

// 4. THAO TÁC FORM (THÊM DANH MỤC)
function setupAddChild(parentId, parentName) {
    // Hàm này chạy khi bấm dấu [+] trên cây
    const parentSelect = document.getElementById('cat-parent');
    parentSelect.value = parentId;
    
    const nameInput = document.getElementById('cat-name');
    nameInput.value = '';
    nameInput.focus();
    
    document.getElementById('form-title').innerHTML = `<i class="ph-fill ph-plus-circle"></i> Thêm con cho: ${parentName}`;
}

function resetForm() {
    document.getElementById('category-form').reset();
    document.getElementById('cat-parent').value = "";
    document.getElementById('form-title').innerHTML = `<i class="ph-fill ph-plus-circle"></i> Thêm Danh mục mới`;
    document.getElementById('cat-name').focus();
}

// LƯU DANH MỤC
async function saveCategory(event) {
    event.preventDefault();
    
    const parentIdValue = document.getElementById('cat-parent').value;
    const catName = document.getElementById('cat-name').value.trim();
    const btnSave = document.getElementById('btn-save');
    
    if (!catName) {
        showToast("Vui lòng nhập tên danh mục!", "warning");
        return;
    }

    const dto = {
        Name: catName,
        ParentId: parentIdValue ? parseInt(parentIdValue) : null
    };

    try {
        btnSave.disabled = true;
        btnSave.innerText = "Đang lưu...";

        // GỌI API THÊM MỚI
        const response = await apiFetch('/categories', {
            method: 'POST',
            body: JSON.stringify(dto)
        });
        
        // HIỂN THỊ THÔNG BÁO VÀ LOAD LẠI CÂY
        showToast(`Đã thêm thành công danh mục: "${catName}"`, "success");
        
        resetForm();
        await loadCategories(); // Ép phải đợi tải xong cây mới nhả nút
        
    } catch (error) {
        console.error("Lỗi khi thêm danh mục:", error);
        // Nếu lỗi 400 (Trùng tên, v.v.), apiFetch đã tự gọi showToast đỏ rồi.
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = "Lưu Danh Mục";
    }
}

// 5. XÓA DANH MỤC
function deleteCategory(id, name) {
    // Gọi hàm tạo Modal siêu xịn từ api.js
    showConfirmModal(
        "Xóa Danh Mục?", 
        `Hành động này không thể hoàn tác.<br>Bạn có chắc muốn xóa danh mục <strong>"${name}"</strong> không?<br><br><small style="color:#C1121F">Lưu ý: Không thể xóa nếu danh mục này đang chứa sản phẩm hoặc có danh mục con.</small>`, 
        "Đồng ý Xóa", 
        async () => {
            try {
                await apiFetch(`/categories/${id}`, { method: 'DELETE' });
                showToast(`Đã xóa vĩnh viễn danh mục "${name}"`, "success");
                loadCategories(); // Tải lại Cây ngay lập tức
            } catch (error) {
                // Backend báo lỗi (ví dụ: đang chứa sản phẩm) sẽ tự văng Toast đỏ
            }
        }
    );
}