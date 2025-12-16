import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.ts';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { ObjectId } from "mongodb";
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { settleAuction } from './auctionService.ts';
import {establishChat} from "./chat.ts";

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
const storage = multer.memoryStorage();

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
            // store as data URLs (data:<mime>;base64,<base64string>) so images come from DB directly
            const images = files?.map(file => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`) || [];
            //const images = files?.map(file => `/uploads/${file.filename}`) || [];

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
                    status: 'active',
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
// GET ALL AUCTIONS (WITH FILTER)
// ==============================
dataRouter.get('/auctions', async (req: Request, res: Response) => {
    try {
        const db = await connectDB();
        
        // 1. 讀取前端傳來的參數
        const { category, minPrice, maxPrice, type, search } = req.query;

        // 2. 建立基礎查詢條件
        const query: any = { status: 'active' };

        // 3. 分類篩選 (Category)
        if (category && typeof category === 'string' && category !== 'all') {
            // 使用正則表達式進行不分大小寫的匹配，或者直接匹配
            query.category = category; 
        }

        // 4. 關鍵字搜尋 (Search) - 如果前端透過參數傳搜尋字
        if (search && typeof search === 'string') {
            query.title = { $regex: search, $options: 'i' };
        }

        // 5. 類型篩選 (Auction vs Direct Sale)
        if (type === 'auction') {
            query.dSale = false;
        } else if (type === 'direct') {
            query.dSale = true;
        }

        // 6. 價格範圍篩選 (Price Range)
        // 難點：直購看 'price'，拍賣看 'currentPrice'
        const min = minPrice ? Number(minPrice) : 0;
        const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;

        if (minPrice || maxPrice) {
            // 使用 $and 結合 $or 來處理兩種不同的價格欄位
            query.$and = [
                {
                    $or: [
                        // 情境 A: 直購商品，檢查 price
                        { dSale: true, price: { $gte: min, $lte: max } },
                        // 情境 B: 拍賣商品，檢查 currentPrice
                        { dSale: false, currentPrice: { $gte: min, $lte: max } }
                    ]
                }
            ];
        }

        // 執行查詢
        const items = await db.collection('auctionItems')
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        const now = new Date();
        
        const formatted = items.map(item => {
            if (item.dSale) {
                if(item.stock <= 0){
                    // (原有的庫存檢查邏輯)
                    db.collection('auctionItems').updateOne({_id: item._id},{$set: { status: 'inactive' }});
                    return null; // 標記為 null 稍後過濾
                }
                return{
                    dSale: true,
                    _id: item._id.toString(),
                    title: item.title,
                    price: item.price,
                    image: item.images?.[0] || '/Image/default-item.jpg',
                    stock: item.stock || 'err'
                }
            }
            // 拍賣邏輯
            const remainingMs = new Date(item.endTime).getTime() - now.getTime();
            let timeLeft = '';

            if (remainingMs <= 0) {
                settleAuction(item._id.toString()); // 觸發結算
                return null; // 過期商品不回傳
            } else {
                const days = Math.floor(remainingMs / 86400000);
                const hours = Math.floor((remainingMs % 86400000) / 3600000);
                if (days > 0) timeLeft = `${days} day${days > 1 ? 's' : ''}`;
                else if (hours > 0) timeLeft = `${hours} hour${hours > 1 ? 's' : ''}`;
                else timeLeft = 'Less than 1 hour';
            }

            return {
                dSale: false,
                _id: item._id.toString(),
                title: item.title,
                price: item.currentPrice, // 注意這裡用 currentPrice
                image: item.images?.[0] || '/Image/default-item.jpg',
                timeLeft,
                endTime: item.endTime
            };
        }).filter(item => item !== null); // 過濾掉剛才標記為 null 的過期/缺貨商品

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
        if(item.dSale){
            res.json({
                success: true,
                item: {
                    _id: item._id.toString(),
                    dSale: true,
                    title: item.title,
                    description: item.description || 'No description available',
                    images: item.images || [],
                    price: item.price || 0,
                    stock: item.stock || 0,
                    sellerId: item.sellerId?.toString() || null,
                    sellerName: seller?.name || 'Anonymous'
                }
            });
        }else {
            res.json({
                success: true,
                item: {
                    _id: item._id.toString(),
                    dSale: false,
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
        }

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
                        itemId: item._id,
                        bidderId: new ObjectId(req.session.user.id),
                        amount: bidAmount,
                        createdAt: new Date()
                    }
                }
            }
        );
        await db.collection('Bid').insertOne(
            {
                itemId: item._id,
                bidderId: new ObjectId(req.session.user.id),
                price: bidAmount,
                createdAt: new Date()
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

// user's uploaded items
dataRouter.get('/myItems', async (req: Request, res: Response) => {
    try {
        if (!req.session?.user?.id) {
            return res.status(401).json({ success: false, message: 'Not logged in' });
        }

        const userId = req.session.user.id;
        const db = await connectDB();

        const matchQuery: any = {
            $or: [
                { sellerId: new ObjectId(userId) },
                { sellerId: userId }
            ]
        };

        const items = await db.collection('auctionItems')
            .find(matchQuery)
            .sort({ createdAt: -1 })
            .toArray();

        const now = new Date();
        const formatted = items.map(item => {
            const isDirect = !!item.dSale;
            const image = item.images?.[0] || '/Image/default-item.jpg';
            //const rawImage = item.images && item.images[0] ? item.images[0] : null;
            //const image = rawImage ? (rawImage.startsWith('/') ? rawImage : `/uploads/${rawImage}`) : '/Image/default-item.jpg';
            
            let timeLeft = '';
            if (!isDirect && item.endTime) {
                const remainingMs = new Date(item.endTime).getTime() - now.getTime();
                if (remainingMs <= 0) timeLeft = 'Ended';
                else {
                    const days = Math.floor(remainingMs / 86400000);
                    const hours = Math.floor((remainingMs % 86400000) / 3600000);
                    timeLeft = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                }
            }

            return {
                _id: item._id.toString(),
                title: item.title,
                dSale: isDirect,
                price: isDirect ? item.price : (item.currentPrice ?? item.startPrice ?? 0),
                image,
                stock: isDirect ? (item.stock ?? 0) : undefined,
                status: item.status ?? 'unknown',
                timeLeft
            };
        });

        res.json({ success: true, items: formatted });
    } catch (err) {
        console.error('Failed to load my items:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

dataRouter.get('/auctions/:id/edit', async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

        const db = await connectDB();
        const item = await db.collection('auctionItems').findOne({ _id: new ObjectId(id), status: 'active' });
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const bidsCount = Array.isArray(item.bids) ? item.bids.length : 0;
        const isOwner = !!(req.session?.user?.id && req.session.user.id === item.sellerId?.toString());

        res.json({
            success: true,
            item: {
                _id: item._id.toString(),
                title: item.title,
                description: item.description || '',
                images: item.images || [],
                dSale: !!item.dSale,
                price: item.price ?? item.startPrice ?? null,
                stock: item.stock ?? null,
                endTime: item.endTime ?? null
            },
            bidsCount,
            isOwner
        });
    } catch (err) {
        console.error('Failed to load auction for editing:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

dataRouter.post('/auctions/:id/edit', (req: Request, res: Response) => {
    // reuse multer memoryStorage upload (already defined above)
    upload(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
        }

        try {
            const id = req.params.id;
            if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

            if (!req.session?.user?.id) return res.status(401).json({ success: false, message: 'Not logged in' });

            const db = await connectDB();
            const item = await db.collection('auctionItems').findOne({ _id: new ObjectId(id) });
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

            if (item.sellerId?.toString() !== req.session.user.id) {
                return res.status(403).json({ success: false, message: 'Not the seller' });
            }

            const bidsCount = Array.isArray(item.bids) ? item.bids.length : 0;
            const files = req.files as Express.Multer.File[] || [];

            // convert uploaded files into data URLs (same convention as create)
            const newImages = files.map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`);

            const updates: any = {};
            const pushOps: any = {};

            if (bidsCount > 0) {
                // only description and append images allowed
                if (req.body.title || req.body.price || req.body.startPrice || req.body.stock || req.body.extendDays) {
                    // ignore or reject changes to forbidden fields
                    return res.status(400).json({ success: false, message: 'Item already has bids — only description update and adding photos allowed' });
                }

                if (req.body.description && req.body.description !== item.description) {
                    updates.description = req.body.description.trim();
                }

                if (newImages.length > 0) {
                    // append images (do NOT remove existing)
                    pushOps.images = newImages;
                }
            } else {
                // no bids yet — allow more fields
                if (req.body.title) updates.title = req.body.title.trim();
                if (req.body.description) updates.description = req.body.description.trim();

                if (item.dSale) {
                    // direct sale: allow price & stock
                    if (req.body.price) updates.price = Number(req.body.price);
                    if (req.body.stock) updates.stock = Number(req.body.stock);
                } else {
                    // auction: allow startPrice (only if lower than current? since no bids currentPrice==startPrice)
                    if (req.body.startPrice) {
                        const sp = Number(req.body.startPrice);
                        if (isNaN(sp) || sp <= 0) return res.status(400).json({ success: false, message: 'Invalid startPrice' });
                        updates.startPrice = sp;
                        updates.currentPrice = sp; // keep currentPrice in sync when no bids yet
                    }

                    // duration extension: client may send extendDays
                    if (req.body.extendDays) {
                        const extendDays = parseInt(String(req.body.extendDays), 10);
                        if (isNaN(extendDays) || extendDays <= 0) {
                            return res.status(400).json({ success: false, message: 'Invalid extendDays' });
                        }
                        const oldEnd = item.endTime ? new Date(item.endTime) : null;
                        if (!oldEnd) {
                            return res.status(400).json({ success: false, message: 'Original endTime missing' });
                        }
                        const newEnd = new Date(oldEnd);
                        newEnd.setDate(newEnd.getDate() + extendDays);
                        if (newEnd <= oldEnd) {
                            return res.status(400).json({ success: false, message: 'New end time must be later than previous end time' });
                        }
                        updates.endTime = newEnd;
                    }
                }

                // images: if new images provided, replace existing images with new set
                if (newImages.length > 0) {
                    updates.images = newImages;
                }
            }

            // build final update object
            const finalUpdate: any = {};
            if (Object.keys(updates).length > 0) finalUpdate.$set = updates;
            if (pushOps.images) finalUpdate.$push = { images: { $each: pushOps.images } };

            if (Object.keys(finalUpdate).length === 0) {
                return res.status(400).json({ success: false, message: 'No valid changes provided' });
            }

            await db.collection('auctionItems').updateOne({ _id: item._id }, finalUpdate);

            // return updated item snapshot
            const updated = await db.collection('auctionItems').findOne({ _id: item._id });
            res.json({
                success: true,
                message: 'Item updated',
                item: {
                    _id: updated?._id.toString(),
                    title: updated?.title,
                    description: updated?.description,
                    images: updated?.images || [],
                    dSale: !!updated?.dSale,
                    price: updated?.price ?? updated?.startPrice ?? null,
                    stock: updated?.stock ?? null,
                    endTime: updated?.endTime ?? null
                }
            });
        } catch (e) {
            console.error('Edit item failed:', e);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });
});
dataRouter.post('/auctions/:id/buy/:amt', async (req: Request, res: Response) => {
    try {
        if (!req.session?.user?.id) {
            return res.status(401).json({ success: false, message: 'Please log in first' });
        }

        const db = await connectDB();
        const amt = parseInt(req.params.amt,10);
        const itemId = req.params.id;

        if (!ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID' });
        }

        const item = await db.collection('auctionItems').findOne({
            _id: new ObjectId(itemId),
            dSale: true,
            status: 'active'
        });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found or not available for direct sale' });
        }
        if(item.stock <= 0){
            await db.collection('auctionItems').updateOne(
                { _id: item._id },
                { $set: { status: "inactive" } }
            );
            return res.status(400).json({ success: false, message: 'Item is out of stock' });
        }

        const updateResult = await db.collection('auctionItems').updateOne(
            { _id: item._id },
            { $set: { stock: item.stock - amt } }
        );
        if (updateResult.modifiedCount === 0) {
            return res.status(500).json({ success: false, message: 'Failed to update stock' });
        }
        const result = await db.collection('deal').insertOne({
                itemId: item._id,
                buyerId: new ObjectId(req.session.user.id),
                quantity: amt,
                individual_price: item.price,
                total_price: item.price * amt,
                purchaseDate: new Date()
        });
        establishChat(req.session.user.id, item.sellerId.toString(), result.insertedId);
        res.json({ success: true, message: 'Purchase successful' });
    } catch (err) {
        console.error('Purchase failed:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
export default dataRouter;