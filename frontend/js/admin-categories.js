// URL API từ Backend (Khớp với thiết lập của Nhung/Duy)
const API_URL = "https://localhost:7123/api/categories";

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    setupAdminInfo(); // Hiển thị tên Admin từ Token
});

// 1. Tải dữ liệu từ Backend
async function loadCategories() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Không thể tải dữ liệu");
        
        const data = await response.json();
        
        renderTree(data);     // Vẽ cây bên trái
        updateDropdown(data); // Đổ dữ liệu vào ô chọn "Danh mục cha"
    } catch (error) {
        showToast("Lỗi: " + error.message, "error");
    }
}

// 2. Hàm vẽ cây đệ quy
function renderTree(categories) {
    const container = document.getElementById('categories-tree');
    container.innerHTML = "";

    const buildHTML = (list) => {
        return list.map(item => `
            <li>
                <div class="tree-item">
                    <div class="cat-info">
                        <i class="ph-bold ${item.children && item.children.length > 0 ? 'ph-folder-open' : 'ph-file'}"></i>
                        <span>${item.name}</span>
                        ${item.productCount ? `<span class="product-count">${item.productCount} SP</span>` : ''}
                    </div>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="editCategory(${item.id}, '${item.name}', ${item.parentId})" title="Sửa">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteCategory(${item.id})" title="Xóa">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
                ${item.children && item.children.length > 0 ? `<ul class="tree-children">${buildHTML(item.children)}</ul>` : ''}
            </li>
        `).join('');
    };

    container.innerHTML = buildHTML(categories);
}

// 3. Cập nhật danh sách chọn "Danh mục cha" (Phẳng hóa cây)
function updateDropdown(categories) {
    const select = document.getElementById('cat-parent');
    select.innerHTML = '<option value="">-- Là danh mục gốc --</option>';
    
    const addToSelect = (list, level = 0) => {
        list.forEach(item => {
            const prefix = "— ".repeat(level);
            const option = new Option(prefix + item.name, item.id);
            select.add(option);
            if (item.children) addToSelect(item.children, level + 1);
        });
    };
    addToSelect(categories);
}

// 4. Xử lý lưu (Thêm/Sửa)
document.getElementById('category-form').onsubmit = async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const parentId = document.getElementById('cat-parent').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;
    
    const body = {
        name: name,
        parentId: parentId ? parseInt(parentId) : null
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Lấy token từ Nhung viết
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            showToast(id ? "Cập nhật thành công!" : "Thêm mới thành công!");
            resetForm();
            loadCategories();
        } else {
            const errorData = await response.json();
            showToast(errorData.message || "Có lỗi xảy ra", "error");
        }
    } catch (error) {
        showToast("Lỗi kết nối server", "error");
    }
};

// 5. Xử lý Xóa
async function deleteCategory(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa danh mục này? Các danh mục con sẽ bị ảnh hưởng!")) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        });

        if (response.ok) {
            showToast("Đã xóa danh mục");
            loadCategories();
        } else {
            showToast("Không thể xóa danh mục đang có sản phẩm", "error");
        }
    } catch (error) {
        showToast("Lỗi khi xóa", "error");
    }
}

// 6. Chế độ Sửa
function editCategory(id, name, parentId) {
    document.getElementById('form-title').innerHTML = '<i class="ph ph-pencil-simple"></i> Chỉnh sửa danh mục';
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('cat-parent').value = parentId || "";
    document.getElementById('cat-name').focus();
}

function resetForm() {
    document.getElementById('form-title').innerHTML = '<i class="ph ph-plus"></i> Thêm danh mục mới';
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = "";
}

// 7. Hiển thị Toast (Dùng chung với Admin Đơn hàng)
function showToast(message, type = "success") {
    // Logic hiển thị toast của Thảo ở đây
    console.log(`${type.toUpperCase()}: ${message}`);
    // Bạn có thể dùng thư viện hoặc tự viết hàm hiển thị thông báo
}