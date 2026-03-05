let currentProduct = null;
let selectedColorId = null;
let selectedSizeId = null;
let currentVariant = null;

// Thêm biến BACKEND_URL (vì em đang dùng trong code nhưng chưa khai báo ở đầu file này)
const BACKEND_URL = 'http://localhost:5195';

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
let masterColorsList = []; // Thêm biến này ở đầu file cùng với currentProduct

async function loadProductDetail(id) {
    try {
        // Tải danh sách màu để lấy mã Hex
        masterColorsList = await apiFetch('/products/master-data/colors').catch(() => []);
        currentProduct = await apiFetch(`/products/${id}`);
        
        if (!currentProduct) throw new Error("Sản phẩm không tồn tại");

        document.getElementById('pd-name').innerText = currentProduct.name;
        document.getElementById('bc-name').innerText = currentProduct.name;
        document.getElementById('bc-category').innerText = currentProduct.categoryName || 'Sản phẩm';
        document.getElementById('pd-desc').innerHTML = currentProduct.description 
            ? currentProduct.description.replace(/\n/g, '<br>') 
            : "Sản phẩm thiết kế độc quyền.";
        document.getElementById('pd-sold-count').innerText = currentProduct.soldCount || 0;
        
        updatePriceDisplay(currentProduct.price);
        renderGallery(currentProduct);
        renderVariants(currentProduct.variants);
        
        loadReviews(currentProduct.id);
        loadRelatedProducts(currentProduct.categoryId, currentProduct.id);

        // HIỂN THỊ FORM ĐÁNH GIÁ NẾU ĐÃ ĐĂNG NHẬP
        if (authManager.isLoggedIn()) {
            document.getElementById('write-review-box').style.display = 'block';
            initStarRating(); // Khởi tạo logic click ngôi sao
        }

    } catch (error) {
        showToast("Không tìm thấy sản phẩm.", "error");
        setTimeout(() => window.location.href = 'shop.html', 2000);
    }
}

function updatePriceDisplay(priceValue) {
    const priceEl = document.getElementById('pd-price');
    if (priceEl) {
        priceEl.innerText = new Intl.NumberFormat('vi-VN').format(priceValue) + '₫';
    }
}

// ==========================================
// 2. RENDER HÌNH ẢNH (GALLERY)
// ==========================================
function renderGallery(product) {
    const mainImg = document.getElementById('main-image');
    const thumbList = document.getElementById('thumbnail-list');
    if (!mainImg || !thumbList) return;

    let defaultImg = 'image/placeholder.jpg';
    if (product.thumbnail) {
        defaultImg = product.thumbnail.startsWith('http') ? product.thumbnail : BACKEND_URL + product.thumbnail;
    }
    mainImg.src = defaultImg;
    
    let allImages = [defaultImg];
    if (product.imageUrls && product.imageUrls.length > 0) {
        product.imageUrls.forEach(img => {
            allImages.push(img.startsWith('http') ? img : BACKEND_URL + img);
        });
    }

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
    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = src;
    
    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
}

