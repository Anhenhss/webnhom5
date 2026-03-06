document.addEventListener('DOMContentLoaded', () => {
    // 1. RÀNG BUỘC BẢO MẬT: Chỉ Admin mới được vào
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!authManager.isLoggedIn() || userInfo.role !== 'Admin') {
        showToast("Bạn không có quyền truy cập Báo cáo tài chính!", "error");
        setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
        return;
    }

    document.getElementById('display-admin-name').innerText = `Quản trị viên (${userInfo.fullName})`;
    
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
   LOGIC XUẤT EXCEL CHUYÊN NGHIỆP (DÙNG EXCELJS)
   ========================================================================== */
   async function exportToExcel() {
    if (!currentReportData || currentReportData.length === 0) {
        showToast("Không có dữ liệu để xuất!", "warning");
        return;
    }

    // 1. Lấy các thông số trên màn hình
    const reportPeriod = document.getElementById('report-period').options[document.getElementById('report-period').selectedIndex].text;
    const totalRevStr = document.getElementById('txt-total-revenue').innerText;
    const totalOrdStr = document.getElementById('txt-total-orders').innerText;
    
    // Chuyển chuỗi tiền tệ "460.000₫" về số nguyên 460000 để Excel hiểu là Number
    const totalRev = parseInt(totalRevStr.replace(/\D/g, '')) || 0;
    const totalOrd = parseInt(totalOrdStr) || 0;
    const adminName = JSON.parse(localStorage.getItem('userInfo') || '{}').fullName || 'Quản trị viên';

    // 2. Khởi tạo File Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bao_Cao_Doanh_Thu');

    // 3. Setup chiều rộng các cột (Canh lề tự động)
    sheet.columns = [
        { width: 20 },   // Cột A: STT
        { width: 20 },  // Cột B: Ngày tháng
        { width: 15 },  // Cột C: Số đơn
        { width: 25 },  // Cột D: Doanh thu
        { width: 25 }   // Cột E: Trung bình/Đơn
    ];

    // Cài đặt Font chữ mặc định cho toàn bộ sheet là Times New Roman
    sheet.eachRow((row) => { row.font = { name: 'Times New Roman', size: 12 }; });

    // 4. TRANG TRÍ TIÊU ĐỀ BÁO CÁO (Gộp ô từ cột A đến E)
    sheet.mergeCells('A1:E1');
    const title1 = sheet.getCell('A1');
    title1.value = 'CÔNG TY THỜI TRANG WEBNHOM5';
    title1.font = { name: 'Times New Roman', size: 14, bold: true, color: { arg: '003049' } };
    title1.alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('A2:E2');
    const title2 = sheet.getCell('A2');
    title2.value = 'BÁO CÁO DOANH THU TỔNG HỢP';
    title2.font = { name: 'Times New Roman', size: 16, bold: true };
    title2.alignment = { horizontal: 'center', vertical: 'middle' };

    // 5. THÊM THÔNG TIN META (Không viền)
    sheet.getCell('A4').value = 'Thời gian báo cáo:';
    sheet.getCell('A4').font = { bold: true };
    sheet.getCell('B4').value = reportPeriod;

    sheet.getCell('A5').value = 'Ngày xuất báo cáo:';
    sheet.getCell('A5').font = { bold: true };
    sheet.getCell('B5').value = new Date().toLocaleString('vi-VN');

    sheet.getCell('A6').value = 'Người lập bảng:';
    sheet.getCell('A6').font = { bold: true };
    sheet.getCell('B6').value = adminName;

    // Khối Tổng quan
    sheet.getCell('A8').value = 'TỔNG SỐ ĐƠN:';
    sheet.getCell('A8').font = { bold: true };
    sheet.getCell('B8').value = totalOrd;
    sheet.getCell('B8').alignment = { horizontal: 'left' };

    sheet.getCell('A9').value = 'TỔNG DOANH THU:';
    sheet.getCell('A9').font = { bold: true };
    sheet.getCell('B9').value = totalRev;
    sheet.getCell('B9').numFmt = '#,##0 "VNĐ"'; // Format tiền tệ chuẩn của Excel
    sheet.getCell('B9').font = { bold: true, color: { arg: 'C1121F' } }; // Chữ màu đỏ
    sheet.getCell('B9').alignment = { horizontal: 'left' };

    // 6. THIẾT KẾ HEADER CỦA BẢNG DỮ LIỆU CHÍNH (Có khung viền, nền xám)
    const headerRow = sheet.getRow(11);
    headerRow.values = ['STT', 'Ngày / Tháng', 'Số đơn hàng', 'Doanh thu (VNĐ)', 'Trung bình/Đơn (VNĐ)'];
    headerRow.font = { bold: true, name: 'Times New Roman', size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Định nghĩa Style kẻ khung viền (Border)
    const thinBorder = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
    };

    headerRow.eachCell((cell) => {
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { arg: 'EAEAEA' } }; // Tô nền xám nhạt
    });

    // 7. ĐỔ DỮ LIỆU VÀ KẺ KHUNG CHO TỪNG DÒNG
    currentReportData.forEach((item, index) => {
        const avg = item.totalOrders > 0 ? (item.totalRevenue / item.totalOrders) : 0;
        
        // Thêm data vào bảng
        const row = sheet.addRow([
            index + 1,
            item.date,
            item.totalOrders,
            item.totalRevenue, // Số thực để Excel tự tính toán được
            Math.round(avg)
        ]);

        // Chỉnh alignment và format
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(4).numFmt = '#,##0'; // Format hàng nghìn có dấu phẩy
        row.getCell(5).numFmt = '#,##0';

        // Áp dụng Border cho tất cả các ô trong dòng này
        row.eachCell((cell) => { cell.border = thinBorder; cell.font = { name: 'Times New Roman', size: 12 }; });
    });

    // 8. TẠO FILE VÀ TỰ ĐỘNG TẢI XUỐNG
    try {
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        link.download = `BaoCaoDoanhThu_WebNhom5_${dateStr}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Xuất Excel thành công!", "success");
    } catch (err) {
        console.error("Lỗi khi xuất Excel: ", err);
        showToast("Có lỗi xảy ra khi xuất file.", "error");
    }
}