const mongoose = require("mongoose");

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    startingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    currentBid: {
      type: Number,
      default: 0,
      min: 0,
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // make sure you have a User model later
      default: null,
    },
    startTime: {
      type: Date,
      default: Date.now, // automatically sets start time to "now"
    },
    endTime: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt
  }
);

// Optional: automatically deactivate auction if expired
auctionSchema.pre("save", function (next) {
  if (this.endTime < Date.now()) {
    this.isActive = false;
  }
  next();
});

module.exports = mongoose.model("Auction", auctionSchema);
