import expressPkg from "express";
import { ObjectId } from "mongodb";
import { connectDB } from './ConnectToDB.js';
import { settleAuction } from './auctionService.js'; 
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
    try {
        // 1. 檢查使用者是否登入
        const userId = req.session?.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = await connectDB();
        const deals = db.collection('deal');

        const result = await deals.aggregate([
            {
                $match: { 
                    buyerId: new ObjectId(userId) 
                }
            },
            {
                $lookup: {
                    from: 'auctionItems',
                    localField: 'itemId',
                    foreignField: '_id',
                    as: 'auctionItem'
                }
            },
            {
                $sort: { purchaseDate: -1 }
            }
        ]).toArray();

        return res.status(200).json(result);

    } catch (err) {
        console.error("Get deals error:", err);
        return res.status(500).json({ error: 'Server Error' });
    }
});

DBreader.get('/getAllBid', async(req, res) => {
    try {
        const db = await connectDB();
        const bid = db.collection('Bid');
        
        // 2. 執行聚合查詢
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

        const now = new Date();
        const settlePromises = [];

        for (const record of result) {
            // 取出關聯的商品
            const item = record.auctionItem?.[0];
            
            // 如果商品存在、狀態是 active、且時間已過期
            if (item && item.status === 'active' && new Date(item.endTime) <= now) {
                console.log(`Triggering settlement for expired item: ${item.title}`);
                // 將結算任務加入 Promise 陣列 (不等待它完成，避免 API 回應太慢)
                settlePromises.push(settleAuction(item._id.toString()));
            }
        }

        // 等待所有結算嘗試完成 (這會確保聊天室建立和購物車寫入完成)
        if (settlePromises.length > 0) {
            await Promise.all(settlePromises);
        }

        // 回傳結果
        return res.status(200).json(result);

    } catch (err) {
        console.error("Error in getAllBid:", err);
        return res.status(500).json({ error: 'Server error' });
    }
});

export default DBreader;