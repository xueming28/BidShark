document.addEventListener("DOMContentLoaded", () => {
  const bidInput = document.getElementById("bidAmount");
  const placeBidBtn = document.getElementById("placeBidBtn");
  const highestBidDisplay = document.getElementById("highestBid");
  const notice = document.getElementById("bidNotice");
  const buyoutBtn = document.getElementById("buyoutBtn");

  // 從頁面文字讀取實際金額，例如 "$110,000"
  let highestBid = parseInt(
    highestBidDisplay.textContent.replace(/[^0-9]/g, "")
  );
  if (isNaN(highestBid)) highestBid = 0; // 預防讀取錯誤

  // 點擊出價按鈕
  placeBidBtn.addEventListener("click", () => {
    const bid = parseInt(bidInput.value);

    if (isNaN(bid)) {
      notice.textContent = "Please enter a valid number!";
      notice.style.color = "#e63946";
      return;
    }

    if (bid > highestBid) {
      highestBid = bid;
      highestBidDisplay.textContent = `$${highestBid.toLocaleString()}`;
      notice.textContent = "Bid placed successfully!";
      notice.style.color = "#007b00";
    } else {
      notice.textContent = "Your bid must be higher than the current highest bid!";
      notice.style.color = "#e63946";
    }
  });

  // 點擊立即購買按鈕
  buyoutBtn.addEventListener("click", () => {
    notice.textContent = "🎉 Congratulations! You bought this item instantly!";
    notice.style.color = "#007b00";
  });
});
