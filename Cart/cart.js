// 購物車資料（使用記憶體儲存）
let cartData = [];
let wonItems = []; // 儲存競標成功的商品

// 初始化購物車資料
function initCartData() {
    cartData = [];
    wonItems = [];
}

// 新增競標成功的商品到購物車
function addWonItem(item) {
    const existingItem = wonItems.find(i => i.id === item.id);
    
    if (!existingItem) {
        const wonItem = {
            id: item.id,
            seller: item.seller || "Seller Name",
            productName: item.productName || item.name,
            itemLabel: item.itemLabel || "Item",
            imageUrl: item.imageUrl || "",
            imageColor: item.imageColor || "pink",
            unitPrice: item.finalPrice || item.price || item.unitPrice,
            quantity: item.quantity || 1,
            biddedDate: new Date().toISOString(),
            wonDate: new Date().toISOString(),
            isWon: true,
            shippingThreshold: item.shippingThreshold || 390,
            currentShipping: item.currentShipping || 0
        };
        
        wonItems.push(wonItem);
        cartData.push(wonItem);
        
        console.log('商品已加入購物車:', wonItem);
    }
    
    initCart();
}

// 新增競標中的商品（暫時不顯示在購物車）
function addBiddingItem(item) {
    console.log('商品競標中，尚未加入購物車:', item);
}

// 移除競標失敗的商品
function removeLostItem(itemId) {
    wonItems = wonItems.filter(i => i.id !== itemId);
    cartData = cartData.filter(i => i.id !== itemId);
    
    console.log('競標失敗，商品已從購物車移除:', itemId);
    
    initCart();
}

// 初始化購物車
function initCart() {
    if (wonItems.length === 0) {
        showEmptyCart();
    } else {
        renderCartItems();
        updateCartSummary();
        initEventListeners();
    }
}

// 顯示空購物車
function showEmptyCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const tableHeader = document.querySelector('.table-header');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (cartItemsContainer) cartItemsContainer.style.display = 'none';
    if (tableHeader) tableHeader.style.display = 'none';
    if (emptyCart) {
        emptyCart.style.display = 'block';
        emptyCart.innerHTML = '<div style="text-align: center; padding: 60px 20px; color: #999;"><div style="font-size: 48px; margin-bottom: 20px;">🛒</div><h3 style="margin-bottom: 10px;">購物車是空的</h3><p>尚未有競標成功的商品</p></div>';
    }
    if (cartSummary) cartSummary.style.display = 'none';
}

// 渲染購物車商品
function renderCartItems() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    
    const sortedData = wonItems.slice().sort((a, b) => 
        new Date(b.wonDate) - new Date(a.wonDate)
    );
    
    const groupedBySeller = {};
    sortedData.forEach(item => {
        const seller = item.seller;
        if (!groupedBySeller[seller]) {
            groupedBySeller[seller] = [];
        }
        groupedBySeller[seller].push(item);
    });
    
    for (const seller in groupedBySeller) {
        const items = groupedBySeller[seller];
        const sellerGroup = document.createElement('div');
        sellerGroup.className = 'seller-group';
        
        let sellerTotal = 0;
        items.forEach(item => {
            sellerTotal += item.unitPrice * item.quantity;
        });
        
        const shippingThreshold = items[0].shippingThreshold || 390;
        const needAmount = Math.max(0, shippingThreshold - sellerTotal);
        
        const shippingText = needAmount > 0 
            ? '<span style="color: #ff4d4f;">📦 已滿$' + shippingThreshold + '，運費$0</span><span style="color: #666;">還差 $' + needAmount + '</span>'
            : '<span style="color: #52c41a;">✓ 已滿$' + shippingThreshold + '，運費$0</span>';
        
        const sellerHeader = '<div class="seller-header" style="background: #f5f5f5; padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 12px;"><input type="checkbox" class="seller-checkbox" data-seller="' + seller + '"><span style="font-weight: 600;">' + seller + '</span><span style="color: #666; font-size: 14px;">' + formatDate(items[0].wonDate) + '</span></div><div class="shipping-info" style="display: flex; align-items: center; gap: 8px; font-size: 14px;">' + shippingText + '</div></div>';
        
        sellerGroup.innerHTML = sellerHeader;
        
        items.forEach(item => {
            const imageContent = item.imageUrl 
                ? '<img src="' + item.imageUrl + '" alt="' + item.productName + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">'
                : item.itemLabel;
            
            const cartItemHTML = '<div class="cart-item" data-item-id="' + item.id + '" style="display: grid; grid-template-columns: 40px 1fr 120px 150px 120px 40px; gap: 16px; align-items: center; padding: 16px; border-bottom: 1px solid #f0f0f0;"><input type="checkbox" class="item-checkbox-input" data-item-id="' + item.id + '"><div class="item-info" style="display: flex; gap: 12px; align-items: center;"><div class="item-image" style="width: 80px; height: 80px; background: ' + item.imageColor + '; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + imageContent + '</div><div class="item-details"><div style="font-weight: 500; margin-bottom: 4px;">' + item.productName + '</div><div style="color: #999; font-size: 14px;">競標成功</div></div></div><div class="price" style="text-align: center; font-weight: 600;">$' + item.unitPrice + '</div><div class="quantity-control" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><button class="qty-decrease" data-item-id="' + item.id + '" style="width: 32px; height: 32px; border: 1px solid #d9d9d9; background: white; border-radius: 4px; cursor: pointer; font-size: 18px;">−</button><input type="number" value="' + item.quantity + '" min="1" class="qty-input" data-item-id="' + item.id + '" style="width: 50px; text-align: center; border: 1px solid #d9d9d9; border-radius: 4px; height: 32px;"><button class="qty-increase" data-item-id="' + item.id + '" style="width: 32px; height: 32px; border: 1px solid #d9d9d9; background: white; border-radius: 4px; cursor: pointer; font-size: 18px;">+</button></div><div class="total-price" style="text-align: center; font-weight: 600; color: #ff4d4f;">$' + (item.unitPrice * item.quantity).toLocaleString() + '</div><button class="remove-btn" data-item-id="' + item.id + '" style="width: 32px; height: 32px; border: none; background: none; cursor: pointer; font-size: 24px; color: #999;">×</button></div>';
            
            sellerGroup.innerHTML += cartItemHTML;
        });
        
        cartItemsContainer.appendChild(sellerGroup);
    }
    
    const tableHeader = document.querySelector('.table-header');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.querySelector('.cart-summary');
    
    if (cartItemsContainer) cartItemsContainer.style.display = 'block';
    if (tableHeader) tableHeader.style.display = 'grid';
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
}

