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
let allItems = [];

async function loadItems() {
    try {
        const res = await fetch("http://localhost:3000/api/data/auctions");
        const data = await res.json();

        allItems = data.items || [];
        renderItems(allItems);

        // Auto-search if homepage redirected with query
        if (initialQuery) {
            filterItems(initialQuery.toLowerCase());
        }
    } catch (err) {
        console.error("Error loading items:", err);
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

        card.innerHTML = `
            <img src="${item.image}" class="item-img" />
            <div class="item-name">${item.title}</div>
            <div class="item-price">NTD ${item.price}</div>
            <div class="item-time">${item.timeLeft}</div>
        `;

        // Make card clickable → go to item page
        card.addEventListener("click", () => {
            window.location.href = `auction_item.html?id=${item._id}`;
        });

        container.appendChild(card);
    });
}

/* =========================================================
   5. NORMAL SEARCH (no fuzzy search)
========================================================= */

function filterItems(keyword) {
    const filtered = allItems.filter(item =>
        item.title.toLowerCase().includes(keyword)
    );

    renderItems(filtered);
}

// Live search while typing
searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    filterItems(keyword);
});

// Search button
document.querySelector(".search-button").addEventListener("click", () => {
    const keyword = searchInput.value.toLowerCase();
    filterItems(keyword);
});

/* =========================================================
   6. FILTER DROPDOWN
========================================================= */
document.querySelector('.filter-button').addEventListener('click', () => {
    document.querySelector('.filter-content').classList.toggle("show");
});

window.onclick = function(event) {
    if (!event.target.closest('.filter-button') && 
        !event.target.closest('.filter-content')) 
    {
        document.querySelectorAll(".filter-content")
            .forEach(menu => menu.classList.remove("show"));
    }
};

/* =========================================================
   7. INIT
========================================================= */
loadItems();
