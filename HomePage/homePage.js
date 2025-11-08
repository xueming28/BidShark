const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});


const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

// 商品卡片點擊
const itemCards = document.querySelectorAll('.item-card, .more-card');
itemCards.forEach(card => {
    card.addEventListener('click', () => {
        window.location.href = '../AuctionItem/auction_item.html';
    });
});
function searchItems() {
    const searchQuery = document.querySelector('.search-bar').value.trim();
    if (searchQuery) {
        alert(`搜尋功能開發中！\n您搜尋的是：${searchQuery}`);
    }
}
// Search 按鈕
document.querySelector('.search-btn').addEventListener('click', () => {
    searchItems();
});
document.querySelector('.search-bar').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchItems();
    }
});
//filter dropdown
document.querySelector('.filter-btn').addEventListener('click', (e) => {
    document.querySelector('.filter-content').classList.toggle("show");
})
window.onclick = function(event) {
    if (!event.target.closest('.filter-btn')&& !event.target.closest('.filter-content')) {
        var dropdowns = document.getElementsByClassName("filter-content");
        for (let i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};