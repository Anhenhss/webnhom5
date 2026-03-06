const BACKEND_URL = 'http://localhost:5195';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Phân quyền: Cả Admin và Staff đều được vào
    if (!authManager.isLoggedIn()) { window.location.href = 'login.html'; return; }
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (userInfo.role !== 'Admin' && userInfo.role !== 'Staff') {
        window.location.href = 'index.html'; return;
    }

    const nameElem = document.getElementById('display-admin-name');
    if (nameElem) {
        const roleTitle = userInfo.role === 'Admin' ? "Quản trị viên" : "Nhân viên";
        nameElem.innerText = `Xin chào, ${roleTitle} (${userInfo.fullName})`;
    }
    
    // 2. LÀM SỐNG DROPDOWN LỌC THỜI GIAN
    const timeFilterEl = document.getElementById('global-time-filter');
    if (timeFilterEl) {
        timeFilterEl.addEventListener('change', loadDashboardData);
    }

    // Khởi tạo tải dữ liệu lần đầu
    loadDashboardData();
});

// Hàm format tiền tệ VNĐ
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

let revenueChartInstance = null;

async function loadDashboardData() {
    const filterEl = document.getElementById('global-time-filter');
    const timeFilter = filterEl ? filterEl.value : 'week';
    
    // Quy đổi sang số ngày để gửi cho Chart API
    let daysToFetch = 7; 
    if (timeFilter === 'day') daysToFetch = 1;
    else if (timeFilter === 'month') daysToFetch = 30;
    else if (timeFilter === 'year') daysToFetch = 365;

    try {
        // Gọi đồng thời các API cần thiết
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
        showToast("Không thể tải dữ liệu thống kê.", "error");
    }
}

// 1. CẬP NHẬT CÁC THẺ THỐNG KÊ (ĐÃ BỎ LƯỢT TRUY CẬP)
function updateOverviewCards(overview) {
    if (!overview) return;

    // Sử dụng toán tử ?. và kiểm tra null để tránh lỗi "innerText of null"
    const elRev = document.getElementById('stat-revenue');
    const elOrd = document.getElementById('stat-orders');
    const elUser = document.getElementById('stat-users');
    const elProd = document.getElementById('stat-products');

    if (elRev) elRev.innerText = formatCurrency(overview.totalRevenue || 0);
    if (elOrd) elOrd.innerText = overview.totalOrders || 0;
    if (elUser) elUser.innerText = overview.totalUsers || 0;
    if (elProd) elProd.innerText = overview.totalProducts || 0;
    
    // Lưu ý: Nếu trong HTML của em không còn stat-visitors thì code này sẽ không đụng vào nó nữa.
}

// 2. CẬP NHẬT CẢNH BÁO
function processAlerts(overview) {
    if (!overview) return;

    const elPending = document.getElementById('alert-pending-orders');
    const elStock = document.getElementById('alert-low-stock');

    if (elPending) elPending.innerText = overview.pendingOrdersCount || 0;
    if (elStock) elStock.innerText = overview.lowStockProductsCount || 0;
}

// 3. BẢNG XẾP HẠNG TOP SẢN PHẨM
function renderTopProducts(topProducts) {
    const tbody = document.getElementById('top-products-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!topProducts || topProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Chưa có dữ liệu giao dịch</td></tr>';
        return;
    }

    topProducts.forEach(product => {
        const stockClass = product.totalStock > 5 ? 'stock-ok' : 'stock-low';
        const stockText = product.totalStock > 5 ? 'Còn hàng' : 'Sắp hết';
        
        let imageUrl = 'image/placeholder.jpg';
        if (product.thumbnail) {
            imageUrl = product.thumbnail.startsWith('http') ? product.thumbnail : BACKEND_URL + product.thumbnail;
        }

        const tr = `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${imageUrl}" onerror="this.src='image/placeholder.jpg'" style="width:45px; height:45px; object-fit:cover; border-radius:6px; border: 1px solid #eee;">
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

// 4. VẼ BIỂU ĐỒ DOANH THU
function renderChart(chartData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();

    const labels = []; 
    const dataArray = [];
    
    if (chartData && chartData.length > 0) {
        chartData.forEach(item => {
            labels.push(item.date); 
            dataArray.push(item.totalRevenue);
        });
    }

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#003049';
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent-light').trim() || '#C1121F';
    
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: dataArray,
                borderColor: primaryColor,
                backgroundColor: 'rgba(0, 48, 73, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: accentColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                fill: true,
                tension: 0.3 
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

// TÌM KIẾM ĐƠN HÀNG NHANH
const searchInput = document.querySelector('.topbar-search input');
if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const keyword = this.value.trim();
            if (keyword) {
                window.location.href = `admin-orders.html?search=${encodeURIComponent(keyword)}`;
            }
        }
    });
}