import expressPkg from "express";
import { ObjectId } from "mongodb";
import { connectDB } from './ConnectToDB.js';
import session from "express-session";
const { Router } = expressPkg;
const DBreader = Router();

DBreader.get('/getUserfromID/:id', async(req, res) => {
    const db = await connectDB();
    const users = db.collection('Users');
    const target = await users.findOne({ _id: new ObjectId(req.params.id) });
    if (!target) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({email: target.email, name: target.name, image: target.image});
});
DBreader.get('/getAllDeals', async(req, res) => {
    const db = await connectDB();
    const deals = db.collection('deal');
    const result = await deals.aggregate([
        {
            $lookup: {
                from: 'auctionItems',
                localField: 'itemId',
                foreignField: '_id',
                as: 'auctionItem'
            }
        }
    ]).toArray();
    return res.status(200).json(result);
});

DBreader.get('/getAllBid', async(req, res) => {
    const db = await connectDB();
    const bid = db.collection('Bid');
    const result = await bid.aggregate([
        {
            $lookup: {
                from: 'auctionItems',
                localField: 'itemId',
                foreignField: '_id',
                as: 'auctionItem'
            }
        }
    ]).toArray();
    return res.status(200).json(result);
});
export default DBreader;