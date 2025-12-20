import { connectDB } from './ConnectToDB.js';
import { ObjectId } from 'mongodb';

const AUCTION_COLLECTION = 'auctionItems';
const BID_COLLECTION = 'Bid';
const CART_COLLECTION = 'cart'; // 修改：我們需要寫入購物車

export async function settleAuction(itemId: string) {
    try {
        const db = await connectDB();
        const itemsCollection = db.collection(AUCTION_COLLECTION);
        const bidsCollection = db.collection(BID_COLLECTION);
        const cartCollection = db.collection(CART_COLLECTION); // 連接購物車

        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId) });
        
        // 驗證：確保商品存在且真的過期了
        if (!item || item.dSale || item.status !== 'active' || new Date(item.endTime) > new Date()) {
            return; 
        }

        // 1. 找出最高出價者 (價高者得，同價先得)
        const winningBid = await bidsCollection.find({ itemId: new ObjectId(itemId) })
            .sort({ price: -1, createdAt: 1 })
            .limit(1)
            .next();

        if (winningBid) {
            // 2. [關鍵修改] 將商品加入贏家的 "購物車 (Cart)"
            // 這裡不寫入 deal，而是寫入 cart，等待使用者去結帳
            await cartCollection.insertOne({
                userId: winningBid.bidderId,   // 購物車擁有者
                itemId: item._id,              // 商品 ID
                title: item.title,             // 建議冗餘存入標題，方便前端顯示
                price: winningBid.price,       // 得標價
                quantity: 1,
                addedAt: new Date(),
                type: 'auction_win'            // 標記這是拍賣得標商品
            });

            // 3. 更新拍賣商品狀態
            // 雖然還沒付錢，但拍賣活動本身已經結束 (inactive)
            await itemsCollection.updateOne(
                { _id: item._id },
                { $set: { 
                    status: 'inactive', 
                    winnerId: winningBid.bidderId,
                    finalPrice: winningBid.price 
                }}
            );
            console.log(`Auction ${itemId} settled. Winner ${winningBid.bidderId} added to cart.`);

        } else {
            // 流標邏輯
            await itemsCollection.updateOne(
                { _id: item._id }, 
                { $set: { status: 'unsold' }}
            );
        }

    } catch (error) {
        console.error(`Error during auction settlement for item ${itemId}:`, error);
    }
}

export async function runScheduledCleanup() {
    console.log('Running scheduled auction cleanup...');
    try {
        const db = await connectDB();
        const itemsCollection = db.collection(AUCTION_COLLECTION);
        const currentTime = new Date();

        const expiredItems = await itemsCollection.find({
            dSale: false, 
            endTime: { $lte: currentTime }, 
            status: 'active'
        }).toArray();

        for (const item of expiredItems) {
            await settleAuction(item._id.toString()); 
        }
        console.log(`Cleanup complete. Settled ${expiredItems.length} auctions.`);

    } catch (error) {
        console.error('Scheduled cleanup failed:', error);
    }
}