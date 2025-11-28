import * as sideBar from './sideBar.js';

fetch('sideBar.html')
    .then(res => res.text())
    .then(html => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.innerHTML = html;
            const links = sidebar.querySelectorAll('a.nav-item');
            const currentPage = window.location.pathname.split('/').pop() || 'seller.html';
            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                }
            });
            sideBar.collapse();
        }
    });

document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('itemUploadForm');
    const fileInput = document.getElementById('itemImage');
    const uploadLabel = document.querySelector('.file-upload-label');

    // 圖片預覽
    fileInput?.addEventListener('change', () => {
        if (!uploadLabel) return;
        // 清除舊預覽
        uploadLabel.querySelectorAll('.preview').forEach(el => el.remove());

        const files = fileInput.files;
        if (files.length > 5) {
            alert('You can only upload maximum 5 pictures.');
            fileInput.value = '';
            return;
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = e => {
                const div = document.createElement('div');
                div.className = 'preview';
                div.style.cssText = 'display:inline-block;margin:5px;position:relative;';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width:90px;height:90px;object-fit:cover;border-radius:8px;';
                div.appendChild(img);
                uploadLabel.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });

    // 表單提交
    uploadForm?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = document.querySelector('.btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';
        }

        const formData = new FormData(uploadForm);

        try {
            const response = await fetch('/api/data/auctions/create', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                alert('Auction item uploaded successfull!');
                uploadForm.reset();
                if (uploadLabel) {
                    uploadLabel.querySelectorAll('.preview').forEach(el => el.remove());
                }
                // 可選：跳轉到我的拍賣品頁面
                // window.location.href = '/myItems.html';
            } else {
                alert('Upload Failed：' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Network error. Please check if you are logged in or try again later.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Start Auction';
            }
        }
    });
});