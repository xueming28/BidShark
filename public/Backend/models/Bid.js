const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bidSchema = new Schema(
    {
        auction: { type: Schema.Types.ObjectId, ref: "Auction", required: true },
        bidder: { type: Schema.Types.ObjectId, ref: "User", required: false },
        amount: { type: Number, required: true, min: 0 },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Bid", bidSchema);
