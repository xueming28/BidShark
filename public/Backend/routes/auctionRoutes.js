const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction"); 

router.post("/create", async (req, res) => {
  try {
    const { title, description, startingPrice, endTime } = req.body;

    if (!title || !startingPrice || !endTime) {
      return res.status(400).json({ msg: "Please enter all required fields" });
    }

    const newAuction = new Auction({
      title,
      description,
      startingPrice,
      endTime,
    });

    const savedAuction = await newAuction.save();
    res.status(201).json(savedAuction);
  } catch (error) {
    console.error("Error creating auction:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find();
    res.status(200).json(auctions);
  } catch (error) {
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
