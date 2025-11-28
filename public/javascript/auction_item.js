import * as sideBar from './sideBar.js';

// 載入側邊欄
fetch('sideBar.html')
  .then(res => res.text())
  .then(html => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.innerHTML = html;
      const links = sidebar.querySelectorAll('a.nav-item');
      const currentPage = location.pathname.split('/').pop() || 'auction_item.html';
      links.forEach(link => {
        if (link.getAttribute('href') === currentPage) link.classList.add('active');
      });
      sideBar.collapse();
    }
  });

// 取得 URL 參數
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');
if (!itemId) {
  alert('找不到商品');
  location.href = 'homePage.html';
}

let itemData = null;
let timer = null;

const elements = {
  mainImage: document.getElementById('mainImage'),
  gallery: document.getElementById('gallery'),
  itemTitle: document.getElementById('itemTitle'),
  itemDesc: document.getElementById('itemDesc'),
  sellerName: document.getElementById('sellerName'),
  startBid: document.getElementById('startBid'),
  highestBid: document.getElementById('highestBid'),
  timeRemaining: document.getElementById('timeRemaining'),
  bidAmount: document.getElementById('bidAmount'),
  placeBidBtn: document.getElementById('placeBidBtn'),
  bidNotice: document.getElementById('bidNotice')
};

// 載入商品詳細資料
async function loadItem() {
  try {
    const res = await fetch(`/api/data/auctions/${itemId}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Loading failed');

    itemData = data.item;

    // 基本資訊
    elements.itemTitle.textContent = itemData.title;
    elements.itemDesc.textContent = itemData.description || 'No Description';
    elements.startBid.textContent = `NT$${itemData.startPrice}`;
    elements.highestBid.textContent = `NT$${itemData.currentPrice}`;
    elements.bidAmount.min = itemData.currentPrice + 10;
    elements.bidAmount.value = itemData.currentPrice + 10;

    // 賣家名稱（從 Users 拿
    const userRes = await fetch(`/api/data/user/${itemData.sellerId}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      elements.sellerName.textContent = userData.name || 'Anonymous';
    } else {
      elements.sellerName.textContent = 'Unknown seller';
    }

    // 圖片
    if (itemData.images && itemData.images.length > 0) {
      elements.mainImage.src = itemData.images[0];
      itemData.images.forEach((img, i) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.className = 'thumb';
        if (i === 0) thumb.classList.add('active');
        thumb.onclick = () => {
          elements.mainImage.src = img;
          document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        };
        elements.gallery.appendChild(thumb);
      });
    } else {
      elements.mainImage.src = '/Image/default-item.jpg';
    }

    // 開始倒數
    startCountdown(itemData.endTime);

  } catch (err) {
    console.error(err);
    elements.itemTitle.textContent = 'Product loading failed.';
  }
}

// 倒數計時
function startCountdown(endTimeStr) {
  const endTime = new Date(endTimeStr).getTime();

  timer = setInterval(() => {
    const now = new Date().getTime();
    const diff = endTime - now;

    if (diff <= 0) {
      elements.timeRemaining.textContent = 'The auction has ended.';
      elements.timeRemaining.style.color = '#e63946';
      elements.placeBidBtn.disabled = true;
      clearInterval(timer);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let text = '';
    if (days > 0) text += `${days}D `;
    if (hours > 0) text += `${hours}H `;
    text += `${minutes}M ${seconds}S`;

    elements.timeRemaining.textContent = text;

    // 最後 10 分鐘變橘色
    if (diff < 10 * 60 * 1000) {
      elements.timeRemaining.style.color = '#ff8c00';
    }
  }, 1000);
}

// 出價
elements.placeBidBtn.addEventListener('click', async () => {
    const bidValue = elements.bidAmount.value.trim();
    if (!bidValue || isNaN(bidValue) || Number(bidValue) <= 0) {
        elements.bidNotice.textContent = 'Please enter valid amount.';
        elements.bidNotice.style.color = '#e63946';
        return;
    }

    const bid = Number(bidValue);

    try {
        const res = await fetch(`/api/data/auctions/${itemId}/bid`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: bid })
        });

        const result = await res.json();

        if (result.success) {
            // 立即更新畫面
            itemData.currentPrice = result.newPrice || bid;
            elements.highestBid.textContent = `NT$${itemData.currentPrice}`;
            elements.bidAmount.value = itemData.currentPrice + 10;
            elements.bidAmount.min = itemData.currentPrice + 10;

            elements.bidNotice.textContent = result.message || 'Bid successful！';
            elements.bidNotice.style.color = '#007b00';
        } else {
            elements.bidNotice.textContent = result.message;
            elements.bidNotice.style.color = '#e63946';
        }
    } catch (err) {
        elements.bidNotice.textContent = 'Network error, please try again.';
        elements.bidNotice.style.color = '#e63946';
    }
});
// 啟動
document.addEventListener('DOMContentLoaded', loadItem);