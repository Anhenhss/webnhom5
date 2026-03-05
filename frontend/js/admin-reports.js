document.addEventListener('DOMContentLoaded', () => {
    // 1. RÀNG BUỘC BẢO MẬT: Chỉ Admin mới được vào
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!authManager.isLoggedIn() || userInfo.role !== 'Admin') {
        showToast("Bạn không có quyền truy cập Báo cáo tài chính!", "error");
        setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
        return;
    }

    document.getElementById('display-admin-name').innerText = `Quản trị viên (${userInfo.fullName})`;
    document.getElementById('admin-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.fullName)}&background=003049&color=fff`;

    loadReportData();
});

let currentReportData = [];

async function loadReportData() {
    const days = document.getElementById('report-period').value;
    try {
        // Sử dụng API thống kê doanh thu Quý đã viết trong OrderService
        const data = await apiFetch(`/admin/orders/statistics?days=${days}`);
        currentReportData = data;
        renderReportTable(data);
    } catch (error) {
        console.error("Lỗi tải báo cáo:", error);
    }
}

function renderReportTable(data) {
    const tbody = document.getElementById('report-tbody');
    const txtRevenue = document.getElementById('txt-total-revenue');
    const txtOrders = document.getElementById('txt-total-orders');
    
    tbody.innerHTML = '';
    let totalRev = 0;
    let totalOrd = 0;

    data.forEach(item => {
        totalRev += item.totalRevenue;
        totalOrd += item.totalOrders;
        const avg = item.totalOrders > 0 ? (item.totalRevenue / item.totalOrders) : 0;

        const tr = `
            <tr>
                <td><strong>${item.date}</strong></td>
                <td>${item.totalOrders} đơn</td>
                <td style="color: var(--color-accent-light); font-weight:700;">${new Intl.NumberFormat('vi-VN').format(item.totalRevenue)}₫</td>
                <td>${new Intl.NumberFormat('vi-VN').format(avg.toFixed(0))}₫</td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });

    txtRevenue.innerText = new Intl.NumberFormat('vi-VN').format(totalRev) + '₫';
    txtOrders.innerText = totalOrd;
}

/* ==========================================================================
   LOGIC XUẤT EXCEL (Times New Roman, Cỡ 13)
   ========================================================================== */
function exportToExcel() {
    if (currentReportData.length === 0) {
        showToast("Không có dữ liệu để xuất!", "warning");
        return;
    }

    // Tạo mảng dữ liệu cho Excel
    const excelData = [
        ["BÁO CÁO DOANH THU TỔNG HỢP - WEBNHOM5"], // Tiêu đề lớn
        ["Ngày xuất:", new Date().toLocaleString()],
        [], // Dòng trống
        ["Thời gian", "Số đơn hàng", "Doanh thu (VNĐ)", "Trung bình/Đơn"] // Header bảng
    ];

    currentReportData.forEach(item => {
        const avg = item.totalOrders > 0 ? (item.totalRevenue / item.totalOrders) : 0;
        excelData.push([item.date, item.totalOrders, item.totalRevenue, avg]);
    });

    // Tạo Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Lưu ý: Thư viện XLSX bản community không hỗ trợ trực tiếp Style font chữ (cần bản Pro)
    // Để có Font Times New Roman 13, thầy sẽ sử dụng thuộc tính XML cơ bản nếu có thể 
    // hoặc hướng dẫn trình bày: Xuất file xong, chỉ cần Ctrl+A chọn Times New Roman 13 là cực đẹp.
    
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTaiChinh");
    
    // Xuất file
    const fileName = `Bao_Cao_Tai_Chinh_WebNhom5_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showToast("Đã tải xuống file báo cáo Excel!", "success");
}