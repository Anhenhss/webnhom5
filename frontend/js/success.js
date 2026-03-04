document.addEventListener('DOMContentLoaded', () => {
    // Trích xuất tham số 'code' từ URL (ví dụ: success.html?code=DH123456)
    const urlParams = new URLSearchParams(window.location.search);
    const orderCode = urlParams.get('code');

    const displayElement = document.getElementById('display-order-code');

    if (orderCode) {
        displayElement.innerText = orderCode;
    } else {
        // Nếu người dùng tự gõ link success.html mà không có mã đơn
        displayElement.innerText = "KHÔNG XÁC ĐỊNH";
        displayElement.style.color = "var(--text-muted)";
    }
});