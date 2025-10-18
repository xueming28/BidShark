const express = require("express");
const router = express.Router();

// Example GET route — http://localhost:5000/api/users
router.get("/", (req, res) => {
  res.json({ message: "User route working!" });
});

module.exports = router;
