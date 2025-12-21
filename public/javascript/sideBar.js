// public/javascript/sideBar.js

// 1. 初始化主題
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
}

export async function collapse() {
    
    // === Sidebar Toggle 邏輯 ===
    const toggleBtn = document.getElementById("toggleSidebar");
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            const sidebar = document.querySelector(".sidebar");
            const everything = document.querySelector(".everything");
            const mainContent = document.querySelector(".main-content");
            
            // 判斷目前是否為收起狀態
            if (sidebar.classList.contains('collapsed')) {
                // 展開
                sidebar.classList.remove('collapsed');
                toggleBtn.classList.remove('collapsed');
                if(everything) everything.classList.remove('collapsed');
                if(mainContent) mainContent.classList.remove('collapsed');
                
                // 箭頭向左
                toggleBtn.innerHTML = '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" transform="matrix(-1,0,0,1,0,0)"><path d="M15.2928932,12 L12.1464466,8.85355339 C11.9511845,8.65829124 11.9511845,8.34170876 12.1464466,8.14644661 C12.3417088,7.95118446 12.6582912,7.95118446 12.8535534,8.14644661 L16.8535534,12.1464466 C17.0488155,12.3417088 17.0488155,12.6582912 16.8535534,12.8535534 L12.8535534,16.8535534 C12.6582912,17.0488155 12.3417088,17.0488155 12.1464466,16.8535534 C11.9511845,16.6582912 11.9511845,16.3417088 12.1464466,16.1464466 L15.2928932,13 L4.5,13 C4.22385763,13 4,12.7761424 4,12.5 C4,12.2238576 4.22385763,12 4.5,12 L15.2928932,12 Z M19,5.5 C19,5.22385763 19.2238576,5 19.5,5 C19.7761424,5 20,5.22385763 20,5.5 L20,19.5 C20,19.7761424 19.7761424,20 19.5,20 C19.2238576,20 19,19.7761424 19,19.5 L19,5.5 Z"></path></svg>';
            } else {
                // 收起
                sidebar.classList.add("collapsed");
                toggleBtn.classList.add('collapsed');
                if(everything) everything.classList.add('collapsed');
                if(mainContent) mainContent.classList.add('collapsed');
                
                // 箭頭向右
                toggleBtn.innerHTML = '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.2928932,12 L12.1464466,8.85355339 C11.9511845,8.65829124 11.9511845,8.34170876 12.1464466,8.14644661 C12.3417088,7.95118446 12.6582912,7.95118446 12.8535534,8.14644661 L16.8535534,12.1464466 C17.0488155,12.3417088 17.0488155,12.6582912 16.8535534,12.8535534 L12.8535534,16.8535534 C12.6582912,17.0488155 12.3417088,17.0488155 12.1464466,16.8535534 C11.9511845,16.6582912 11.9511845,16.3417088 12.1464466,16.1464466 L15.2928932,13 L4.5,13 C4.22385763,13 4,12.7761424 4,12.5 C4,12.2238576 4.22385763,12 4.5,12 L15.2928932,12 Z M19,5.5 C19,5.22385763 19.2238576,5 19.5,5 C19.7761424,5 20,5.22385763 20,5.5 L20,19.5 C20,19.7761424 19.7761424,20 19.5,20 C19.2238576,20 19,19.7761424 19,19.5 L19,5.5 Z"/></svg>';
            }
        });
    }

    // === Dark Mode Toggle 邏輯 ===
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // 設定初始狀態
        const currentTheme = localStorage.getItem('theme');
        darkModeToggle.checked = (currentTheme === 'dark');

        // 監聽變更
        darkModeToggle.addEventListener('change', function(e) {
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // === 登入狀態檢查 ===
    try {
        const res = await fetch('/api/info/session', {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
            const data = await res.json();
            
            // 定義需要控制的按鈕 ID
            const protectedNavItems = ['profile', 'upload', 'cart', 'chat'];

            protectedNavItems.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    if (data.isLoggedIn) {
                        // 如果已登入 -> 顯示 (移除 inactive)
                        element.classList.remove("inactive");
                    } else {
                        // 如果未登入 -> 隱藏 (加入 inactive)
                        element.classList.add("inactive");
                    }
                }
            });
        }
    } catch (err) {
        console.error("Session check failed:", err);
    }
}