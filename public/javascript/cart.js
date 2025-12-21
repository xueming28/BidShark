import * as sideBar from './sideBar.js';

// --- 初始化側邊欄 ---
fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = html;
        
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
        const res = await fetch('/api/cart'); 
        
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

        checkoutBar.style.display = 'flex';
        container.innerHTML = '';

        items.forEach(item => {
            // 處理圖片
            let imgSrc = '/Image/default-item.jpg';
            if (Array.isArray(item.productImage) && item.productImage.length > 0) {
                imgSrc = item.productImage[0];
            } else if (typeof item.productImage === 'string') {
                imgSrc = item.productImage;
            }

            // 🔥【修正重點 1】確保取得數量，預設為 1
            const qty = item.quantity || 1; 

            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6'; 
            div.innerHTML = `
                <div class="card cart-item-card" style="width: 100%;">
                    <img class="card-img-top" src="${imgSrc}" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <div style="display:flex; align-items:flex-start;">
                            <input type="checkbox" class="cart-checkbox" 
                                   data-id="${item._id}" 
                                   data-price="${item.price}" 
                                   data-quantity="${qty}">
                            <div style="width: 100%;">
                                <h5 class="card-title">${item.title}</h5>
                                <p class="card-text text-success font-weight-bold">
                                    單價: $${item.price.toLocaleString()} <br>
                                    <span style="color: #666; font-size: 0.9em;">數量: ${qty}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        const checkboxes = document.querySelectorAll('.cart-checkbox');
        checkboxes.forEach(box => {
            box.addEventListener('change', updateTotal);
        });
        
        const btnCheckout = document.getElementById('btn-checkout');
        if (btnCheckout) {
             btnCheckout.onclick = performCheckout;
        }

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
        const price = parseFloat(box.dataset.price);
        // 🔥【修正重點 3】取出數量並參與計算
        const qty = parseInt(box.dataset.quantity || 1);
        total += price * qty;
    });
    
    // 加上逗號分隔，看起來比較高級
    document.getElementById('total-price').innerText = '$' + total.toLocaleString();
    document.getElementById('btn-checkout').disabled = (checkboxes.length === 0);
}

// 執行結帳函式
async function performCheckout() {
    const checkboxes = document.querySelectorAll('.cart-checkbox:checked');
    
    // 🔥【修正重點 4】計算選取的「總商品數量」，而不只是「列數」
    let totalQty = 0;
    checkboxes.forEach(box => {
        totalQty += parseInt(box.dataset.quantity || 1);
    });

    const cartIds = Array.from(checkboxes).map(box => box.dataset.id);
    
    if (cartIds.length === 0) return;

    const totalPriceText = document.getElementById('total-price').innerText;

    // 🔥【修正重點 5】提示文字改顯示正確的總數量
    if(!confirm(`確定要結帳這 ${totalQty} 件商品嗎？\n總金額: ${totalPriceText}`)) {
        return;
    }

    try {
        const res = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartIds: cartIds })
        });

        const result = await res.json();
        
        if (res.ok) {
            alert('🎉 付款成功！商品已移至歷史訂單。');
            loadCart(); 
            loadDeals();
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
/*async function loadBids() {
    const bidContainer = document.getElementById('bidItems');
    try {
        const res = await fetch('/api/read/getAllBid');
        const bids = await res.json();
        const itemYouBid = [];

        bids.forEach(bid => {
            const item = bid.auctionItem?.[0];
            if (!item || item.status === 'inactive') return;

            const existing = itemYouBid.find(i => i._id === item._id);
            
            if (Array.isArray(item.images)) {
                 item.displayImage = item.images[0];
            } else {
                 item.displayImage = item.images;
            }

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
                    <img class="card-img-top" src="${item.displayImage || '/Image/default-item.jpg'}" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">
                            目前最高: <span style="font-weight:bold;">$${item.currentPrice}</span><br>
                            你的出價: $${item.yourBid}<br>
                            剩餘時間: <span class="countdown" data-endtime="${item.endTime}" style="color:red">計算中...</span>
                        </p>
                    </div>
                </div>
            `;
            bidContainer.appendChild(div);
            startCountdown(div, item.endTime);
        });
    } catch (e) { 
        console.error('Load bids failed', e);
        bidContainer.innerHTML = '<p class="col-12 text-center text-muted">載入失敗</p>';
    }
}*/
async function loadBids() {
    const bidContainer = document.getElementById('bidItems');
    try {
        const [resBids, resSession] = await Promise.all([
            fetch('/api/read/getAllBid'),
            fetch('/api/info/session', { method: 'POST', credentials: 'include' })
        ]);

        if(!resBids.ok) throw new Error('Failed to load bids');
        const bids = await resBids.json();
        const session = resSession.ok ? await resSession.json() : null;
        const myUserId = session?.id ? String(session.id) : null;

        // Map by item id to aggregate per-item data and preserve "yourBid" only for current user
        const itemMap = new Map();

        for (const bid of bids) {
            const item = bid.auctionItem?.[0];
            if (!item || item.status === 'inactive') continue;

            const itemId = String(item._id);
            let entry = itemMap.get(itemId);
            if (!entry) {
                entry = {
                    ...item,
                    displayImage: Array.isArray(item.images) ? item.images[0] : item.images,
                    currentPrice: Number(item.currentPrice ?? item.startPrice ?? 0),
                    yourBid: null
                };
            }

            let bidderId = null;
            if (bid.bidderId) bidderId = bid.bidderId._id ?? bid.bidderId;
            else if (bid.userId) bidderId = bid.userId._id ?? bid.userId;
            else if (bid.bidder) bidderId = bid.bidder._id ?? bid.bidder;
            bidderId = bidderId != null ? String(bidderId) : null;
            
            // Update authoritative current price from item (server source)
            if (Number(item.currentPrice) > Number(entry.currentPrice)) {
                entry.currentPrice = item.currentPrice;
            }

            // only mark yourBid for bids that belong to current session user
            if (myUserId && bidderId === myUserId) {
                const bidPrice = Number(bid.price ?? 0);
                entry.yourBid = Math.max(entry.yourBid || 0, bidPrice);
            }

            itemMap.set(itemId, entry);
        }

        const itemYouBid = Array.from(itemMap.values()).filter(e => e.yourBid !== null);

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
                    <img class="card-img-top" src="${item.displayImage || '/Image/default-item.jpg'}" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <h5 class="card-title">${item.title}</h5>
                        <p class="card-text">
                            目前最高: <span style="font-weight:bold;">$${item.currentPrice}</span><br>
                            你的出價: <span style="font-weight:bold;">$${item.yourBid ?? 0}</span><br>
                            剩餘時間: <span class="countdown" data-endtime="${item.endTime}" style="color:red">計算中...</span>
                        </p>
                    </div>
                </div>
            `;
            bidContainer.appendChild(div);
            startCountdown(div, item.endTime);
        });
    } catch (e) {
        console.error('Load bids failed', e);
        bidContainer.innerHTML = '<p class="col-12 text-center text-muted">載入失敗</p>';
    }
}

function startCountdown(element, endTimeStr) {
    const span = element.querySelector('.countdown');
    
    function update() {
        const now = new Date();
        const end = new Date(endTimeStr);
        let diff = end - now;

        if (diff <= 0) {
            span.textContent = '已結束';
            return;
        }

        const days = Math.floor(diff / 86400000); diff %= 86400000;
        const hours = Math.floor(diff / 3600000); diff %= 3600000;
        const minutes = Math.floor(diff / 60000); diff %= 60000;
        const seconds = Math.floor(diff / 1000);

        span.textContent = `${days}天 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }

    update(); 
    const timer = setInterval(update, 1000); 
    
    if(!document.contains(element)) clearInterval(timer);
}