// 格式化日期顯示
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return '今天競標成功';
    } else if (diffDays === 1) {
        return '昨天競標成功';
    } else if (diffDays < 7) {
        return diffDays + ' 天前競標成功';
    } else {
        return date.toLocaleDateString('zh-TW') + ' 競標成功';
    }
}

// 更新購物車摘要
function updateCartSummary() {
    const summaryContainer = document.querySelector('.cart-summary');
    if (!summaryContainer) return;
    
    const total = getCartTotal();
    const itemCount = getCartItemCount();
    const shipping = calculateShipping();
    const discount = calculateDiscount();
    const finalTotal = total + shipping - discount;
    
    const shippingText = shipping === 0 ? '免運' : '$' + shipping;
    
    summaryContainer.innerHTML = '<div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span>合計 (' + itemCount + ' 件商品)</span><span style="font-weight: 600;">$' + total.toLocaleString() + '</span></div><div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666;"><span>運費</span><span>' + shippingText + '</span></div><div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #999; font-size: 14px;"><span>折扣</span><span>-$' + discount + '</span></div><hr style="margin: 16px 0; border: none; border-top: 1px solid #f0f0f0;"><div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 600; color: #ff4d4f;"><span>總計</span><span>$' + finalTotal.toLocaleString() + '</span></div><button onclick="checkout()" style="width: 100%; margin-top: 20px; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">結帳 (' + itemCount + ')</button></div>';
}

// 計算運費
function calculateShipping() {
    const groupedBySeller = {};
    
    wonItems.forEach(item => {
        const seller = item.seller;
        if (!groupedBySeller[seller]) {
            groupedBySeller[seller] = { total: 0, threshold: item.shippingThreshold || 390 };
        }
        groupedBySeller[seller].total += item.unitPrice * item.quantity;
    });
    
    let totalShipping = 0;
    for (const seller in groupedBySeller) {
        const group = groupedBySeller[seller];
        if (group.total < group.threshold) {
            totalShipping += 60;
        }
    }
    
    return totalShipping;
}

// 計算折扣
function calculateDiscount() {
    return 50;
}

// 增加數量
function increaseQuantity(itemId) {
    const item = wonItems.find(i => i.id === itemId);
    if (item) {
        item.quantity++;
        updateItemDisplay(itemId);
        updateCartSummary();
    }
}

// 減少數量
function decreaseQuantity(itemId) {
    const item = wonItems.find(i => i.id === itemId);
    if (item && item.quantity > 1) {
        item.quantity--;
        updateItemDisplay(itemId);
        updateCartSummary();
    }
}

