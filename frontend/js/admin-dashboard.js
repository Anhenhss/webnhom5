document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra quyền truy cập
    if (!authManager.isLoggedIn()) { 
        window.location.href = 'login.html'; 
        return; 
    }
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    // 2. HIỂN THỊ LỜI CHÀO 
    const roleTitle = currentUserRole === 'Admin' ? "Quản trị viên" : "Nhân viên";
    const nameElem = document.getElementById('display-admin-name');
    if (nameElem) {
        nameElem.innerText = `Xin chào, ${roleTitle} (${userInfo.fullName})`;
    }
    const avatarElem = document.getElementById('admin-avatar');
    if (avatarElem) {
        // Tự động tạo ảnh đại diện theo tên (UI Avatars)
        avatarElem.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=003049&color=fff`;
    }
    // Khởi tạo tải dữ liệu lần đầu
    loadDashboardData();
});

// Hàm format tiền tệ VNĐ
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

let revenueChartInstance = null;

async function loadDashboardData() {
    const timeFilter = document.getElementById('global-time-filter').value;
    
    // Quy đổi timeFilter sang số ngày để gửi cho Chart API
    let daysToFetch = 7; // Mặc định week
    if (timeFilter === 'day') daysToFetch = 1;
    else if (timeFilter === 'month') daysToFetch = 30;
    else if (timeFilter === 'year') daysToFetch = 365;

    try {
        // Gọi 3 API xịn xò của AdminDashboardController và AdminOrderController cùng lúc
        const [overviewData, topProductsData, chartData] = await Promise.all([
            apiFetch(`/admin/dashboard/overview?timeFilter=${timeFilter}`),
            apiFetch(`/admin/dashboard/top-products?limit=5`),
            apiFetch(`/admin/orders/statistics?days=${daysToFetch}`)
        ]);

        // Cập nhật giao diện
        updateOverviewCards(overviewData);
        processAlerts(overviewData);
        renderTopProducts(topProductsData);
        renderChart(chartData);

    } catch (error) {
        console.error("Lỗi tải dữ liệu Dashboard thực tế:", error);
        showToast("Không thể kết nối đến máy chủ API.", "error");
    }
}

// 1. CẬP NHẬT 4 THẺ THỐNG KÊ (Dùng DashboardOverviewDto)
function updateOverviewCards(overview) {
    if (!overview) return;

    document.getElementById('stat-revenue').innerText = formatCurrency(overview.totalRevenue);
    document.getElementById('stat-orders').innerText = overview.totalOrders;
    document.getElementById('stat-users').innerText = overview.totalUsers;
    
    // Visitors hiện đang set là 0 từ Backend, em có thể update logic sau
    document.getElementById('stat-visitors').innerText = overview.totalVisitors;
}

// 2. CẬP NHẬT CẢNH BÁO (Dùng DashboardOverviewDto)
function processAlerts(overview) {
    if (!overview) return;

    document.getElementById('alert-pending-orders').innerText = overview.pendingOrdersCount;
    document.getElementById('alert-low-stock').innerText = overview.lowStockProductsCount;
}

// 3. BẢNG XẾP HẠNG TOP SẢN PHẨM (Dùng TopProductDto)
function renderTopProducts(topProducts) {
    const tbody = document.getElementById('top-products-body');
    tbody.innerHTML = '';
    
    if (!topProducts || topProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Chưa có dữ liệu giao dịch</td></tr>';
        return;
    }

    topProducts.forEach(product => {
        const stockClass = product.totalStock > 5 ? 'stock-ok' : 'stock-low';
        const stockText = product.totalStock > 5 ? 'Còn hàng' : 'Sắp hết';
        
        // Đảm bảo không bị lỗi hiển thị ảnh nếu null
        const imageUrl = product.thumbnail || 'image/placeholder.jpg';

        const tr = `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${imageUrl}" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border: 1px solid #eee;">
                        <strong style="color: var(--color-primary); font-size: 0.95rem;">${product.productName}</strong>
                    </div>
                </td>
                <td style="font-weight: 600;">${product.soldCount}</td>
                <td style="color: var(--color-accent-light); font-weight:700;">${formatCurrency(product.revenue)}</td>
                <td><span class="stock-status ${stockClass}">${stockText}</span></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', tr);
    });
}

