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
    const data = await res.json();
    if (!data.isLoggedIn) {
        window.location.href = '../homePage.html';
    }else{
        let img = data.image.replace(/\s/g, "");
        if (img.startsWith("PHN")) {
            document.getElementById("pic").src = "data:image/svg+xml;base64," + img;
        }else{
            document.getElementById("pic").src = "data:image/png;base64," + img;
        }
        document.getElementById("nameInput").placeholder = data.name;
        document.getElementById("emailInput").placeholder = data.email;
        document.getElementById("numInput").placeholder = data.phoneNumber || "Please enter a phone number" ;
    }
})();
