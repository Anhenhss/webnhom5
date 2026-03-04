const BACKEND_URL = 'http://localhost:5195'; // Đổi port nếu Quý dùng port khác
let masterColors = [];
let masterSizes = [];
let galleryFiles = []; 
let thumbnailFile = null;
let allProductsList = []; // Chứa danh sách để tìm kiếm
let editingProductId = null; // Cờ đánh dấu đang Thêm hay Sửa

document.addEventListener('DOMContentLoaded', () => {
    // Ràng buộc bảo mật
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo.role !== 'Admin' && userInfo.role !== 'Staff') {
        window.location.href = 'index.html'; return;
    }
    
    const roleName = userInfo.role === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const displayElem = document.getElementById('display-admin-name');
    if(displayElem) displayElem.innerText = `${roleName} (${userInfo.fullName})`;

    loadCategories();
    loadMasterData();
    loadProducts();
});

// ==========================================
// 1. TẢI DỮ LIỆU BAN ĐẦU
// ==========================================
async function loadCategories() {
    try {
        const response = await apiFetch('/categories');
        const select = document.getElementById('p-category');
        select.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        flattenCategories(response).forEach(c => select.add(new Option(c.name, c.id)));
    } catch (e) {}
}

function flattenCategories(tree, prefix = "") {
    let list = [];
    tree.forEach(node => {
        list.push({ id: node.id, name: prefix + node.name });
        if (node.children) list = list.concat(flattenCategories(node.children, prefix + "--- "));
    });
    return list;
}

async function loadMasterData() {
    try {
        let colors = await apiFetch('/master-data/colors');
        let sizes = await apiFetch('/master-data/sizes');
        masterColors = [{ id: 0, name: "Không áp dụng", hexCode: "NA" }, ...colors];
        masterSizes = [{ id: 0, name: "Không áp dụng", code: "NA" }, ...sizes];
    } catch (error) { console.error("Lỗi Master Data:", error); }
}

// ==========================================
// 2. RENDER BẢNG & TÌM KIẾM
// ==========================================
async function loadProducts() {
    try {
        const response = await apiFetch('/products');
        allProductsList = Array.isArray(response) ? response : (response.items || []);
        renderProductTable(allProductsList);
    } catch (e) { console.error(e); }
}

// Thanh tìm kiếm (Chờ 300ms sau khi gõ xong mới tìm)
let searchTimeout;
document.getElementById('product-search').addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const kw = e.target.value.toLowerCase().trim();
    searchTimeout = setTimeout(() => {
        const filtered = allProductsList.filter(p => 
            p.name.toLowerCase().includes(kw) || 
            (p.categoryName && p.categoryName.toLowerCase().includes(kw))
        );
        renderProductTable(filtered);
    }, 300);
});

