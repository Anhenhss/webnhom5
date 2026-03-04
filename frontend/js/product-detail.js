let currentProduct = null;
let selectedColorId = null;
let selectedSizeId = null;
let currentVariant = null;

document.addEventListener('DOMContentLoaded', () => {
    // Lấy ID sản phẩm từ trên URL (Ví dụ: product-detail.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'shop.html';
        return;
    }
    loadProductDetail(productId);
});

// ==========================================
// 1. TẢI DỮ LIỆU SẢN PHẨM & RENDER
// ==========================================
async function loadProductDetail(id) {
    try {
        currentProduct = await apiFetch(`/products/${id}`);
        
        // Render Text cơ bản
        document.getElementById('pd-name').innerText = currentProduct.name;
        document.getElementById('bc-name').innerText = currentProduct.name;
        document.getElementById('bc-category').innerText = currentProduct.categoryName || 'Sản phẩm';
        document.getElementById('pd-desc').innerHTML = currentProduct.description ? currentProduct.description.replace(/\n/g, '<br>') : "Sản phẩm thiết kế độc quyền của WebNhom5.";
        document.getElementById('pd-sold-count').innerText = currentProduct.soldCount || 0;
        // Render Giá (Lấy giá gốc mặc định)
        updatePriceDisplay(currentProduct.price);

        // Render Hình ảnh (Thumbnail + Gallery)
        renderGallery(currentProduct);

        // Render Biến thể (Màu và Size)
        renderVariants(currentProduct.variants);
        loadReviews(currentProduct.id);
        loadRelatedProducts(currentProduct.categoryId, currentProduct.id);

    } catch (error) {
        showToast("Không tìm thấy sản phẩm. Đang quay lại cửa hàng...", "error");
        setTimeout(() => window.location.href = 'shop.html', 2000);
    }
}

function updatePriceDisplay(priceValue) {
    document.getElementById('pd-price').innerText = new Intl.NumberFormat('vi-VN').format(priceValue) + '₫';
}

// ==========================================
// 2. RENDER HÌNH ẢNH (GALLERY)
// ==========================================
function renderGallery(product) {
    const mainImg = document.getElementById('main-image');
    const thumbList = document.getElementById('thumbnail-list');
    
    // Xử lý link ảnh gốc (Thumbnail)
    let defaultImg = 'image/placeholder.jpg';
    if (product.thumbnail) {
        defaultImg = product.thumbnail.startsWith('http') ? product.thumbnail : BACKEND_URL + product.thumbnail;
    }
    mainImg.src = defaultImg;
    
    // Gộp Thumbnail và ImageUrls lại thành 1 mảng để duyệt
    let allImages = [defaultImg];
    if (product.imageUrls && product.imageUrls.length > 0) {
        product.imageUrls.forEach(img => {
            allImages.push(img.startsWith('http') ? img : BACKEND_URL + img);
        });
    }

    // Vẽ danh sách ảnh nhỏ
    thumbList.innerHTML = '';
    allImages.forEach((imgSrc, index) => {
        const thumbHtml = `
            <div class="thumb-item ${index === 0 ? 'active' : ''}" onclick="changeMainImage('${imgSrc}', this)">
                <img src="${imgSrc}" onerror="this.parentElement.style.display='none'">
            </div>
        `;
        thumbList.insertAdjacentHTML('beforeend', thumbHtml);
    });
}

