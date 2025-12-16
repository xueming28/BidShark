import * as sideBar from './sideBar.js';

/* =========================================================
   1. GET INITIAL SEARCH QUERY FROM HOMEPAGE
========================================================= */
const urlParams = new URLSearchParams(window.location.search);
const initialQuery = urlParams.get("q");

const searchInput = document.querySelector(".search-bar");
if (initialQuery && searchInput) {
    searchInput.value = initialQuery;
}

/* =========================================================
   2. LOAD SIDEBAR
========================================================= */
fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = html;

        const links = sidebar.querySelectorAll('a.nav-item');
        const currentPage = window.location.pathname.split('/').pop();

        links.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage === currentPage) {
                link.classList.add('active');
            }
        });

        sideBar.collapse();
    });

/* =========================================================
   3. FETCH AUCTION ITEMS
========================================================= */
async function loadItems(queryParams = {}) {
    try {
        const container = document.getElementById("productContainer");
        container.innerHTML = '<div class="spinner"></div>';

        // 使用相對路徑，確保部署後也能運作
        const url = new URL("/api/data/auctions", window.location.origin);

        // 只有在完全沒有提供搜尋參數時，才套用 URL 帶來的 initialQuery
        if (initialQuery && queryParams.search === undefined) {
            url.searchParams.append("search", initialQuery);
        }

        // 加入篩選參數
        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] !== null && queryParams[key] !== '') {
                url.searchParams.append(key, queryParams[key]);
            }
        });

        const res = await fetch(url);
        const data = await res.json();

        renderItems(data.items || []);

    } catch (err) {
        console.error("Error loading items:", err);
        document.getElementById("productContainer").innerHTML = "<p>Error loading items.</p>";
    }
}

/* =========================================================
   4. RENDER ITEMS
========================================================= */
function renderItems(items) {
    const container = document.getElementById("productContainer");
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = "<p>No items found.</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("item-card");
        card.dataset.id = item._id;
        if (item.dSale) {
            card.innerHTML = `
            <img src="${item.image}" class="item-img" />
            <div class="item-name">${item.title}</div>
            <div class="item-price">NTD ${item.price}</div>
            <div class="item-time">${item.stock} in stock</div>
        `;
        } else {
            card.innerHTML = `
            <img src="${item.image}" class="item-img" />
            <div class="item-name">${item.title}</div>
            <div class="item-price">NTD ${item.price}</div>
            <div class="item-time">${item.timeLeft}</div>
        `;
        }
        // Make card clickable → go to item page
        card.addEventListener("click", () => {
            window.location.href = `auctionItem.html?id=${item._id}`;
        });
        container.appendChild(card);
    });
}

/* =========================================================
   5. SEARCH BAR LOGIC (Modified)
========================================================= */
// 原本是前端 filter，現在改為重新呼叫後端

const performSearch = () => {
    const keyword = searchInput.value.trim();
    loadItems({ search: keyword });
};

// 監聽 Enter 鍵
searchInput.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') performSearch();
});

// 監聽搜尋按鈕
document.querySelector(".search-button").addEventListener("click", performSearch);

/* =========================================================
   6. FILTER LOGIC (New)
========================================================= */
// 這裡處理下拉選單和價格篩選

document.querySelector('.filter-button').addEventListener('click', () => {
    document.querySelector('.filter-content').classList.toggle("show");
});

// 點擊 "Apply Filters" 按鈕
document.getElementById('applyFilterBtn').addEventListener('click', () => {
    // 1. 收集數值
    const category = document.getElementById('categoryFilter').value;
    const type = document.getElementById('typeFilter').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const keyword = searchInput.value.trim(); // 保留目前的搜尋關鍵字

    // 2. 呼叫 loadItems
    loadItems({
        category: category === 'all' ? null : category,
        type: type === 'all' ? null : type,
        minPrice,
        maxPrice,
        search: keyword
    });

    // 3. 關閉篩選選單 (可選)
    document.querySelector('.filter-content').classList.remove("show");
});

// 點擊外部關閉選單 (保持不變)
window.onclick = function (event) {
    if (!event.target.closest('.filter-button') &&
        !event.target.closest('.filter-content')) {
        document.querySelectorAll(".filter-content")
            .forEach(menu => menu.classList.remove("show"));
    }
};

// 初始載入
loadItems();