function renderProductTable(products) {
    const tbody = document.getElementById('product-tbody');
    tbody.innerHTML = '';
    
    if(products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không tìm thấy sản phẩm.</td></tr>';
        return;
    }

    products.forEach(p => {
        let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
        const badgeClass = p.isActive ? 'badge-completed' : 'badge-cancelled';
        const badgeText = p.isActive ? 'Bật' : 'Ẩn';

        const tr = `
            <tr>
                <td><div style="display:flex; align-items:center; gap:10px;"><img src="${imgUrl}" class="product-thumb-small"><strong>${p.name}</strong></div></td>
                <td>${p.categoryName}</td>
                <td>${new Intl.NumberFormat('vi-VN').format(p.price)}₫</td>
                <td><strong>${p.totalStock || 0}</strong></td>
                <td><span class="badge ${badgeClass}" style="cursor:pointer" onclick="toggleProductStatus(${p.id})">${badgeText}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">Sửa</button>
                    <button class="btn-icon-sm text-danger" onclick="deleteProduct(${p.id})" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px;"><i class="ph-bold ph-trash"></i></button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// ==========================================
// 3. THAO TÁC XÓA & BẬT/ẨN
// ==========================================
async function deleteProduct(id) {
    if(!confirm("Cảnh báo: Bạn chắc chắn muốn xóa sản phẩm này?")) return;
    try {
        await apiFetch(`/products/${id}`, { method: 'DELETE' });
        showToast("Đã xóa sản phẩm", "success");
        loadProducts();
    } catch (e) { showToast("Không thể xóa sản phẩm", "error"); }
}

async function toggleProductStatus(id) {
    try {
        await apiFetch(`/products/${id}/toggle-status`, { method: 'PUT' });
        showToast("Đã đổi trạng thái", "success");
        loadProducts();
    } catch (e) { showToast("Lỗi khi đổi trạng thái", "error"); }
}

// ==========================================
// 4. QUẢN LÝ ẢNH & SKU BIẾN THỂ
// ==========================================
function previewThumbnail(input) {
    const container = document.getElementById('thumbnail-preview');
    container.innerHTML = '';
    thumbnailFile = null;
    if (input.files && input.files[0]) {
        thumbnailFile = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            container.innerHTML = `<div class="img-preview-box"><img src="${e.target.result}"><div class="btn-remove-img" onclick="removeThumbnail()"><i class="ph ph-x"></i></div></div>`;
        };
        reader.readAsDataURL(thumbnailFile);
    }
}
function removeThumbnail() {
    document.getElementById('p-thumbnail').value = "";
    document.getElementById('thumbnail-preview').innerHTML = "";
    thumbnailFile = null;
}
function handleGalleryUpload(event) {
    galleryFiles = galleryFiles.concat(Array.from(event.target.files));
    renderGallery();
    document.getElementById('p-gallery').value = "";
}
function renderGallery() { /* Đã ẩn bớt để code gọn, giữ nguyên logic cũ */ }

function addVariantRow(data = null) {
    const tbody = document.getElementById('variant-tbody');
    const rowId = Date.now() + Math.random().toString().substring(2, 6); // Id duy nhất
    
    // Nếu data truyền vào (từ Edit), set giá trị
    const cId = data ? data.colorId : "";
    const sId = data ? data.sizeId : "";
    const sku = data ? data.sku : "";
    const qty = data ? data.quantity : 10;
    const priceMod = data ? data.priceModifier : 0;

    const tr = document.createElement('tr');
    tr.id = `v-row-${rowId}`;
    tr.innerHTML = `
        <td>
            <select class="variant-input v-color" onchange="updateRowSKU('${rowId}')">
                <option value="">-- Chọn Màu --</option>
                ${masterColors.map(c => `<option value="${c.id}" ${c.id == cId ? 'selected':''}>${c.name}</option>`).join('')}
            </select>
        </td>
        <td>
            <select class="variant-input v-size" onchange="updateRowSKU('${rowId}')">
                <option value="">-- Chọn Size --</option>
                ${masterSizes.map(s => `<option value="${s.id}" ${s.id == sId ? 'selected':''}>${s.name}</option>`).join('')}
            </select>
        </td>
        <td><input type="text" class="variant-input v-sku" readonly value="${sku}" placeholder="Tự động sinh"></td>
        <td><input type="number" class="variant-input v-qty" value="${qty}" min="0"></td>
        <td><input type="number" class="variant-input v-price" value="${priceMod}"></td>
        <td class="text-center"><i class="ph-bold ph-trash btn-remove-row" onclick="this.closest('tr').remove()"></i></td>
    `;
    tbody.appendChild(tr);
    if(!data) updateRowSKU(rowId); // Nếu thêm mới thì sinh mã
}

function updateRowSKU(rowId) {
    const row = document.getElementById(`v-row-${rowId}`);
    if(!row) return;
    const nameStr = document.getElementById('p-name').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').substring(0, 3).toUpperCase() || 'SPX';
    const colorName = row.querySelector('.v-color').options[row.querySelector('.v-color').selectedIndex]?.text || '';
    const sizeName = row.querySelector('.v-size').options[row.querySelector('.v-size').selectedIndex]?.text || '';
    
    let skuParts = [nameStr];
    if (colorName && colorName !== "Không áp dụng" && colorName !== "-- Chọn Màu --") skuParts.push(colorName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').substring(0, 3).toUpperCase());
    if (sizeName && sizeName !== "Không áp dụng" && sizeName !== "-- Chọn Size --") skuParts.push(sizeName.replace(/\s+/g, '').toUpperCase());
    
    row.querySelector('.v-sku').value = skuParts.join('-');
}
function updateAllSKUs() { document.querySelectorAll('#variant-tbody tr').forEach(row => updateRowSKU(row.id.split('v-row-')[1])); }

// ==========================================
// 5. THÊM / SỬA SẢN PHẨM (MỞ MODAL & LƯU)
// ==========================================
function openProductModal() {
    editingProductId = null; // Chế độ thêm mới
    document.getElementById('modal-title').innerText = "Thêm Sản Phẩm Mới";
    document.getElementById('product-form').reset();
    document.getElementById('variant-tbody').innerHTML = '';
    removeThumbnail();
    
    document.getElementById('product-modal').style.display = 'flex';
    addVariantRow(); // Tự động thêm 1 dòng trống
}

// Thay thế nội dung bên trong hàm editProduct(id) bằng đoạn này:

async function editProduct(id) {
    try {
        editingProductId = id; 
        document.getElementById('modal-title').innerText = "Cập nhật Sản phẩm";
        document.getElementById('product-form').reset();
        document.getElementById('variant-tbody').innerHTML = '';
        removeThumbnail();

        const product = await apiFetch(`/products/${id}`);
        
        document.getElementById('p-name').value = product.name;
        document.getElementById('p-category').value = product.categoryId;
        document.getElementById('p-price').value = product.price;
        document.getElementById('p-desc').value = product.description || '';

        // 1. Hiện ảnh đại diện (Thumbnail) cũ
        if(product.thumbnail) {
            const imgUrl = product.thumbnail.startsWith('http') ? product.thumbnail : BACKEND_URL + product.thumbnail;
            document.getElementById('thumbnail-preview').innerHTML = `<div class="img-preview-box"><img src="${imgUrl}"><div class="btn-remove-img" onclick="removeThumbnail()"><i class="ph ph-x"></i></div></div>`;
        }

        // 2. Hiện danh sách ảnh đính kèm (Gallery) cũ
        const galleryContainer = document.getElementById('gallery-preview');
        galleryContainer.innerHTML = '';
        galleryFiles = []; // Reset file mới chờ tải lên

        if (product.imageUrls && product.imageUrls.length > 0) {
            product.imageUrls.forEach((img) => {
                const imgFullUrl = img.startsWith('http') ? img : BACKEND_URL + img;
                galleryContainer.insertAdjacentHTML('beforeend', `
                    <div class="img-preview-box">
                        <img src="${imgFullUrl}">
                        </div>
                `);
            });
        }

        // 3. Đổ danh sách biến thể
        if(product.variants && product.variants.length > 0) {
            product.variants.forEach(v => addVariantRow(v));
        } else {
            addVariantRow();
        }

        document.getElementById('product-modal').style.display = 'flex';
    } catch(e) {
        showToast("Lỗi tải thông tin sản phẩm", "error");
    }
}

function closeProductModal() { document.getElementById('product-modal').style.display = 'none'; }

async function saveProduct(event) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("Name", document.getElementById('p-name').value);
    formData.append("CategoryId", document.getElementById('p-category').value);
    formData.append("Price", document.getElementById('p-price').value);
    formData.append("Description", document.getElementById('p-desc').value);
    
    if (thumbnailFile) formData.append("ThumbnailFile", thumbnailFile);
    // (Bỏ qua Gallery trong bài này cho gọn nhẹ)

    const variants = Array.from(document.querySelectorAll('#variant-tbody tr')).map(row => ({
        ColorId: parseInt(row.querySelector('.v-color').value) || 0,
        SizeId: parseInt(row.querySelector('.v-size').value) || 0,
        Sku: row.querySelector('.v-sku').value,
        Quantity: parseInt(row.querySelector('.v-qty').value),
        PriceModifier: parseFloat(row.querySelector('.v-price').value || 0)
    }));
    formData.append("VariantsJson", JSON.stringify(variants));

    try {
        showToast("Đang lưu dữ liệu...", "info");
        
        if (editingProductId) {
            // Cập nhật sản phẩm cũ (PUT)
            await apiFetch(`/products/${editingProductId}`, { method: 'PUT', body: formData });
            showToast("Đã cập nhật sản phẩm!", "success");
        } else {
            // Tạo mới (POST)
            await apiFetch('/products', { method: 'POST', body: formData });
            showToast("Đã tạo sản phẩm mới!", "success");
        }
        
        closeProductModal();
        loadProducts(); 
    } catch (error) { console.error(error); showToast("Có lỗi xảy ra", "error"); }
}

// Logic Modal Master Data (Giữ nguyên)
function openMasterModal(t) { document.getElementById(`${t.toLowerCase()}-form`).reset(); document.getElementById(`${t.toLowerCase()}-modal`).style.display = 'flex'; }
function closeMasterModal(t) { document.getElementById(`${t.toLowerCase()}-modal`).style.display = 'none'; }
async function submitMasterData(e, t) {
    e.preventDefault();
    let d = t==='Color' ? {Name:document.getElementById('new-color-name').value, HexCode:document.getElementById('new-color-hex').value} : {Name:document.getElementById('new-size-name').value};
    try {
        await apiFetch(t==='Color'?'/products/colors':'/products/sizes', { method: 'POST', body: JSON.stringify(d) });
        showToast(`Thêm thành công!`, "success"); closeMasterModal(t); loadMasterData();
    } catch(err) { showToast("Lỗi", "error"); }
}