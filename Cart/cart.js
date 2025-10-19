// 模擬購物車資料（從 localStorage 讀取或使用預設資料）
let cartData = [];

// 從 localStorage 載入購物車資料
function loadCartData() {
    const savedCart = localStorage.getItem('biddedItems');
    if (savedCart) {
        cartData = JSON.parse(savedCart);
    } else {
        // 預設測試資料
        cartData = [
            {
                id: 1,
                seller: "Seller Name",
                productName: "Product name",
                itemLabel: "Item 1",
                imageColor: "pink",
                unitPrice: 100,
                quantity: 1,
                biddedDate: new Date().toISOString()
            },
            {
                id: 2,
                seller: "Seller Name",
                productName: "Product name",
                itemLabel: "Item 2",
                imageColor: "yellow",
                unitPrice: 100,
                quantity: 1,
                biddedDate: new Date().toISOString()
            },
            {
                id: 3,
                seller: "Seller Name",
                productName: "Product name",
                itemLabel: "Item 3",
                imageColor: "pink",
                unitPrice: 100,
                quantity: 1,
                biddedDate: new Date().toISOString()
            }
        ];
        saveCartData();
    }
}

// 儲存購物車資料到 localStorage
function saveCartData() {
    localStorage.setItem('biddedItems', JSON.stringify(cartData));
}

// 新增 bidded item 到購物車
function addBiddedItem(item) {
    // 檢查是否已存在
    const existingItem = cartData.find(i => i.id === item.id);
    
    if (existingItem) {
        // 如果已存在，更新數量
        existingItem.quantity += item.quantity || 1;
        existingItem.biddedDate = new Date().toISOString();
    } else {
        // 新增項目
        cartData.push({
            ...item,
            quantity: item.quantity || 1,
            biddedDate: new Date().toISOString()
        });
    }
    
    saveCartData();
    initCart();
}

// 初始化購物車
function initCart() {
    loadCartData();
    
    if (cartData.length === 0) {
        showEmptyCart();
    } else {
        renderCartItems();
        initEventListeners();
    }
}

// 顯示空購物車
function showEmptyCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const tableHeader = document.querySelector('.table-header');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (tableHeader) tableHeader.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
}

// 渲染購物車商品
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    
    // 按照 bidded 日期排序（最新的在前）
    const sortedData = [...cartData].sort((a, b) => 
        new Date(b.biddedDate) - new Date(a.biddedDate)
    );
    
    sortedData.forEach((item) => {
        const cartItemHTML = `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="seller-name">
                    <input type="checkbox" class="seller-checkbox" data-item-id="${item.id}">
                    ${item.seller}
                    <span class="bidded-date">${formatDate(item.biddedDate)}</span>
                </div>
                <div class="item-content">
                    <div class="item-checkbox">
                        <input type="checkbox" class="item-checkbox-input" data-item-id="${item.id}">
                    </div>
                    <div class="item-info">
                        <div class="item-image ${item.imageColor}">${item.itemLabel}</div>
                        <div class="item-name">${item.productName}</div>
                    </div>
                    <div class="price">$${item.unitPrice}</div>
                    <div class="quantity-control">
                        <button class="qty-decrease" data-item-id="${item.id}">−</button>
                        <input type="number" value="${item.quantity}" min="1" class="qty-input" data-item-id="${item.id}">
                        <button class="qty-increase" data-item-id="${item.id}">+</button>
                    </div>
                    <div class="total-price">$${item.unitPrice * item.quantity}</div>
                    <button class="remove-btn" data-item-id="${item.id}">×</button>
                </div>
            </div>
        `;
        cartItemsContainer.innerHTML += cartItemHTML;
    });
    
    const tableHeader = document.querySelector('.table-header');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (tableHeader) tableHeader.style.display = 'grid';
    if (emptyCart) emptyCart.style.display = 'none';
}

// 格式化日期顯示
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString('zh-TW');
    }
}

// 增加數量
function increaseQuantity(itemId) {
    const item = cartData.find(i => i.id === itemId);
    if (item) {
        item.quantity++;
        updateItemDisplay(itemId);
        saveCartData();
    }
}

// 減少數量
function decreaseQuantity(itemId) {
    const item = cartData.find(i => i.id === itemId);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateItemDisplay(itemId);
        saveCartData();
    }
}

// 更新數量（手動輸入）
function updateQuantity(itemId, newQuantity) {
    const item = cartData.find(i => i.id === itemId);
    if (item && newQuantity >= 1) {
        item.quantity = parseInt(newQuantity);
        updateItemDisplay(itemId);
        saveCartData();
    }
}

// 更新商品顯示
function updateItemDisplay(itemId) {
    const item = cartData.find(i => i.id === itemId);
    if (item) {
        const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
        if (!cartItem) return;
        
        const qtyInput = cartItem.querySelector('.qty-input');
        const totalPrice = cartItem.querySelector('.total-price');
        
        if (qtyInput) qtyInput.value = item.quantity;
        if (totalPrice) totalPrice.textContent = `$${item.unitPrice * item.quantity}`;
    }
}

// 刪除商品
function removeItem(itemId) {
    if (confirm('確定要從購物車移除此商品嗎？')) {
        cartData = cartData.filter(i => i.id !== itemId);
        saveCartData();
        
        if (cartData.length === 0) {
            showEmptyCart();
        } else {
            renderCartItems();
            initEventListeners();
        }
    }
}

// 清空購物車
function clearCart() {
    if (confirm('確定要清空所有已競標商品嗎？')) {
        cartData = [];
        saveCartData();
        showEmptyCart();
    }
}

// 取得購物車商品數量
function getCartItemCount() {
    return cartData.reduce((total, item) => total + item.quantity, 0);
}

// 取得購物車總金額
function getCartTotal() {
    return cartData.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
}

// 初始化事件監聽器
function initEventListeners() {
    // 增加數量按鈕
    document.querySelectorAll('.qty-increase').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.dataset.itemId);
            increaseQuantity(itemId);
        });
    });
    
    // 減少數量按鈕
    document.querySelectorAll('.qty-decrease').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.dataset.itemId);
            decreaseQuantity(itemId);
        });
    });
    
    // 數量輸入框
    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('change', function() {
            const itemId = parseInt(this.dataset.itemId);
            const newQuantity = parseInt(this.value);
            updateQuantity(itemId, newQuantity);
        });
    });
    
    // 刪除按鈕
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.dataset.itemId);
            removeItem(itemId);
        });
    });
    
    // 全選功能
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.seller-checkbox, .item-checkbox-input');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    // 賣家選擇框控制商品選擇框
    document.querySelectorAll('.seller-checkbox').forEach(sellerCb => {
        sellerCb.addEventListener('change', function() {
            const itemId = this.dataset.itemId;
            const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
            if (cartItem) {
                const itemCb = cartItem.querySelector('.item-checkbox-input');
                if (itemCb) itemCb.checked = this.checked;
            }
        });
    });
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initCart();
    
    // 顯示購物車統計
    console.log('購物車商品數量:', getCartItemCount());
    console.log('購物車總金額:', getCartTotal());
});

// 匯出函數供其他頁面使用
window.cartFunctions = {
    addBiddedItem,
    removeItem,
    clearCart,
    getCartItemCount,
    getCartTotal,
    cartData
};