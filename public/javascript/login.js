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

let isSignUpMode = true;
let currentUser = null;


// DOM 元素
const authForm = document.getElementById('authForm');
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const passwordGroup = document.getElementById('passwordGroup');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const submitBtn = document.getElementById('submitBtn');
const toggleMode = document.getElementById('toggleMode');
const toggleText = document.getElementById('toggleText');
const formTitle = document.getElementById('formTitle');
const formSubtitle = document.getElementById('formSubtitle');
const successMessage = document.getElementById('successMessage');
const googleBtn = document.getElementById('googleBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const auctionList = document.getElementById('auctionList');
const togglePassword = document.getElementById('togglePassword');

//sidebar active item
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

// Email 驗證
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 密碼驗證
function validatePassword(password) {
    return password.length >= 6;
}

// 顯示錯誤訊息
function showError(element, errorElement) {
    element.classList.add('error');
    errorElement.classList.add('show');
}

// 隱藏錯誤訊息
function hideError(element, errorElement) {
    element.classList.remove('error');
    errorElement.classList.remove('show');
}

// 顯示成功訊息
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// 切換註冊/登入模式
toggleMode.addEventListener('click', () => {
    if (isSignUpMode) {
        formTitle.textContent = 'Welcome back!';
        formSubtitle.textContent = 'Enter your email to sign in';
        submitBtn.textContent = 'Sign in with email';
        toggleText.firstChild.textContent = "Don't have an account? ";
        toggleMode.textContent = "Sign up";
    } else {
        formTitle.textContent = 'Create an account';
        formSubtitle.textContent = 'Enter your email to sign up';
        submitBtn.textContent = 'Sign up with email';
        toggleText.firstChild.textContent = "Already have an account? ";
        toggleMode.textContent = "Sign in";
    }
    isSignUpMode = !isSignUpMode;
    passwordGroup.style.display = 'none';
    emailInput.value = '';
    passwordInput.value = '';
    hideError(emailInput, emailError);
    hideError(passwordInput, passwordError);
});

// 密碼顯示/隱藏切換
togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.textContent = type === 'password' ? '顯示' : '隱藏';
});

// Email 輸入驗證
emailInput.addEventListener('input', () => {
    hideError(emailInput, emailError);
});

emailInput.addEventListener('blur', () => {
    if (emailInput.value && !validateEmail(emailInput.value)) {
        showError(emailInput, emailError);
    }
});

// 密碼輸入驗證
passwordInput.addEventListener('input', () => {
    hideError(passwordInput, passwordError);
});

// 表單提交
emailForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();

    // 驗證 Email
    if (!validateEmail(email)) {
        showError(emailInput, emailError);
        return;
    }

    // 如果密碼欄位已顯示，驗證密碼
    if (passwordGroup.style.display !== 'none') {
        const password = passwordInput.value;

        if (!validatePassword(password)) {
            showError(passwordInput, passwordError);
            return;
        }

        // 執行註冊或登入
        if (isSignUpMode) {
            fetch('/api/auth/SignUp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email:email, password:password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        showSuccess('註冊成功！正在登入...');
                        setTimeout(() => {
                            login(email);
                        }, 1500);
                    } else {
                        alert(data.error || data);
                    }
                })
                .catch(err => alert(err));
        } else {
            fetch('api/auth/login',{
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email:email, password:password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        showSuccess('登入成功...');
                        setTimeout(() => {
                            login(email);
                        }, 1000);
                    } else {
                        alert(data.error || data);
                    }
                })
        }
    } else {
        // 顯示密碼輸入欄位
        passwordGroup.style.display = 'block';
        passwordInput.focus();
    }
});

// Google 登入
// googleBtn.addEventListener('click', () => {
//     showSuccess('使用Google登入成功！');
//     setTimeout(() => {
//         login('google.user@gmail.com');
//     }, 1000);
// });

// 登入函數
function login(email) {
    currentUser = email;
    authForm.classList.remove('show');
    authForm.style.display = 'none';
    alert("sucess login, redirecting to home page");
    window.location.href = "../homePage.html";
}

// 登出
logoutBtn.addEventListener('click', () => {
    currentUser = null;
    authForm.style.display = 'block';
    emailInput.value = '';
    passwordInput.value = '';
    passwordGroup.style.display = 'none';
    hideError(emailInput, emailError);
    hideError(passwordInput, passwordError);
    showSuccess('已成功登出！');
});

// Terms of Service 連結
document.getElementById('termsLink').addEventListener('click', (e) => {
    e.preventDefault();
    alert('服務條款\n\n1. 用戶需年滿18歲\n2. 禁止拍賣違法物品\n3. 交易需遵守平台規範\n4. 保護個人資料安全');
});

// Privacy Policy 連結
document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    alert('隱私政策\n\n我們重視您的隱私：\n1. 收集必要的個人資訊\n2. 不會出售用戶資料\n3. 使用加密技術保護資料\n4. 遵守相關法律規範');
});