// ==========================================
// 3. RENDER VÀ XỬ LÝ LỌC BIẾN THỂ
// ==========================================
function renderVariants(variants) {
    const stockStatus = document.getElementById('stock-status');
    const sectionColor = document.getElementById('section-color');
    const sectionSize = document.getElementById('section-size');

    if (!variants || variants.length === 0) {
        if(stockStatus) stockStatus.innerHTML = '<span style="color:var(--color-accent-dark)">Sản phẩm hiện đang hết hàng.</span>';
        return;
    }

    // Lọc ra các Màu và Size (Khử trùng lặp)
    let colorsMap = new Map();
    let sizesMap = new Map();

    variants.forEach(v => {
        if (v.colorId && v.colorId > 0 && v.colorName !== "Không áp dụng") {
            // Tìm mã Hex tương ứng
            let hexObj = masterColorsList.find(c => c.id === v.colorId);
            let hex = hexObj ? hexObj.hexCode : '#EEEEEE';
            colorsMap.set(v.colorId, { id: v.colorId, name: v.colorName, hex: hex });
        }
        if (v.sizeId && v.sizeId > 0 && v.sizeName !== "Không áp dụng") {
            sizesMap.set(v.sizeId, { id: v.sizeId, name: v.sizeName });
        }
    });

    // VẼ NÚT MÀU
    if (colorsMap.size > 0 && sectionColor) {
        sectionColor.style.display = 'block';
        const colorGrid = document.getElementById('color-grid');
        colorGrid.innerHTML = '';
        colorsMap.forEach(color => {
            colorGrid.insertAdjacentHTML('beforeend', `
                <div class="v-color-btn" id="color-btn-${color.id}" onclick="selectColor(${color.id}, '${color.name}')">
                    <span class="color-circle" style="background-color: ${color.hex}; border: 1px solid #CCC;"></span>
                    <span>${color.name}</span>
                </div>
            `);
        });
    }

    // VẼ NÚT SIZE
    if (sizesMap.size > 0 && sectionSize) {
        sectionSize.style.display = 'block';
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

    // Tự động chọn nếu chỉ có 1 option
    if (colorsMap.size === 1) {
        const firstColor = colorsMap.values().next().value;
        selectColor(firstColor.id, firstColor.name);
    }
    if (sizesMap.size === 1) {
        const firstSize = sizesMap.values().next().value;
        selectSize(firstSize.id, firstSize.name);
    }

    checkVariantStatus();
}

function selectColor(colorId, colorName) {
    const btn = document.getElementById(`color-btn-${colorId}`);
    if (!btn || btn.classList.contains('disabled')) return;

    if (selectedColorId === colorId) {
        selectedColorId = null; 
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

function selectSize(sizeId, sizeName) {
    const btn = document.getElementById(`size-btn-${sizeId}`);
    if (!btn || btn.classList.contains('disabled')) return;

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

function checkVariantStatus() {
    if (!currentProduct || !currentProduct.variants) return;

    const hasColor = document.getElementById('section-color').style.display === 'block';
    const hasSize = document.getElementById('section-size').style.display === 'block';

    const btnCart = document.getElementById('btn-add-cart');
    const stockStatus = document.getElementById('stock-status');

    // 👉 LOGIC LÀM MỜ NÚT (Nếu chọn Màu A, các Size của màu A hết hàng thì làm mờ nút Size đó)
    if (hasSize) {
        document.querySelectorAll('.v-size-btn').forEach(btn => {
            const sId = parseInt(btn.id.replace('size-btn-', ''));
            // Tìm tất cả biến thể có size này (Và thuộc màu đang chọn nếu có)
            const availableVariants = currentProduct.variants.filter(v => 
                v.sizeId === sId && 
                (!hasColor || !selectedColorId || v.colorId === selectedColorId)
            );
            
            // Tính tổng tồn kho của các biến thể này
            const totalQty = availableVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            
            if (totalQty === 0) {
                btn.classList.add('disabled');
                // Nếu đang chọn nút bị mờ, thì nhả chọn ra
                if(selectedSizeId === sId) selectSize(sId, '');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    // 👉 Tương tự làm mờ nút Màu nếu Size đang chọn hết màu đó
    if (hasColor) {
         document.querySelectorAll('.v-color-btn').forEach(btn => {
            const cId = parseInt(btn.id.replace('color-btn-', ''));
            const availableVariants = currentProduct.variants.filter(v => 
                v.colorId === cId && 
                (!hasSize || !selectedSizeId || v.sizeId === selectedSizeId)
            );
            
            const totalQty = availableVariants.reduce((sum, v) => sum + (v.quantity || 0), 0);
            
            if (totalQty === 0) {
                btn.classList.add('disabled');
                if(selectedColorId === cId) selectColor(cId, '');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    // KIỂM TRA ĐÃ CHỌN ĐỦ ĐIỀU KIỆN CHƯA
    const isReady = (!hasColor || selectedColorId) && (!hasSize || selectedSizeId);

    if (isReady) {
        currentVariant = currentProduct.variants.find(v => 
            (!hasColor || v.colorId === selectedColorId) && 
            (!hasSize || v.sizeId === selectedSizeId)
        );

        if (currentVariant) {
            updatePriceDisplay(currentProduct.price + (currentVariant.priceModifier || 0));

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
        updatePriceDisplay(currentProduct.price); 
        stockStatus.innerHTML = "Vui lòng chọn phân loại hàng để xem tồn kho";
        btnCart.disabled = true;
    }
}

// ==========================================
// 4. THÊM GIỎ HÀNG
// ==========================================
function changeQuantity(amount) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value) + amount;
    
    if (val < 1) val = 1;
    if (currentVariant && val > currentVariant.quantity) {
        showToast(`Chỉ còn ${currentVariant.quantity} sản phẩm trong kho!`, "warning");
        val = currentVariant.quantity;
    }
    input.value = val;
}

// ==========================================
// 4. THÊM GIỎ HÀNG (CẬP NHẬT GỌI API CHUẨN)
// ==========================================
async function addToCart() {
    if (!currentVariant) return;
    
    // Nếu khách chưa đăng nhập, bắt buộc chuyển sang trang Login
    if (!authManager.isLoggedIn()) {
        showToast("Vui lòng đăng nhập để thêm vào giỏ hàng!", "warning");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    const qty = parseInt(document.getElementById('qty-input').value);
    
    try {
        const btnCart = document.getElementById('btn-add-cart');
        btnCart.disabled = true;
        btnCart.innerHTML = "ĐANG THÊM...";

        // GỌI API THÊM VÀO GIỎ HÀNG (Dựa theo backend em đã viết trong cart.js)
        await apiFetch('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ 
                productId: currentProduct.id, 
                productVariantId: currentVariant.id, 
                quantity: qty 
            })
        });

        showToast(`Đã thêm ${qty} sản phẩm vào giỏ!`, "success");
        document.getElementById('qty-input').value = 1;
        
        updateGlobalCartBadge();

    } catch (error) {
        // Lỗi (như vượt tồn kho) sẽ do apiFetch bắt và hiện Toast đỏ
    } finally {
        const btnCart = document.getElementById('btn-add-cart');
        btnCart.disabled = false;
        btnCart.innerHTML = '<i class="ph ph-shopping-cart"></i> THÊM VÀO GIỎ HÀNG';
    }
}

// ==========================================
// 5. SẢN PHẨM LIÊN QUAN
// ==========================================
async function loadRelatedProducts(categoryId, currentProductId) {
    try {
        const response = await apiFetch('/products');
        const allProds = Array.isArray(response) ? response : (response.items || []);
        
        // Cố gắng lấy SP cùng danh mục
        let related = allProds.filter(p => p.categoryId === categoryId && p.id != currentProductId && p.isActive);
        
        // NẾU THIẾU (DƯỚI 4 CÁI), LẤY BÙ CÁC SẢN PHẨM KHÁC ĐỂ TRANG LUÔN ĐẸP
        if (related.length < 4) {
            let others = allProds.filter(p => p.categoryId !== categoryId && p.id != currentProductId && p.isActive);
            related = related.concat(others); 
        }
        
        related = related.slice(0, 4);

        const grid = document.getElementById('related-product-grid');
        if(!grid) return;
        grid.innerHTML = '';

        related.forEach(p => {
            let imgUrl = p.thumbnail ? (p.thumbnail.startsWith('http') ? p.thumbnail : BACKEND_URL + p.thumbnail) : 'image/placeholder.jpg';
            const card = `
                <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor:pointer;">
                    <div class="product-image"><img src="${imgUrl}" onerror="this.src='image/placeholder.jpg'"></div>
                    <div class="product-info">
                        <div class="product-brand">${p.categoryName || 'WebNhom5'}</div>
                        <h4 class="product-name">${p.name}</h4>
                        <div style="color: #FFC107; font-size: 0.95rem; margin: 4px 0; display:flex; justify-content:center; gap:2px;">
                            <i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i>
                            <span style="color:#888; font-size:0.8rem; margin-left:4px;">(5.0)</span>
                        </div>
                        <div class="product-price">${new Intl.NumberFormat('vi-VN').format(p.price)} ₫</div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', card);
        });
    } catch (error) { }
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
            if(listContainer) listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 30px 0;">Sản phẩm này chưa có đánh giá nào. Hãy là người đầu tiên sở hữu và đánh giá nhé!</p>';
            if(summaryStars) summaryStars.innerHTML = '<span style="color:var(--text-muted); font-size: 0.9rem;">Chưa có đánh giá</span>';
            return;
        }

        let totalScore = 0;
        reviews.forEach(r => totalScore += r.rating);
        let avgScore = (totalScore / reviews.length).toFixed(1);

        const avgText = document.getElementById('avg-rating-text');
        const totalText = document.getElementById('total-reviews-text');
        if(avgText) avgText.innerText = avgScore;
        if(totalText) totalText.innerText = `${reviews.length} đánh giá`;

        const drawStars = (score) => {
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                if(i <= Math.round(score)) starsHtml += '<i class="ph-fill ph-star"></i>';
                else starsHtml += '<i class="ph ph-star" style="color:#CCC;"></i>';
            }
            return starsHtml;
        };

        if(summaryStars) summaryStars.innerHTML = drawStars(avgScore) + `<span style="color:var(--text-main); font-size:1rem; margin-left:5px;">(${avgScore})</span>`;
        if(avgStarsDisplay) avgStarsDisplay.innerHTML = drawStars(avgScore);

        if(listContainer) {
            listContainer.innerHTML = '';
            reviews.forEach(r => {
                let dateStr = new Date(r.createdAt).toLocaleDateString('vi-VN');
                let initial = r.userName ? r.userName.charAt(0).toUpperCase() : 'U';
                
                let html = `
                    <div class="review-item">
                        <div class="review-avatar">${initial}</div>
                        <div class="review-content">
                            <div class="review-user">${r.userName || 'Khách hàng ẩn danh'}</div>
                            <div class="review-stars">${drawStars(r.rating)}</div>
                            <div class="review-date">${dateStr}</div>
                            <div class="review-text">${r.comment || 'Khách hàng không để lại bình luận.'}</div>
                        </div>
                    </div>
                `;
                listContainer.insertAdjacentHTML('beforeend', html);
            });
        }
    } catch (error) { }
}
let selectedRating = 5;

function initStarRating() {
    const stars = document.querySelectorAll('#star-rating-input i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-val'));
            // Tô màu vàng cho các sao từ 1 đến sao được chọn
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= selectedRating) {
                    s.style.color = '#FFA726';
                    s.style.transform = 'scale(1.1)';
                } else {
                    s.style.color = '#E0E0E0';
                    s.style.transform = 'scale(1)';
                }
            });
        });
    });
    // Kích hoạt 5 sao mặc định
    document.querySelector('#star-rating-input i[data-val="5"]').click();
}

async function submitReview() {
    const comment = document.getElementById('review-comment').value.trim();
    if (!comment) {
        showToast("Vui lòng chia sẻ vài lời về sản phẩm nhé!", "warning");
        return;
    }
    
    // Gói dữ liệu gửi lên (Dựa theo CreateReviewDto của em)
    const dto = {
        ProductId: currentProduct.id,
        Rating: selectedRating,
        Comment: comment,
        OrderId: 0 // Trong tương lai, Backend cần validate khách đã mua hàng hay chưa thông qua OrderId
    };

    try {
        // GỌI API (Đảm bảo backend có [HttpPost("reviews")] hoặc tương tự)
        await apiFetch(`/products/reviews`, { method: 'POST', body: JSON.stringify(dto) });
        showToast("Cảm ơn bạn đã gửi đánh giá!", "success");
        document.getElementById('review-comment').value = '';
        loadReviews(currentProduct.id); // Tải lại danh sách comment
    } catch (error) {
        // Lỗi do api.js tự show Toast
    }
}