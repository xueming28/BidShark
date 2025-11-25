import * as sideBar from './sideBar.js';
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

(async () => {
    const res = await fetch('api/info/session', {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    });
    console.log("this works")
    const data = await res.json();

    if (data.isLoggedIn) {
        const login = document.getElementById('login');
        login.textContent = "Logout";
        login.onclick = async() => {
            let msg = await fetch('api/info/logout', {
                method: "POST",
                credentials: "include",
                headers: {"Content-Type": "application/json"}
            });
            if(msg.ok) {
                alert("Logging out")
                location.reload();
            }else{
                let opt = await msg.json()
                alert(opt.message)
            }
        }
    }
})();
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});
// 商品卡片點擊
const itemCards = document.querySelectorAll('.item-card, .more-card');
itemCards.forEach(card => {
    card.addEventListener('click', () => {
        window.location.href = 'auction_item.html';
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