// 更新數量（手動輸入）
function updateQuantity(itemId, newQuantity) {
    const item = wonItems.find(i => i.id === itemId);
    if (item && newQuantity >= 1) {
        item.quantity = parseInt(newQuantity);
        updateItemDisplay(itemId);
        updateCartSummary();
    }
}

// 更新商品顯示
function updateItemDisplay(itemId) {
    const item = wonItems.find(i => i.id === itemId);
    if (item) {
        const cartItem = document.querySelector('.cart-item[data-item-id="' + itemId + '"]');
        if (!cartItem) return;
        
        const qtyInput = cartItem.querySelector('.qty-input');
        const totalPrice = cartItem.querySelector('.total-price');
        
        if (qtyInput) qtyInput.value = item.quantity;
        if (totalPrice) totalPrice.textContent = '$' + (item.unitPrice * item.quantity).toLocaleString();
    }
}

// 刪除商品
function removeItem(itemId) {
    if (confirm('確定要從購物車移除此商品嗎？')) {
        wonItems = wonItems.filter(i => i.id !== itemId);
        cartData = cartData.filter(i => i.id !== itemId);
        
        if (wonItems.length === 0) {
            showEmptyCart();
        } else {
            renderCartItems();
            updateCartSummary();
            initEventListeners();
        }
    }
}

// 清空購物車
function clearCart() {
    if (confirm('確定要清空所有商品嗎？')) {
        wonItems = [];
        cartData = [];
        showEmptyCart();
    }
}

// 結帳
function checkout() {
    const checkboxes = document.querySelectorAll('.item-checkbox-input');
    const selectedItems = [];
    
    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked && wonItems[index]) {
            selectedItems.push(wonItems[index]);
        }
    });
    
    if (selectedItems.length === 0) {
        alert('請選擇要結帳的商品');
        return;
    }
    
    let total = 0;
    selectedItems.forEach(item => {
        total += item.unitPrice * item.quantity;
    });
    
    console.log('結帳商品:', selectedItems);
    alert('即將結帳 ' + selectedItems.length + ' 件商品，總金額: $' + total);
}

// 取得購物車商品數量
function getCartItemCount() {
    let total = 0;
    wonItems.forEach(item => {
        total += item.quantity;
    });
    return total;
}

// 取得購物車總金額
function getCartTotal() {
    let total = 0;
    wonItems.forEach(item => {
        total += item.unitPrice * item.quantity;
    });
    return total;
}

// 初始化事件監聽器
function initEventListeners() {
    const increaseButtons = document.querySelectorAll('.qty-increase');
    increaseButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.getAttribute('data-item-id'));
            increaseQuantity(itemId);
        });
    });
    
    const decreaseButtons = document.querySelectorAll('.qty-decrease');
    decreaseButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.getAttribute('data-item-id'));
            decreaseQuantity(itemId);
        });
    });
    
    const qtyInputs = document.querySelectorAll('.qty-input');
    qtyInputs.forEach(input => {
        input.addEventListener('change', function() {
            const itemId = parseInt(this.getAttribute('data-item-id'));
            const newQuantity = parseInt(this.value);
            updateQuantity(itemId, newQuantity);
        });
    });
    
    const removeButtons = document.querySelectorAll('.remove-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = parseInt(this.getAttribute('data-item-id'));
            removeItem(itemId);
        });
    });
    
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.seller-checkbox, .item-checkbox-input');
            const isChecked = this.checked;
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
            });
        });
    }
    
    const sellerCheckboxes = document.querySelectorAll('.seller-checkbox');
    sellerCheckboxes.forEach(sellerCb => {
        sellerCb.addEventListener('change', function() {
            const seller = this.getAttribute('data-seller');
            const isChecked = this.checked;
            const sellerGroup = this.closest('.seller-group');
            if (sellerGroup) {
                const itemCheckboxes = sellerGroup.querySelectorAll('.item-checkbox-input');
                itemCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
            }
        });
    });
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initCartData();
    initCart();
});

// 匯出函數供 AuctionItem 頁面使用
window.cartFunctions = {
    addWonItem: addWonItem,
    addBiddingItem: addBiddingItem,
    removeLostItem: removeLostItem,
    removeItem: removeItem,
    clearCart: clearCart,
    getCartItemCount: getCartItemCount,
    getCartTotal: getCartTotal,
    wonItems: wonItems,
    checkout: checkout
};
document.querySelector('.filter-button').addEventListener('click', (e) => {
    document.querySelector('.filter-content').classList.toggle("show");
})
window.onclick = function(event) {
    if (!event.target.closest('.filter-button')&& !event.target.closest('.filter-content')) {
        var dropdowns = document.getElementsByClassName("filter-content");
        for (let i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
};