// ==========================================
//  功能 3: 載入歷史訂單 (History Deals)
// ==========================================
async function loadDeals() {
    const dealContainer = document.getElementById('cartItems');
    try {
        const res = await fetch('/api/read/getAllDeals');
        const deals = await res.json();
        
        if (!deals || deals.length === 0) {
            dealContainer.innerHTML = '<div class="col-12 empty-msg">尚無歷史訂單</div>';
            return;
        }

        dealContainer.innerHTML = '';
        deals.forEach(deal => {
            const item = deal.auctionItem?.[0] || { title: deal.title || 'Unknown Item', images: null };
            
            let imgSrc = '/Image/default-item.jpg';
            if (Array.isArray(item.images) && item.images.length > 0) {
                 imgSrc = item.images[0];
            } else if (typeof item.images === 'string') {
                 imgSrc = item.images;
            }

            const div = document.createElement('div');
            div.className = 'col-md-4 col-sm-6';
            div.innerHTML = `
                <div class="card bg-light" style="width: 100%; opacity: 0.85;">
                    <img class="card-img-top" src="${imgSrc}" style="height: 150px; object-fit: cover; filter: grayscale(80%);" onerror="this.src='/Image/default-item.jpg'">
                    <div class="card-body">
                        <h5 class="card-title text-muted">${item.title} (已購買)</h5>
                        <p class="card-text">
                            成交價: $${deal.total_price}<br>
                            數量: ${deal.quantity || 1}<br>
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

document.addEventListener('DOMContentLoaded', () => {
    loadCart(); 
    loadBids();
    loadDeals();
});