// 4. VẼ BIỂU ĐỒ DOANH THU (Dùng RevenueStatisticDto)
function renderChart(chartData) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();

    const labels = []; 
    const dataArray = [];
    
    if (chartData && chartData.length > 0) {
        chartData.forEach(item => {
            labels.push(item.date); // API của Quý trả về chuỗi "dd/MM/yyyy" đã format sẵn
            dataArray.push(item.totalRevenue);
        });
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-light').trim();
    
    revenueChartInstance = new Chart(ctx, {
        type: 'line', // Đổi sang biểu đồ đường (line) cho thanh lịch và hiện đại hơn
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: dataArray,
                borderColor: primaryColor,
                backgroundColor: 'rgba(0, 48, 73, 0.1)', // Đổ màu nhạt dưới đường line
                borderWidth: 3,
                pointBackgroundColor: accentColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                fill: true,
                tension: 0.3 // Làm cong mềm mại các điểm nối
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: '#EAEAEA', borderDash: [5, 5] },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000) + ' Tr';
                            if (value >= 1000) return (value / 1000) + ' K';
                            return value;
                        }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Xử lý đăng xuất
function logout() {
    authManager.clear();
    showToast("Đã đăng xuất!", "success");
    setTimeout(() => { window.location.href = 'login.html'; }, 1000);
}
/* ==========================================================================
   TÍNH NĂNG TÌM KIẾM ĐƠN HÀNG (TOPBAR)
   ========================================================================== */
   const searchInput = document.querySelector('.topbar-search input');
   if (searchInput) {
       searchInput.addEventListener('keypress', function (e) {
           if (e.key === 'Enter') {
               const keyword = this.value.trim();
               if (keyword) {
                   // Chuyển hướng sang trang Quản lý Đơn hàng kèm theo query tìm kiếm
                   // (Sau này sang file admin-orders.js em sẽ viết code hứng cái biến search này)
                   window.location.href = `admin-orders.html?search=${encodeURIComponent(keyword)}`;
               }
           }
       });
   }
   
   /* ==========================================================================
      TÍNH NĂNG CHUÔNG THÔNG BÁO (REALTIME BẰNG POLLING)
      ========================================================================== */
   let currentPendingCount = 0; // Lưu trữ số đơn hàng đang chờ duyệt hiện tại
   const bellBtn = document.querySelector('.notification-bell');
   const notifyBadge = document.getElementById('new-order-badge');
   
   // Hàm kiểm tra đơn hàng mới chạy ngầm
   async function pollForNewOrders() {
       try {
           // Chỉ lấy các đơn Pending (status = 0) để cho nhẹ Backend
           const response = await apiFetch(`/admin/orders?status=0`);
           const pendingOrders = Array.isArray(response) ? response : (response.items || []);
           
           const newPendingCount = pendingOrders.length;
   
           // Nếu số lượng đơn chờ duyệt tăng lên, nghĩa là vừa có khách đặt hàng thành công
           if (newPendingCount > currentPendingCount && currentPendingCount !== 0) {
               notifyBadge.style.display = 'block'; // Hiện chấm đỏ
               showToast("🔔 Bạn vừa có đơn đặt hàng mới! Vui lòng kiểm tra.", "success");
               
               // Cập nhật luôn con số ở thẻ Cảnh báo bên dưới (nếu thẻ đó đang hiển thị)
               const alertElem = document.getElementById('alert-pending-orders');
               if (alertElem) alertElem.innerText = newPendingCount;
           }
   
           currentPendingCount = newPendingCount; // Cập nhật lại mốc so sánh
       } catch (error) {
           console.warn("Lỗi khi kiểm tra thông báo ngầm:", error);
       }
   }
   
   // Bắt đầu quá trình hỏi dò (Polling) sau khi load xong trang
   // Lần đầu tiên gọi sau 5 giây, sau đó lặp lại mỗi 30 giây
   setTimeout(() => {
       // Khởi tạo lấy mốc số lượng ban đầu (tránh việc vừa vào trang đã báo có đơn mới)
       const alertElem = document.getElementById('alert-pending-orders');
       if (alertElem) currentPendingCount = parseInt(alertElem.innerText) || 0;
       
       // Bật bộ lặp 30 giây
       setInterval(pollForNewOrders, 30000);
   }, 5000);
   
   // Xử lý sự kiện khi click vào chuông thông báo
   if (bellBtn) {
       bellBtn.addEventListener('click', () => {
           // Ẩn chấm đỏ đi
           notifyBadge.style.display = 'none';
           // Chuyển hướng sang trang Đơn hàng, tự động lọc các đơn đang Chờ duyệt (status=0)
           window.location.href = 'admin-orders.html?status=0';
       });
   }