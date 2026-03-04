let currentColors = [];
let currentSizes = [];

// 1. Quản lý Tag Biến thể
function addTag(event, type) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const val = event.target.value.trim();
        if (!val) return;

        if (type === 'color' && !currentColors.includes(val)) currentColors.push(val);
        if (type === 'size' && !currentSizes.includes(val)) currentSizes.push(val);

        event.target.value = '';
        renderTags();
    }
}

function renderTags() {
    const colorBox = document.getElementById('color-tags');
    const sizeBox = document.getElementById('size-tags');
    const inputC = colorBox.querySelector('input');
    const inputS = sizeBox.querySelector('input');

    colorBox.innerHTML = currentColors.map((c, i) => `
        <span class="tag-badge">${c} <i class="ph ph-x" onclick="removeTag(${i}, 'color')"></i></span>
    `).join('') + inputC.outerHTML;

    sizeBox.innerHTML = currentSizes.map((s, i) => `
        <span class="tag-badge">${s} <i class="ph ph-x" onclick="removeTag(${i}, 'size')"></i></span>
    `).join('') + inputS.outerHTML;
    
    // Re-focus input sau khi render
    colorBox.querySelector('input').focus();
}

function removeTag(index, type) {
    if (type === 'color') currentColors.splice(index, 1);
    else currentSizes.splice(index, 1);
    renderTags();
}

// 2. Sinh SKU tự động
function generateSKUs() {
    const tbody = document.getElementById('sku-body');
    if (currentColors.length === 0 || currentSizes.length === 0) {
        alert("Cần ít nhất 1 màu và 1 size để tạo SKU!");
        return;
    }

    let rows = "";
    currentColors.forEach(c => {
        currentSizes.forEach(s => {
            rows += `
                <tr class="sku-item" data-color="${c}" data-size="${s}">
                    <td><strong>${c} / ${s}</strong></td>
                    <td><input type="number" class="s-price" value="0"></td>
                    <td><input type="number" class="s-stock" value="0"></td>
                    <td><button type="button" onclick="this.closest('tr').remove()"><i class="ph ph-trash"></i></button></td>
                </tr>
            `;
        });
    });
    tbody.innerHTML = rows;
}

// 3. Preview Ảnh
function handlePreview(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.getElementById('img-preview');
            img.src = e.target.result;
            img.style.display = 'block';
            document.getElementById('upload-hint').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 4. Mở/Đóng Modal
function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('img-preview').style.display = 'none';
    document.getElementById('upload-hint').style.display = 'block';
    document.getElementById('sku-body').innerHTML = "";
    currentColors = []; currentSizes = [];
    renderTags();
    document.getElementById('product-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// 5. Submit dồn toàn bộ dữ liệu
document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    
    // Thu thập SKU
    const skuRows = document.querySelectorAll('.sku-item');
    const variants = Array.from(skuRows).map(row => ({
        color: row.dataset.color,
        size: row.dataset.size,
        price: row.querySelector('.s-price').value,
        stock: row.querySelector('.s-stock').value
    }));

    const payload = {
        name: document.getElementById('prod-name').value,
        categoryId: document.getElementById('prod-cat').value,
        variants: variants
    };

    console.log("Gửi lên Backend của Duy:", payload);
    // Fetch API POST/PUT ở đây
};