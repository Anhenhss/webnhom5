document.addEventListener('DOMContentLoaded', () => {
    // 1. Phân quyền: Cả Admin và Staff đều được vào
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo.role !== 'Admin' && userInfo.role !== 'Staff') {
        window.location.href = 'index.html'; return;
    }

    const roleTitle = userInfo.role === 'Admin' ? "Quản trị viên" : "Nhân viên";
    document.getElementById('display-admin-name').innerText = `${roleTitle} (${userInfo.fullName})`;


    loadPromotions();
});

async function loadPromotions() {
    try {
        const response = await apiFetch('/admin/promotions');
        const promos = Array.isArray(response) ? response : (response.items || []);
        renderPromoTable(promos);
    } catch (error) {
        console.error("Lỗi tải khuyến mãi:", error);
    }
}

function renderPromoTable(promos) {
    const tbody = document.getElementById('promo-tbody');
    tbody.innerHTML = '';

    if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có chương trình nào.</td></tr>';
        return;
    }

    const now = new Date();

    promos.forEach(p => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        
        let statusHtml = '';
        if (now < start) statusHtml = '<span class="status-badge status-upcoming">Sắp diễn ra</span>';
        else if (now > end) statusHtml = '<span class="status-badge status-expired">Đã kết thúc</span>';
        else statusHtml = '<span class="status-badge status-active">Đang chạy</span>';

        const tr = `
            <tr>
                <td style="font-weight:600">${p.name}</td>
                <td>${p.discountType === 'PERCENTAGE' ? 'Giảm phần trăm' : 'Giảm tiền mặt'}</td>
                <td>${p.discountType === 'PERCENTAGE' ? p.discountValue + '%' : new Intl.NumberFormat('vi-VN').format(p.discountValue) + '₫'}</td>
                <td>${start.toLocaleDateString()} - ${end.toLocaleDateString()}</td>
                <td>${statusHtml}</td>
                <td>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.8rem" onclick="openGenModal(${p.id})">
                            <i class="ph ph-ticket"></i> Sinh mã
                        </button>
                        <button class="btn-icon-sm text-danger" onclick="deletePromo(${p.id}, '${p.name}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px;" title="Xóa chương trình">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

/* --- XỬ LÝ MODAL TẠO CHƯƠNG TRÌNH --- */
function openPromoModal() { document.getElementById('promo-modal').style.display = 'flex'; }
function closePromoModal() { document.getElementById('promo-modal').style.display = 'none'; }

async function submitPromo(event) {
    event.preventDefault();
    const dto = {
        Name: document.getElementById('promo-name').value,
        DiscountType: document.getElementById('discount-type').value,
        DiscountValue: parseFloat(document.getElementById('discount-value').value),
        StartDate: document.getElementById('start-date').value,
        EndDate: document.getElementById('end-date').value,
        IsActive: true
    };

    try {
        await apiFetch('/admin/promotions', { method: 'POST', body: JSON.stringify(dto) });
        showToast("Đã tạo chương trình khuyến mãi!", "success");
        closePromoModal();
        loadPromotions();
    } catch (error) {}
}

/* --- XỬ LÝ SINH MÃ COUPON --- */
function openGenModal(id) {
    document.getElementById('gen-promo-id').value = id;
    document.getElementById('coupon-modal').style.display = 'flex';
}
function closeCouponModal() { document.getElementById('coupon-modal').style.display = 'none'; }

async function submitGenerateCoupons(event) {
    event.preventDefault();
    const dto = {
        PromotionId: parseInt(document.getElementById('gen-promo-id').value),
        Quantity: parseInt(document.getElementById('coupon-qty').value),
        Prefix: document.getElementById('coupon-prefix').value.trim().toUpperCase()
    };

    try {
        await apiFetch('/admin/coupons/generate', { method: 'POST', body: JSON.stringify(dto) });
        showToast(`Đã sinh thành công ${dto.Quantity} mã coupon!`, "success");
        closeCouponModal();
    } catch (error) {}
}
/* --- XỬ LÝ XÓA KHUYẾN MÃI --- */
function deletePromo(id, name) {
    showConfirmModal(
        "Xóa Chương Trình?", 
        `Bạn có chắc chắn muốn xóa chương trình <strong>"${name}"</strong> không?<br><br><small style="color:var(--color-accent-dark)">Lưu ý: Không thể xóa nếu chương trình đã phát hành mã Coupon cho khách.</small>`, 
        "Đồng ý Xóa", 
        async () => {
            try {
                await apiFetch(`/admin/promotions/${id}`, { method: 'DELETE' });
                showToast(`Đã xóa chương trình "${name}"`, "success");
                loadPromotions(); // Tải lại bảng
            } catch (error) {
                // Lỗi (ví dụ đã có coupon) sẽ tự văng Toast đỏ nhờ api.js
            }
        }
    );
}