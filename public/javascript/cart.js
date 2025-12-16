import * as sideBar from './sideBar.js';

// --- 初始化側邊欄 ---
fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = html;
        
        // 設定 active 狀態
        const links = sidebar.querySelectorAll('a.nav-item');
        const currentPage = window.location.pathname.split('/').pop();
        links.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
        sideBar.collapse();
    });

// ==========================================
//  功能 1: 購物車 (Cart) 與 結帳 (Checkout)
// ==========================================

async function loadCart() {
    const container = document.getElementById('cart-container');
    const checkoutBar = document.getElementById('checkout-bar');
    
    try {
        // 呼叫後端 API 取得購物車 (請確認你的路由是否需要加 /api 前綴)
        const res = await fetch('/cart'); 
        
        if (res.status === 401) {
            container.innerHTML = '<p class="col-12 text-danger text-center">請先登入以查看購物車</p>';
            return;
        }
        
        const items = await res.json();

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="col-12 empty-msg">目前沒有待付款的商品</div>';
            checkoutBar.style.display = 'none';
            return;
        }

        // 有商品，顯示結帳列並渲染商品
        checkoutBar.style.display = 'flex';
        container.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6'; // Bootstrap Grid
            div.innerHTML = `
                <div class="card cart-item-card" style="width: 100%;">
                    <img class="card-img-top" src="${item.productImage || '/Image/default-item.jpg'}" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <div style="display:flex; align-items:flex-start;">
                            <input type="checkbox" class="cart-checkbox" data-id="${item._id}" data-price="${item.price}">
                            <div style="width: 100%;">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text text-success font-weight-bold">得標價: $${item.price}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        // 綁定 Checkbox 點擊事件 (更新總金額)
        const checkboxes = document.querySelectorAll('.cart-checkbox');
        checkboxes.forEach(box => {
            box.addEventListener('change', updateTotal);
        });
        
        // 綁定結帳按鈕事件
        document.getElementById('btn-checkout').onclick = performCheckout;

    } catch (error) {
        console.error('Load cart failed:', error);
        container.innerHTML = '<p class="col-12 text-center">載入失敗，請稍後再試</p>';
    }
}

// 更新總金額函式
function updateTotal() {
    const checkboxes = document.querySelectorAll('.cart-checkbox:checked');
    let total = 0;
    
    checkboxes.forEach(box => {
        total += parseFloat(box.dataset.price);
    });
    
    document.getElementById('total-price').innerText = '$' + total;
    // 如果沒選任何商品，鎖住結帳按鈕
    document.getElementById('btn-checkout').disabled = (checkboxes.length === 0);
}

// 執行結帳函式
async function performCheckout() {
    const checkboxes = document.querySelectorAll('.cart-checkbox:checked');
    const cartIds = Array.from(checkboxes).map(box => box.dataset.id);
    
    if (cartIds.length === 0) return;

    if(!confirm(`確定要結帳這 ${cartIds.length} 件商品嗎？\n總金額: ${document.getElementById('total-price').innerText}`)) {
        return;
    }

    try {
        const res = await fetch('/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartIds: cartIds })
        });

        const result = await res.json();
        
        if (res.ok) {
            alert('🎉 付款成功！商品已移至歷史訂單。');
            // 重新整理頁面資料
            loadCart(); 
            loadDeals();
            // 重置總金額顯示
            document.getElementById('total-price').innerText = '$0';
            document.getElementById('btn-checkout').disabled = true;
        } else {
            alert('結帳失敗: ' + (result.error || '未知錯誤'));
        }
    } catch (error) {
        console.error(error);
        alert('系統錯誤，請檢查網路連線');
    }
}


// ==========================================
//  功能 2: 載入競標中商品 (Active Bids)
// ==========================================
async function loadBids() {
    const bidContainer = document.getElementById('bidItems');
    try {
        // 請確認路徑是否正確
        const res = await fetch('api/read/getAllBid');
        const bids = await res.json();
        const itemYouBid = [];

        // 資料整理邏輯：只顯示 active 且整理出最高出價
        bids.forEach(bid => {
            const item = bid.auctionItem?.[0];
            // 如果 item 不存在或是 inactive (代表已結束)，就不顯示在「競標中」
            if (!item || item.status === 'inactive') return;

            const existing = itemYouBid.find(i => i._id === item._id);
            if (!existing) {
                itemYouBid.push({ ...item, yourBid: bid.price });
            } else {
                if (item.currentPrice > existing.currentPrice) existing.currentPrice = item.currentPrice;
                if (bid.price > existing.yourBid) existing.yourBid = bid.price;
            }
        });

        if (itemYouBid.length === 0) {
            bidContainer.innerHTML = '<div class="col-12 empty-msg">目前沒有進行中的競標</div>';
            return;
        }

        bidContainer.innerHTML = '';
        itemYouBid.forEach(item => {
            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6';
            div.innerHTML = `
                <div class="card" style="width: 100%;">
                    <img class="card-img-top" src="${item.images || '/Image/default-item.jpg'}" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">
                            目前最高: <span style="font-weight:bold;">${item.currentPrice}</span><br>
                            你的出價: ${item.yourBid}<br>
                            剩餘時間: <span class="countdown" data-endtime="${item.endTime}" style="color:red">計算中...</span>
                        </p>
                    </div>
                </div>
            `;
            bidContainer.appendChild(div);
            // 啟動個別倒數計時
            startCountdown(div, item.endTime);
        });
    } catch (e) { 
        console.error('Load bids failed', e);
        bidContainer.innerHTML = '<p class="col-12 text-center text-muted">載入失敗</p>';
    }
}

// 倒數計時器 Helper Function
function startCountdown(element, endTimeStr) {
    const span = element.querySelector('.countdown');
    
    function update() {
        const now = new Date();
        const end = new Date(endTimeStr);
        let diff = end - now;

        if (diff <= 0) {
            span.textContent = '已結束';
            // 選擇性：這裡可以考慮 reload 頁面，因為結束後它應該要變購物車項目
            return;
        }

        const days = Math.floor(diff / 86400000); diff %= 86400000;
        const hours = Math.floor(diff / 3600000); diff %= 3600000;
        const minutes = Math.floor(diff / 60000); diff %= 60000;
        const seconds = Math.floor(diff / 1000);

        span.textContent = `${days}天 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }

    update(); // 立即執行一次
    setInterval(update, 1000); // 之後每秒執行
}


