import * as sideBar from "./sideBar.js";

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
document.addEventListener('DOMContentLoaded', () => {

});
(function(){
    //refresh every 1 second
})();