const express = require("express");
const router = express.Router();

// Example route to test
router.get("/", (req, res) => {
  res.json({ message: "Auction route working!" });
});

module.exports = router;
