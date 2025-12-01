import * as sideBar from './sideBar.js';

// 載入側邊欄
fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.innerHTML = html;
            const links = sidebar.querySelectorAll('a.nav-item');
            const currentPage = location.pathname.split('/').pop() || 'homePage.html';
            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                }
            });
            sideBar.collapse();
        }
    });

// 檢查登入狀態
(async () => {
    try {
        const res = await fetch('/api/info/session', {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();

        if (data.isLoggedIn) {
            const loginBtn = document.getElementById('login');
            loginBtn.textContent = "Logout";
            loginBtn.onclick = async () => {
                const logoutRes = await fetch('/api/info/logout', {
                    method: "POST",
                    credentials: "include"
                });
                if (logoutRes.ok) {
                    alert("Logged out successfully");
                    location.reload();
                } else {
                    const msg = await logoutRes.json();
                    alert(msg.message || "Logout failed");
                }
            };
        }
    } catch (err) {
        console.error("Session check failed:", err);
    }
})();

// 防止 XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

//載入所有拍賣品
async function loadAuctionItems() {
    try {
        const res = await fetch('/api/data/auctions');
        const result = await res.json();

        if (!result.success || !result.items) {
            console.error('Failed to load auctions:', result);
            return;
        }

        let items = result.items;

        const recommendedGrid = document.querySelector('.recommended-grid');
        const moreGrid = document.querySelector('.more-grid');

        recommendedGrid.innerHTML = '';
        moreGrid.innerHTML = '';

        //Recommended 區塊 → 取「即將結束」的 5 件（剩餘時間最短）
        const endingSoon = [...items]
            .sort((a, b) => new Date(a.endTime) - new Date(b.endTime)) // 升冪：最早結束的在前
            .slice(0, 5);

        //More 區塊 → 所有商品，按「最新發布時間」最新在前
        const allByLatest = [...items]
            .sort((a, b) => new Date(b.createdAt || b.endTime) - new Date(a.createdAt || a.endTime));

        // 渲染 Recommended（即將結束）
        endingSoon.forEach(item => {
            const cardHTML = `
                <div class="item-card" data-id="${item._id}">
                    <div class="item-image" style="background-image: url('${item.image || '/Image/default-item.jpg'}'); background-size: cover; background-position: center;"></div>
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(item.title)}</div>
                        <div class="item-description">Current Bid</div>
                        <div class="item-footer">
                            <div class="item-price">NT$${item.price}</div>
                            <div class="item-time ending-soon">${item.timeLeft}</div>
                        </div>
                    </div>
                </div>
            `;
            recommendedGrid.insertAdjacentHTML('beforeend', cardHTML);
        });

        // 渲染 More 區（最新發布）
        allByLatest.forEach(item => {
            const smallCardHTML = `
                <div class="more-card" data-id="${item._id}">
                    <div class="more-image" style="background-image: url('${item.image || '/Image/default-item.jpg'}'); background-size: cover; background-position: center;"></div>
                    <div class="more-info">
                        <div class="more-name">${escapeHtml(item.title)}</div>
                        <div class="more-footer">
                            <div class="more-price">NT$${item.price}</div>
                            <div class="more-time">${item.timeLeft}</div>
                        </div>
                    </div>
                </div>
            `;
            moreGrid.insertAdjacentHTML('beforeend', smallCardHTML);
        });

        // 點擊卡片跳轉到詳情頁
        document.querySelectorAll('.item-card, .more-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                window.location.href = `auction_item.html?id=${id}`;
            });
        });

    } catch (err) {
        console.error('Error loading auction items:', err);
    }
}

// 頁面載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    loadAuctionItems();

    // Tab 切換
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // 搜尋功能
    const search = () => {
    const query = document.querySelector('.search-bar')?.value.trim();
    if (!query) return;

    // Redirect to browse page with keyword in URL
    window.location.href = `browse.html?q=${encodeURIComponent(query)}`;
    };

    document.querySelector('.search-btn')?.addEventListener('click', search);
    document.querySelector('.search-bar')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') search();
    });

    // 篩選下拉選單
    document.querySelector('.filter-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('ftr')?.classList.toggle('show');
    });

    window.addEventListener('click', e => {
        if (!e.target.closest('.filter-btn') && !e.target.closest('.filter-content')) {
            document.getElementById('ftr')?.classList.remove('show');
        }
    });
});