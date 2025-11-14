const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const bcrypt = require("bcryptjs");


dotenv.config();
connectDB();

const app = express();
app.use(express.json());
mongoose.connect("mongodb://127.0.0.1:27017/haida_auction", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));
app.use(
    cors({
        origin: process.env.ORIGIN,
        method:["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);
app.get("/", (req, res) => {
    res.send("Server is running...");
});
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/auctions", require("./routes/auctionRoutes"));
app.use("/api/bids", require("./routes/bidRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