// ==========================================
//  功能 3: 載入歷史訂單 (History Deals)
// ==========================================
async function loadDeals() {
    const dealContainer = document.getElementById('cartItems');
    try {
        const res = await fetch('api/read/getAllDeals');
        const deals = await res.json();
        
        if (!deals || deals.length === 0) {
            dealContainer.innerHTML = '<div class="col-12 empty-msg">尚無歷史訂單</div>';
            return;
        }

        dealContainer.innerHTML = '';
        deals.forEach(deal => {
            // 防止關聯失敗導致報錯
            const item = deal.auctionItem?.[0] || { title: deal.title || 'Unknown Item', images: null };
            
            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6';
            div.innerHTML = `
                <div class="card bg-light" style="width: 100%; opacity: 0.85;">
                    <img class="card-img-top" src="${item.images || '/Image/default-item.jpg'}" style="height: 150px; object-fit: cover; filter: grayscale(80%);">
                    <div class="card-body">
                        <h5 class="card-title text-muted">${item.title} (已購買)</h5>
                        <p class="card-text">
                            成交價: $${deal.total_price}<br>
                            日期: ${new Date(deal.purchaseDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            `;
            dealContainer.appendChild(div);
        });
    } catch (e) { 
        console.error('Load deals failed', e); 
        dealContainer.innerHTML = '<p class="col-12 text-center text-muted">載入失敗</p>';
    }
}

// === 程式入口 ===
// 當 HTML 載入完成後，依序執行三個區塊的載入函式
document.addEventListener('DOMContentLoaded', () => {
    loadCart();   // 載入購物車
    loadBids();   // 載入競標中
    loadDeals();  // 載入歷史紀錄
});