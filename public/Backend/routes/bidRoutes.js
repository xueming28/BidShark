const express = require("express");
const router = express.Router();
const Bid = require("../models/Bid");
const Auction = require("../models/Auction");

// ✅ Place a new bid
router.post("/place", async (req, res) => {
  try {
    const { auctionId, amount, bidder } = req.body;

    // Validate input
    if (!auctionId || !amount) {
      return res.status(400).json({ msg: "auctionId and amount are required" });
    }

    // Find the auction
    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ msg: "Auction not found" });

    // Check if auction is still active
    if (new Date() > auction.endTime) {
      return res.status(400).json({ msg: "Auction has ended" });
    }

    // Check if bid is higher than current bid
    if (amount <= auction.currentBid) {
      return res.status(400).json({ msg: "Bid must be higher than current bid" });
    }

    // Create new bid
    const newBid = new Bid({
      auction: auctionId,
      bidder: bidder || null,
      amount,
    });
    await newBid.save();

    // Update auction’s current bid
    auction.currentBid = amount;
    auction.highestBidder = bidder || null;
    await auction.save();

    res.status(201).json({ msg: "Bid placed successfully", bid: newBid });
  } catch (error) {
    console.error("Error placing bid:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get all bids for a specific auction
router.get("/:auctionId", async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.auctionId })
      .populate("auction")
      .sort({ createdAt: -1 });

    res.status(200).json(bids);
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
