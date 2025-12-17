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

async function loadChats() {
    const chats = await fetch('/api/chat/getYourChats');
    const cCont = document.getElementById('chatContainer');
    if (chats.ok) {
        const data = await chats.json();
        if (data.length === 0) {
            cCont.innerHTML = '<p>No chats found.</p>';
            return;
        }
        cCont.innerHTML = '';
        data.forEach(chat => {
            const chatDiv = document.createElement('button');
            chatDiv.classList.add("list-group-item", "list-group-item-action");
            chatDiv.textContent = chat.OnSubject + '(@' + chat.withUser + ')';
            chatDiv.value = chat.chatId;
            cCont.appendChild(chatDiv);
        });
    }
}
document.addEventListener('DOMContentLoaded', loadChats);
(function(){
    //refresh every 1 second
    setInterval(loadChats, 5000);
})();