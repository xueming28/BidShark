import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.ts';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { ObjectId } from "mongodb";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const { Router } = expressPkg;
const dataRouter = Router();

// 處理 ESM 環境下的 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 設定：儲存圖片
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'item-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const pass = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
        cb(null, pass);
    }
}).array('itemImage', 5); // 最多 5 張圖片

// 更新個人資料
dataRouter.post('/updateUserInfo', async (req: Request, res: Response) => {
    try {
        if (!req.session?.user) {
            return res.status(400).json({ error: 'Not logged in' });
        }

        const { picture, name, email, phoneNumber } = req.body;
        const id = req.session.user.id;
        const db = await connectDB();
        const users = db.collection('Users');
        const target = await users.findOne({ _id: new ObjectId(id) });

        if (!target) return res.status(404).json({ error: 'User not found' });

        await users.updateOne(
            { _id: new ObjectId(id) },
            { $set: {
                image: picture || target.image,
                name: name || target.name,
                email: email || target.email,
            }}
        );

        if (phoneNumber) {
            await users.updateOne(
                { _id: new ObjectId(id) },
                { $set: { phone: phoneNumber } }
            );
        }

        // 更新 session
        req.session.user.name = name || req.session.user.name;
        req.session.user.email = email || req.session.user.email;
        req.session.user.image = picture || target.image;
        if (phoneNumber) req.session.user.phoneNumber = phoneNumber;

        return res.status(201).json({ status: 'success', message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// 建立新拍賣品
dataRouter.post('/auctions/create', (req: Request, res: Response) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error(err);
            return res.status(400).json({ success: false, message: err.message || 'Image upload failed' });
        }

        try {
            if (!req.session?.user?.id) {
                return res.status(401).json({ success: false, message: 'Please log in first' });
            }

            const files = req.files as Express.Multer.File[];
            const images = files?.map(file => `/uploads/${file.filename}`) || [];

            if (images.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one image is required' });
            }
            let result = null;
            if(req.body.mode === 'true'){
                const {
                    itemName,
                    itemDescription,
                    price,
                    stock,
                    category
                } = req.body;
                if (!itemName || !itemDescription || !price || !stock || !category) {
                    return res.status(400).json({success: false, message: ' Sale Mode: Missing required fields'});
                }
                const db = await connectDB();
                result = await db.collection('auctionItems').insertOne({
                    dSale: true,
                    sellerId: new ObjectId(req.session.user.id),
                    title: itemName.trim(),
                    description: itemDescription.trim(),
                    images,
                    price: price,
                    stock: stock,
                    category,
                    createdAt: new Date()
                });
            }else {
                const {
                    itemName,
                    itemDescription,
                    startPrice,
                    reservePrice,
                    duration,
                    category
                } = req.body;

                if (!itemName || !itemDescription || !startPrice || !duration || !category) {
                    return res.status(400).json({success: false, message: 'Auction Mode: Missing required fields'});
                }

                const endTime = new Date();
                endTime.setDate(endTime.getDate() + parseInt(duration));

                const db = await connectDB();

                result = await db.collection('auctionItems').insertOne({
                    dSale: false,
                    sellerId: new ObjectId(req.session.user.id),
                    title: itemName.trim(),
                    description: itemDescription.trim(),
                    images,
                    startPrice: Number(startPrice),
                    reservePrice: reservePrice ? Number(reservePrice) : null,
                    currentPrice: Number(startPrice),
                    endTime,
                    category,
                    status: 'active',
                    createdAt: new Date()
                });
            }
            res.json({
                success: true,
                message: 'Auction item created successfully!',
                itemId: result.insertedId
            });

        } catch (error: any) {
            console.error('Auction item creation failed:', error);
            res.status(500).json({ success: false, message: error.message || 'Server error' });
        }
    });
});

// 首頁：取得所有進行中的拍賣品
// ==============================
// GET ALL AUCTIONS
// ==============================
dataRouter.get('/auctions', async (req: Request, res: Response) => {
    try {
        const db = await connectDB();
        const items = await db.collection('auctionItems')
            .find({ status: 'active' })
            .sort({ createdAt: -1 })
            .toArray();

        const now = new Date();
        const formatted = items.map(item => {
            const remainingMs = new Date(item.endTime).getTime() - now.getTime();
            let timeLeft = '';

            if (remainingMs <= 0) {
                timeLeft = 'Ended';
            } else {
                const days = Math.floor(remainingMs / 86400000);
                const hours = Math.floor((remainingMs % 86400000) / 3600000);

                if (days > 0) timeLeft = `${days} day${days > 1 ? 's' : ''}`;
                else if (hours > 0) timeLeft = `${hours} hour${hours > 1 ? 's' : ''}`;
                else timeLeft = 'Less than 1 hour';
            }

            return {
                _id: item._id.toString(),
                title: item.title,
                price: item.currentPrice,
                image: item.images?.[0] || '/Image/default-item.jpg',
                timeLeft,
                endTime: item.endTime
            };
        });

        res.json({ success: true, items: formatted });
    } catch (error) {
        console.error("❌ Failed to load auctions:", error);
        res.status(500).json({ success: false, message: 'Failed to load auctions' });
    }
});


// ==============================
// GET SINGLE AUCTION DETAILS
// ==============================
dataRouter.get('/auctions/:id', async (req: Request, res: Response) => {
    try {
        const db = await connectDB();

        // Validate product ID
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, msg: "Invalid auction ID" });
        }

        const item = await db.collection('auctionItems').findOne({
            _id: new ObjectId(req.params.id),
            status: 'active'
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Auction not found or has ended' });
        }

        // ============================
        // SAFE SELLER LOOKUP (IMPORTANT)
        // ============================
        let seller = null;

        if (item.sellerId && ObjectId.isValid(item.sellerId.toString())) {
            seller = await db.collection('Users').findOne(
                { _id: new ObjectId(item.sellerId.toString()) },
                { projection: { name: 1 } }
            );
        }

        res.json({
            success: true,
            item: {
                _id: item._id.toString(),
                title: item.title,
                description: item.description || 'No description available',
                images: item.images || [],
                startPrice: item.startPrice,
                currentPrice: item.currentPrice,
                endTime: item.endTime,
                sellerId: item.sellerId?.toString() || null,
                sellerName: seller?.name || 'Anonymous'
            }
        });

    } catch (err: any) {
        console.error('❌ Product loading failed:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 出價 
dataRouter.post('/auctions/:id/bid', async (req: Request, res: Response) => {
    if (!req.session?.user?.id) {
        return res.status(401).json({ success: false, message: 'Please log in first' });
    }

    const rawAmount = req.body.amount;
    if (!rawAmount || isNaN(rawAmount) || Number(rawAmount) <= 0) {
        return res.status(400).json({ success: false, message: 'Please enter a valid bid amount' });
    }

    const bidAmount = Number(rawAmount);

    try {
        const db = await connectDB();

        // 1. 取得最新商品狀態
        const item = await db.collection('auctionItems').findOne({
            _id: new ObjectId(req.params.id),
            status: 'active'
        });

        if (!item) {
            return res.json({ success: false, message: 'Auction not found or has ended' });
        }

        // 2. 手動檢查出價是否足夠高
        if (bidAmount <= item.currentPrice) {
            return res.json({
                success: false,
                message: 'Bid must be higher than current price',
                currentPrice: item.currentPrice
            });
        }

        // 3. 更新資料庫
        await db.collection('auctionItems').updateOne(
            { _id: item._id },
            {
                $set: { currentPrice: bidAmount },
                $push: {
                    bids: {
                        bidderId: new ObjectId(req.session.user.id),
                        amount: bidAmount,
                        createdAt: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            newPrice: bidAmount,
            message: 'Bid placed successfully!'
        });

    } catch (err) {
        console.error('出價錯誤:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default dataRouter;