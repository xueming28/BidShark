import * as sideBar from './sideBar.js';

fetch('sideBar.html').then(r=>r.text()).then(html=>{
  const sidebar = document.getElementById('sidebar');
  if(sidebar){ sidebar.innerHTML = html; sideBar.collapse(); }
});

const params = new URLSearchParams(window.location.search);
const itemId = params.get('id');
if (!itemId) {
  document.getElementById('statusMsg').textContent = 'Missing item id';
}

const titleEl = document.getElementById('title');
const descEl = document.getElementById('description');
const imagesEl = document.getElementById('images');
const existingImgWrap = document.getElementById('existingImages');
const startPriceEl = document.getElementById('startPrice');
const extendDaysEl = document.getElementById('extendDays');
const priceEl = document.getElementById('price');
const stockEl = document.getElementById('stock');
const auctionFields = document.getElementById('auctionFields');
const directSaleFields = document.getElementById('directSaleFields');
const statusMsg = document.getElementById('statusMsg');

let currentItem = null;
async function load() {
  try {
    const res = await fetch(`/api/data/auctions/${itemId}/edit`, { credentials: 'include' });
    const data = await res.json();
    if (!data.success) {
      statusMsg.textContent = data.message || 'Failed to load';
      return;
    }
    currentItem = data.item;
    const bidsCount = data.bidsCount || 0;
    const isOwner = !!data.isOwner;

    if (!isOwner) {
      statusMsg.textContent = 'You are not the owner of this item';
      document.getElementById('editForm').style.display = 'none';
      return;
    }

    titleEl.value = currentItem.title || '';
    descEl.value = currentItem.description || '';

    // show correct fields
    if (currentItem.dSale) {
      auctionFields.style.display = 'none';
      directSaleFields.style.display = 'block';
      priceEl.value = currentItem.price ?? '';
      stockEl.value = currentItem.stock ?? '';
    } else {
      auctionFields.style.display = 'block';
      directSaleFields.style.display = 'none';
      startPriceEl.value = currentItem.price ?? '';
    }

    // render existing images (read-only if bids exist)
    existingImgWrap.innerHTML = '';
    (currentItem.images || []).forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'thumb';
      img.title = `Image ${i+1}`;
      existingImgWrap.appendChild(img);
    });

    // enforce restrictions when bids exist
    if (bidsCount > 0) {
      statusMsg.textContent = `Item has ${bidsCount} bid(s). You can only update description and add photos.`;
      titleEl.disabled = true;
      startPriceEl.disabled = true;
      extendDaysEl.disabled = true;
      priceEl.disabled = true;
      stockEl.disabled = true;
    } else {
      statusMsg.textContent = 'No bids yet — full edit allowed (can replace images).';
    }
  } catch (e) {
    console.error(e);
    statusMsg.textContent = 'Error loading item';
  }
}

document.getElementById('editForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!confirm('Save changes?')) return;

  const fd = new FormData();
  // Only send fields present; server will validate
  if (!titleEl.disabled && titleEl.value) fd.set('title', titleEl.value);
  if (descEl.value) fd.set('description', descEl.value);

  if (!startPriceEl.disabled && startPriceEl.value) fd.set('startPrice', startPriceEl.value);
  if (!extendDaysEl.disabled && extendDaysEl.value) fd.set('extendDays', extendDaysEl.value);

  if (!priceEl.disabled && priceEl.value) fd.set('price', priceEl.value);
  if (!stockEl.disabled && stockEl.value) fd.set('stock', stockEl.value);

  // append files if any (input name is itemImage matching server multer)
  const files = imagesEl.files;
  for (let i=0;i<files.length;i++) {
    fd.append('itemImage', files[i]);
  }

  try {
    const res = await fetch(`/api/data/auctions/${itemId}/edit`, {
      method: 'POST',
      credentials: 'include',
      body: fd
    });

    const data = await res.json();
    if (data.success) {
      alert('Saved');
      window.location.href = `auctionItem.html?id=${itemId}`;
    } else {
      alert('Failed: ' + (data.message || 'unknown'));
    }
  } catch (e) {
    console.error(e);
    alert('Request failed');
  }
});

load();