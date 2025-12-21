import * as sideBar from "./sideBar.js";
let currentChatId = null;
let currentSubject = null;
let currentWithUser = null;
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
            chatDiv.onclick = () => {
                getMessages(chat.chatId, chat.OnSubject, chat.withUser);
            }
            cCont.appendChild(chatDiv);
        });
    }
}
async function getMessages(chatId, subject, withUser) {
    const response = await fetch(`/api/chat/getChat/${chatId}`);
    currentChatId = chatId;
    currentSubject = subject;
    currentWithUser = withUser;
    const messagesArea = document.getElementById('messagesArea');
    document.getElementById('chatIdInput').value = chatId;
    document.getElementById("noChatSelected").classList.add('d-none');
    document.getElementById("chatContent").classList.remove('d-none');
    document.getElementById("recipientName").textContent = withUser;
    document.getElementById("subjectTitle").textContent = subject;
    if (response.ok) {
        const data = await response.json();

        // Clear previous messages
        messagesArea.innerHTML = '';

        if (data.length === 0) {
            messagesArea.innerHTML = '<p class="text-center text-muted mt-5">Start the conversation!</p>';
            return;
        }

        data.forEach(msg => {
            const isUser = msg.speaker === 'You';
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `d-flex mb-2 ${isUser ? 'justify-content-end' : 'justify-content-start'}`;
            const messageBubble = document.createElement('div');
            messageBubble.className = `p-2 rounded-3 text-break shadow-sm`;
            if (isUser) {
                messageBubble.classList.add('bg-primary', 'text-white');
            } else {
                messageBubble.classList.add('bg-light', 'text-dark', 'border');
            }
            if (!isUser) {
                messageBubble.innerHTML = `<small class="text-muted d-block">${msg.speaker}</small>`;
            }
            messageBubble.innerHTML += `<p class="mb-0">${msg.message}</p>`;
            messageWrapper.appendChild(messageBubble);
            messagesArea.appendChild(messageWrapper);
        });
        messagesArea.scrollTop = messagesArea.scrollHeight;
    } else {
        messagesArea.innerHTML = '<p class="text-danger text-center mt-5">Failed to load chat messages.</p>';
        console.error('Error loading chat:', response.status);
    }

}
async function sendMessage() {
    if(document.getElementById("messageInput").value === '') return;
    const res = await fetch(`/api/chat/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: document.getElementById("messageInput").value,
            chatId: document.getElementById('chatIdInput').value
        })
    })
    if (res.ok) {
        await reloadMessages();
    } else {
        console.error('Error sending message:', res.status);
    }
}
document.getElementById("submit").addEventListener('click', async e => {
    sendMessage();
})
document.getElementById('messageInput').addEventListener('keydown', async e =>{
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        await sendMessage();
    }
});

async function reloadMessages() {
    if (!currentChatId) return;
    const ChatIdChecker = currentChatId;
    const response = await fetch(`/api/chat/getChat/${currentChatId}`);
    const messagesArea = document.getElementById('messagesArea');
    const oldScrollPosition = messagesArea.scrollTop;
    if (!response.ok) return;

    const data = await response.json();
    //prevent race condition
    if(currentChatId !== ChatIdChecker) return;
    messagesArea.innerHTML = '';

    if (data.length === 0) {
        messagesArea.innerHTML = '<p class="text-center text-muted mt-5">Start the conversation!</p>';
        return;
    }

    data.forEach(msg => {
        const isUser = msg.speaker === 'You';
        const wrapper = document.createElement('div');
        wrapper.className = `d-flex mb-2 ${isUser ? 'justify-content-end' : 'justify-content-start'}`;

        const bubble = document.createElement('div');
        bubble.className = 'p-2 rounded-3 text-break shadow-sm';

        if (isUser) {
            bubble.classList.add('bg-primary', 'text-white');
        } else {
            bubble.classList.add('bg-light', 'text-dark', 'border');
            bubble.innerHTML = `<small class="text-muted d-block">${msg.speaker}</small>`;
        }

        bubble.innerHTML += `<p class="mb-0">${msg.message}</p>`;
        wrapper.appendChild(bubble);
        messagesArea.appendChild(wrapper);
    });
    messagesArea.scrollTop = oldScrollPosition;
}
document.addEventListener('DOMContentLoaded', loadChats);
(function(){
    //refresh every 5 second
    setInterval(loadChats, 5000);
    //refresh every 1 second
    setInterval(reloadMessages, 1000);
})();