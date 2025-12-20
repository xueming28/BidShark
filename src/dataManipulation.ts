import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.js'; 
import { ObjectId } from "mongodb";
import multer from 'multer';
import path from 'path';
import sharp from 'sharp'; // 1. 引入 sharp 進行圖片壓縮

import { settleAuction } from './auctionService.js'; 
import { establishChat } from "./chat.js"; 

const { Router } = expressPkg;
const dataRouter = Router();

// Multer 設定 (保持 memoryStorage)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 4.5 * 1024 * 1024 }, // Vercel 限制
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const pass = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
        cb(null, pass);
    }
}).array('itemImage', 5);

// 輔助函數：處理圖片壓縮 (回傳 { thumb, full })
async function processImages(files: Express.Multer.File[]) {
    return Promise.all(files.map(async (file) => {
        // A. 製作縮圖 (Thumbnail) - 寬度 300px, 品質 60%
        const thumbBuffer = await sharp(file.buffer)
            .resize({ width: 300, withoutEnlargement: true })
            .jpeg({ quality: 60, mozjpeg: true })
            .toBuffer();

        // B. 製作大圖 (Full) - 寬度 1000px, 品質 80%
        const fullBuffer = await sharp(file.buffer)
            .resize({ width: 1000, withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();

        return {
            thumb: `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`,
            full: `data:image/jpeg;base64,${fullBuffer.toString('base64')}`
        };
    }));
}

// 更新個人資料 (保持不變)
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

// 建立新拍賣品 (已優化圖片處理)
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
            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one image is required' });
            }

            // 2. 使用 Sharp 處理圖片
            const processedImages = await processImages(files);
            
            // 分離出兩個陣列
            const images = processedImages.map(p => p.full);      // 大圖
            const thumbnails = processedImages.map(p => p.thumb); // 縮圖

            const db = await connectDB();
            let result = null;

            // 建構基礎物件
            const baseItem = {
                sellerId: new ObjectId(req.session.user.id),
                title: req.body.itemName.trim(),
                description: req.body.itemDescription.trim(),
                category: req.body.category,
                images: images,          // 存大圖
                thumbnails: thumbnails,  // 存縮圖 (新增欄位)
                status: 'active',
                createdAt: new Date()
            };

            if(req.body.mode === 'true'){
                // 直購模式
                const { itemName, itemDescription, price, stock, category } = req.body;
                if (!itemName || !itemDescription || !price || !stock || !category) {
                    return res.status(400).json({success: false, message: 'Sale Mode: Missing fields'});
                }
                
                result = await db.collection('auctionItems').insertOne({
                    ...baseItem,
                    dSale: true,
                    price: Number(price),
                    stock: Number(stock),
                });
            } else {
                // 競標模式
                const { itemName, itemDescription, startPrice, reservePrice, duration, category } = req.body;
                if (!itemName || !itemDescription || !startPrice || !duration || !category) {
                    return res.status(400).json({success: false, message: 'Auction Mode: Missing fields'});
                }

                const endTime = new Date();
                endTime.setDate(endTime.getDate() + parseInt(duration));

                result = await db.collection('auctionItems').insertOne({
                    ...baseItem,
                    dSale: false,
                    startPrice: Number(startPrice),
                    reservePrice: reservePrice ? Number(reservePrice) : null,
                    currentPrice: Number(startPrice),
                    endTime,
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

// 首頁：取得所有進行中的拍賣品 (只回傳縮圖，大幅優化速度)
dataRouter.get('/auctions', async (req: Request, res: Response) => {
    try {
        const db = await connectDB();
        
        const { category, minPrice, maxPrice, type, search } = req.query;
        const query: any = { status: 'active' };

        if (category && typeof category === 'string' && category !== 'all') query.category = category; 
        if (search && typeof search === 'string') query.title = { $regex: search, $options: 'i' };
        if (type === 'auction') query.dSale = false;
        else if (type === 'direct') query.dSale = true;

        const min = minPrice ? Number(minPrice) : 0;
        const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;

        if (minPrice || maxPrice) {
            query.$and = [
                {
                    $or: [
                        { dSale: true, price: { $gte: min, $lte: max } },
                        { dSale: false, currentPrice: { $gte: min, $lte: max } }
                    ]
                }
            ];
        }

        const items = await db.collection('auctionItems')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(20)
            // ★ 優化：只抓取需要的欄位 (不抓大圖 images)
            .project({ 
                title: 1, price: 1, currentPrice: 1, 
                endTime: 1, dSale: 1, stock: 1, status: 1, 
                thumbnails: 1, images: 1 // images 還是先抓，以防舊資料沒有 thumbnails
            })
            .toArray();

        const now = new Date();
        
        const formatted = items.map(item => {
            // ★ 圖片選取邏輯：優先使用 thumbnails[0]，如果沒有 (舊資料)，才用 images[0]
            const displayImage = (item.thumbnails && item.thumbnails.length > 0) 
                ? item.thumbnails[0] 
                : (item.images && item.images.length > 0 ? item.images[0] : '/Image/default-item.jpg');

            if (item.dSale) {
                if(item.stock <= 0){
                    db.collection('auctionItems').updateOne({_id: item._id},{$set: { status: 'inactive' }});
                    return null; 
                }
                return{
                    dSale: true,
                    _id: item._id.toString(),
                    title: item.title,
                    price: item.price,
                    image: displayImage,
                    stock: item.stock || 'err'
                }
            }
            
            const remainingMs = new Date(item.endTime).getTime() - now.getTime();
            let timeLeft = '';

            if (remainingMs <= 0) {
                settleAuction(item._id.toString());
                return null;
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
                price: item.currentPrice,
                image: displayImage,
                timeLeft,
                endTime: item.endTime
            };
        }).filter(item => item !== null);

        res.json({ success: true, items: formatted });
    } catch (error) {
        console.error("❌ Failed to load auctions:", error);
        res.status(500).json({ success: false, message: 'Failed to load auctions' });
    }
});


// GET SINGLE AUCTION DETAILS (回傳大圖)
dataRouter.get('/auctions/:id', async (req: Request, res: Response) => {
    try {
        const db = await connectDB();

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

        let seller = null;
        if (item.sellerId && ObjectId.isValid(item.sellerId.toString())) {
            seller = await db.collection('Users').findOne(
                { _id: new ObjectId(item.sellerId.toString()) },
                { projection: { name: 1 } }
            );
        }

        const responseData = {
            _id: item._id.toString(),
            title: item.title,
            description: item.description || 'No description available',
            // 詳情頁回傳高品質圖片
            images: item.images || [], 
            dSale: !!item.dSale,
            sellerId: item.sellerId?.toString() || null,
            sellerName: seller?.name || 'Anonymous'
        };

        if(item.dSale){
            res.json({
                success: true,
                item: {
                    ...responseData,
                    price: item.price || 0,
                    stock: item.stock || 0,
                }
            });
        } else {
            res.json({
                success: true,
                item: {
                    ...responseData,
                    startPrice: item.startPrice,
                    currentPrice: item.currentPrice,
                    endTime: item.endTime,
                }
            });
        }

    } catch (err: any) {
        console.error('❌ Product loading failed:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 出價 (保持不變)
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

        const item = await db.collection('auctionItems').findOne({
            _id: new ObjectId(req.params.id),
            status: 'active'
        });

        if (!item) {
            return res.json({ success: false, message: 'Auction not found or has ended' });
        }

        if (bidAmount <= item.currentPrice) {
            return res.json({
                success: false,
                message: 'Bid must be higher than current price',
                currentPrice: item.currentPrice
            });
        }

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

// 載入我的上傳 (只回傳縮圖)
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
            .project({ thumbnails: 1, images: 1, title: 1, dSale: 1, price: 1, currentPrice: 1, startPrice: 1, stock: 1, status: 1, endTime: 1 }) // 優化 Projection
            .toArray();

        const now = new Date();
        const formatted = items.map(item => {
            const isDirect = !!item.dSale;
            // 優先使用縮圖
            const displayImage = (item.thumbnails && item.thumbnails.length > 0) 
                ? item.thumbnails[0] 
                : (item.images && item.images.length > 0 ? item.images[0] : '/Image/default-item.jpg');
            
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
                image: displayImage,
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

// 編輯頁面 - 讀取資料
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
                // 編輯時通常需要看大圖確認
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

// 編輯頁面 - 更新資料 (也包含 sharp 圖片處理)
dataRouter.post('/auctions/:id/edit', (req: Request, res: Response) => {
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

            const updates: any = {};
            const pushOps: any = {}; // 用於 push
            const setOps: any = {};  // 用於 set images (如果是替換)

            // 處理圖片上傳
            if (files.length > 0) {
                const processedImages = await processImages(files);
                const newFullImages = processedImages.map(p => p.full);
                const newThumbnails = processedImages.map(p => p.thumb);

                if (bidsCount > 0) {
                    // 有出價只能新增圖片 (push)
                    // MongoDB $push 可以同時推入多個欄位
                    pushOps.images = { $each: newFullImages };
                    pushOps.thumbnails = { $each: newThumbnails };
                } else {
                    // 沒出價可以替換圖片 (set)
                    setOps.images = newFullImages;
                    setOps.thumbnails = newThumbnails;
                }
            }

            if (bidsCount > 0) {
                if (req.body.title || req.body.price || req.body.startPrice || req.body.stock || req.body.extendDays) {
                    return res.status(400).json({ success: false, message: 'Item already has bids — only description update and adding photos allowed' });
                }
                if (req.body.description && req.body.description !== item.description) {
                    updates.description = req.body.description.trim();
                }
            } else {
                if (req.body.title) updates.title = req.body.title.trim();
                if (req.body.description) updates.description = req.body.description.trim();

                if (item.dSale) {
                    if (req.body.price) updates.price = Number(req.body.price);
                    if (req.body.stock) updates.stock = Number(req.body.stock);
                } else {
                    if (req.body.startPrice) {
                        const sp = Number(req.body.startPrice);
                        if (isNaN(sp) || sp <= 0) return res.status(400).json({ success: false, message: 'Invalid startPrice' });
                        updates.startPrice = sp;
                        updates.currentPrice = sp; 
                    }
                    if (req.body.extendDays) {
                        const extendDays = parseInt(String(req.body.extendDays), 10);
                        if (isNaN(extendDays) || extendDays <= 0) {
                            return res.status(400).json({ success: false, message: 'Invalid extendDays' });
                        }
                        const oldEnd = item.endTime ? new Date(item.endTime) : null;
                        if (!oldEnd) return res.status(400).json({ success: false, message: 'Original endTime missing' });
                        const newEnd = new Date(oldEnd);
                        newEnd.setDate(newEnd.getDate() + extendDays);
                        if (newEnd <= oldEnd) return res.status(400).json({ success: false, message: 'New end time must be later' });
                        updates.endTime = newEnd;
                    }
                }
            }

            // 合併所有更新操作
            const finalUpdate: any = {};
            
            // 1. 一般欄位更新
            if (Object.keys(updates).length > 0) Object.assign(setOps, updates);
            
            // 2. 放入 $set
            if (Object.keys(setOps).length > 0) finalUpdate.$set = setOps;
            
            // 3. 放入 $push
            if (Object.keys(pushOps).length > 0) finalUpdate.$push = pushOps;

            if (Object.keys(finalUpdate).length === 0) {
                return res.status(400).json({ success: false, message: 'No valid changes provided' });
            }

            await db.collection('auctionItems').updateOne({ _id: item._id }, finalUpdate);

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

// 直購商品：加入購物車 (不建立訂單，不扣庫存)
dataRouter.post('/auctions/:id/buy/:amt', async (req: Request, res: Response) => {
    try {
        if (!req.session?.user?.id) {
            return res.status(401).json({ success: false, message: 'Please log in first' });
        }

        const db = await connectDB();
        const amt = parseInt(req.params.amt, 10);
        const itemId = req.params.id;
        const userId = req.session.user.id;

        if (!ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID' });
        }

        // 1. 檢查商品是否存在且在庫
        const item = await db.collection('auctionItems').findOne({
            _id: new ObjectId(itemId),
            dSale: true,
            status: 'active'
        });

        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found or not available' });
        }

        // 檢查庫存是否足夠 (但還不扣除，結帳時才扣)
        if ((item.stock || 0) < amt) {
            return res.status(400).json({ success: false, message: 'Not enough stock' });
        }

        // 2. 加入購物車 (Cart)
        // 使用縮圖存入購物車 (如果有縮圖就用縮圖，沒有用大圖)
        const cartImage = (item.thumbnails && item.thumbnails.length > 0) 
            ? item.thumbnails[0] 
            : (item.images && item.images.length > 0 ? item.images[0] : '/Image/default-item.jpg');

        await db.collection('cart').insertOne({
            userId: new ObjectId(userId),  // 確保用 ObjectId
            itemId: item._id,              // 商品 ID
            title: item.title,
            price: item.price,
            quantity: amt,                 // 購買數量
            productImage: cartImage,       // 存入縮圖
            type: 'direct_buy',            // 標記類型
            addedAt: new Date()
        });

        res.json({ success: true, message: 'Added to cart successfully' });

    } catch (err) {
        console.error('Add to cart failed:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default dataRouter;