function changeMainImage(src, element) {
    document.getElementById('main-image').src = src;
    // Đổi viền active
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

// ==========================================
// 3. RENDER VÀ XỬ LÝ LỌC BIẾN THỂ
// ==========================================
function renderVariants(variants) {
    if (!variants || variants.length === 0) {
        document.getElementById('stock-status').innerHTML = '<span style="color:var(--color-accent-dark)">Sản phẩm hiện đang hết hàng.</span>';
        return;
    }

    // Lọc ra các Màu và Size ĐỘC NHẤT (Không trùng lặp) từ danh sách biến thể
    let colorsMap = new Map();
    let sizesMap = new Map();

    // Giả định backend trả về ColorName, SizeName. (Cần lấy thêm HexCode nếu em muốn, ở đây tạm dùng tên)
    // Nếu backend truyền Color.HexCode trong VariantResponseDto thì càng tốt!
    variants.forEach(v => {
        if (v.colorId > 0 && v.colorName !== "Không áp dụng") {
            colorsMap.set(v.colorId, { id: v.colorId, name: v.colorName });
        }
        if (v.sizeId > 0 && v.sizeName !== "Không áp dụng") {
            sizesMap.set(v.sizeId, { id: v.sizeId, name: v.sizeName });
        }
    });

    // VẼ MÀU SẮC
    if (colorsMap.size > 0) {
        document.getElementById('section-color').style.display = 'block';
        const colorGrid = document.getElementById('color-grid');
        colorGrid.innerHTML = '';
        colorsMap.forEach(color => {
            colorGrid.insertAdjacentHTML('beforeend', `
                <div class="v-color-btn" id="color-btn-${color.id}" onclick="selectColor(${color.id}, '${color.name}')">
                    <span class="color-circle" style="background-color: #EEE;"></span>
                    <span>${color.name}</span>
                </div>
            `);
        });
    }

    // VẼ KÍCH THƯỚC
    if (sizesMap.size > 0) {
        document.getElementById('section-size').style.display = 'block';
        const sizeGrid = document.getElementById('size-grid');
        sizeGrid.innerHTML = '';
        sizesMap.forEach(size => {
            sizeGrid.insertAdjacentHTML('beforeend', `
                <div class="v-size-btn" id="size-btn-${size.id}" onclick="selectSize(${size.id}, '${size.name}')">
                    ${size.name}
                </div>
            `);
        });
    }

    // Nếu sản phẩm CHỈ có 1 màu hoặc 1 size, tự động click chọn giùm khách
    if (colorsMap.size === 1) {
        const firstColor = colorsMap.values().next().value;
        selectColor(firstColor.id, firstColor.name);
    }
    if (sizesMap.size === 1) {
        const firstSize = sizesMap.values().next().value;
        selectSize(firstSize.id, firstSize.name);
    }

    checkVariantStatus(); // Kiểm tra trạng thái lần đầu
}

// XỬ LÝ CLICK MÀU
function selectColor(colorId, colorName) {
    const btn = document.getElementById(`color-btn-${colorId}`);
    if (btn.classList.contains('disabled')) return;

    if (selectedColorId === colorId) {
        selectedColorId = null; // Bỏ chọn
        document.getElementById('selected-color-name').innerText = "Chưa chọn";
        btn.classList.remove('active');
    } else {
        selectedColorId = colorId;
        document.getElementById('selected-color-name').innerText = colorName;
        document.querySelectorAll('.v-color-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
    }
    checkVariantStatus();
}

// XỬ LÝ CLICK SIZE
function selectSize(sizeId, sizeName) {
    const btn = document.getElementById(`size-btn-${sizeId}`);
    if (btn.classList.contains('disabled')) return;

    if (selectedSizeId === sizeId) {
        selectedSizeId = null;
        document.getElementById('selected-size-name').innerText = "Chưa chọn";
        btn.classList.remove('active');
    } else {
        selectedSizeId = sizeId;
        document.getElementById('selected-size-name').innerText = sizeName;
        document.querySelectorAll('.v-size-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
    }
    checkVariantStatus();
}

// TÌM BIẾN THỂ TƯƠNG ỨNG VÀ CẬP NHẬT GIAO DIỆN
function checkVariantStatus() {
    // 1. Kiểm tra xem sản phẩm có cần chọn cả Màu và Size không
    const hasColor = document.getElementById('section-color').style.display === 'block';
    const hasSize = document.getElementById('section-size').style.display === 'block';

    const btnCart = document.getElementById('btn-add-cart');
    const stockStatus = document.getElementById('stock-status');

    // Nếu khách đã chọn đủ các thuộc tính yêu cầu
    const isReady = (!hasColor || selectedColorId) && (!hasSize || selectedSizeId);

    if (isReady) {
        // Tìm biến thể cụ thể trong mảng dựa vào ID khách chọn
        // Nếu không có size thì gán SizeId = 0 (Hoặc null tuỳ backend em lưu)
        currentVariant = currentProduct.variants.find(v => 
            (hasColor ? v.colorId === selectedColorId : true) && 
            (hasSize ? v.sizeId === selectedSizeId : true)
        );

        if (currentVariant) {
            // Cập nhật Giá (Nếu biến thể có tính thêm tiền)
            updatePriceDisplay(currentProduct.price + currentVariant.priceModifier);

            // Cập nhật tồn kho
            if (currentVariant.quantity > 0) {
                stockStatus.innerHTML = `Mã: <strong>${currentVariant.sku}</strong> | Tồn kho: <strong style="color:var(--color-primary);">${currentVariant.quantity}</strong> sản phẩm`;
                btnCart.disabled = false;
                btnCart.innerHTML = '<i class="ph ph-shopping-cart"></i> THÊM VÀO GIỎ HÀNG';
            } else {
                stockStatus.innerHTML = `Mã: ${currentVariant.sku} | <span style="color:var(--color-accent-dark);">Hết hàng</span>`;
                btnCart.disabled = true;
                btnCart.innerHTML = 'HẾT HÀNG';
            }
        } else {
            stockStatus.innerHTML = `<span style="color:var(--text-muted);">Phân loại này không tồn tại.</span>`;
            btnCart.disabled = true;
        }
    } else {
        currentVariant = null;
        updatePriceDisplay(currentProduct.price); // Trả về giá gốc
        stockStatus.innerHTML = "Vui lòng chọn phân loại hàng để xem tồn kho";
        btnCart.disabled = true;
    }

    // TÍNH NĂNG NÂNG CAO: LÀM MỜ CÁC SIZE ĐÃ HẾT HÀNG THEO MÀU ĐANG CHỌN (Tuỳ chọn)
    // Cần viết thêm logic quét mảng variants để set class 'disabled' cho nút size
}

// ==========================================
// 4. THAO TÁC SỐ LƯỢNG & THÊM GIỎ HÀNG
// ==========================================
function changeQuantity(amount) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value) + amount;
    
    // Không cho chọn số âm
    if (val < 1) val = 1;

    // Không cho chọn lố Tồn kho
    if (currentVariant && val > currentVariant.quantity) {
        showToast(`Chỉ còn ${currentVariant.quantity} sản phẩm trong kho!`, "warning");
        val = currentVariant.quantity;
    }
    input.value = val;
}

// Hàm Add To Cart (Sẽ kết nối với file cart.js sau này)
function addToCart() {
    if (!currentVariant) return;
    
    const qty = parseInt(document.getElementById('qty-input').value);
    
    const cartItem = {
        productId: currentProduct.id,
        variantId: currentVariant.id,
        sku: currentVariant.sku,
        name: currentProduct.name,
        image: document.getElementById('main-image').src,
        colorName: document.getElementById('selected-color-name').innerText,
        sizeName: document.getElementById('selected-size-name').innerText,
        price: currentProduct.price + currentVariant.priceModifier,
        quantity: qty
    };

    // Tạm thời lưu vào LocalStorage để test
    let cart = JSON.parse(localStorage.getItem('webnhom5_cart') || '[]');
    
    // Kiểm tra xem đã có trong giỏ chưa
    const existingIndex = cart.findIndex(item => item.variantId === currentVariant.id);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += qty;
    } else {
        cart.push(cartItem);
    }
    
    localStorage.setItem('webnhom5_cart', JSON.stringify(cart));
    
    showToast(`Đã thêm ${qty} sản phẩm vào giỏ!`, "success");
    
    // Reset số lượng về 1 sau khi thêm
    document.getElementById('qty-input').value = 1;
}
// ==========================================
// 5. SẢN PHẨM LIÊN QUAN
// ==========================================
async function loadRelatedProducts(categoryId, currentProductId) {
    try {
        // Tạm thời gọi API lấy toàn bộ sp để lọc (Nếu backend có API riêng thì càng tốt)
        const response = await apiFetch('/products');
        const allProds = Array.isArray(response) ? response : (response.items || []);
        
        // Lấy các sản phẩm CÙNG DANH MỤC, KHÁC ID HIỆN TẠI, và ĐANG BẬT
        let related = allProds.filter(p => p.categoryId === categoryId && p.id != currentProductId && p.isActive);

        // Lấy tối đa 4 sản phẩm cho đẹp 1 hàng ngang
        related = related.slice(0, 4);

        const grid = document.getElementById('related-product-grid');
        grid.innerHTML = '';

        if (related.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Đang cập nhật thêm bộ sưu tập...</p>';
            return;
        }

        related.forEach(p => {
            let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
            
            const card = `
                <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'">
                    <div class="product-image">
                        <img src="${imgUrl}" alt="${p.name}" onerror="this.src='image/placeholder.jpg'">
                    </div>
                    <div class="product-info">
                        <div class="product-brand">${p.categoryName || 'WebNhom5 Exclusive'}</div>
                        <h4 class="product-name" title="${p.name}">${p.name}</h4>
                        <div class="product-price">${new Intl.NumberFormat('vi-VN').format(p.price)} ₫</div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', card);
        });

    } catch (error) {
        console.error("Lỗi tải SP liên quan:", error);
    }
}
// ==========================================
// 6. XỬ LÝ ĐÁNH GIÁ (REVIEWS)
// ==========================================
async function loadReviews(productId) {
    try {
        const reviews = await apiFetch(`/products/${productId}/reviews`).catch(() => []);
        
        const listContainer = document.getElementById('review-list');
        const summaryStars = document.getElementById('pd-rating-summary');
        const avgStarsDisplay = document.getElementById('avg-stars-display');
        
        if (!reviews || reviews.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px 0;">Sản phẩm này chưa có đánh giá nào. Hãy là người đầu tiên sở hữu và đánh giá nhé!</p>';
            summaryStars.innerHTML = '<span style="color:var(--text-muted); font-size: 0.9rem;">Chưa có đánh giá</span>';
            return;
        }

        // Tính điểm trung bình
        let totalScore = 0;
        reviews.forEach(r => totalScore += r.rating);
        let avgScore = (totalScore / reviews.length).toFixed(1);

        // Cập nhật text tổng quan
        document.getElementById('avg-rating-text').innerText = avgScore;
        document.getElementById('total-reviews-text').innerText = `${reviews.length} đánh giá`;

        // Hàm vẽ ngôi sao vàng/xám
        const drawStars = (score) => {
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                if(i <= Math.round(score)) starsHtml += '<i class="ph-fill ph-star"></i>';
                else starsHtml += '<i class="ph ph-star" style="color:#CCC;"></i>';
            }
            return starsHtml;
        };

        // Cập nhật sao ở 2 chỗ (Trên đầu và dưới summary)
        summaryStars.innerHTML = drawStars(avgScore) + `<span style="color:var(--text-main); font-size:1rem; margin-left:5px;">(${avgScore})</span>`;
        avgStarsDisplay.innerHTML = drawStars(avgScore);

        // Vẽ danh sách Comment
        listContainer.innerHTML = '';
        reviews.forEach(r => {
            let dateStr = new Date(r.createdAt).toLocaleDateString('vi-VN');
            // Lấy chữ cái đầu của tên làm Avatar
            let initial = r.userName ? r.userName.charAt(0).toUpperCase() : 'U';
            
            let html = `
                <div class="review-item">
                    <div class="review-avatar">${initial}</div>
                    <div class="review-content">
                        <div class="review-user">${r.userName || 'Khách hàng ẩn danh'}</div>
                        <div class="review-stars">${drawStars(r.rating)}</div>
                        <div class="review-date">${dateStr} | Phân loại hàng: Mặc định</div>
                        <div class="review-text">${r.comment || 'Khách hàng không để lại bình luận.'}</div>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', html);
        });

    } catch (error) {
        console.error("Lỗi tải đánh giá:", error);
    }
}