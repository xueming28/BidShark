import { connectDB } from './ConnectToDB.js';
import { ObjectId } from 'mongodb';
import { establishChat } from './chat.js';

const AUCTION_COLLECTION = 'auctionItems';
const BID_COLLECTION = 'Bid';
const CART_COLLECTION = 'cart';

export async function settleAuction(itemId: string) {
    try {
        const db = await connectDB();
        const itemsCollection = db.collection(AUCTION_COLLECTION);
        const bidsCollection = db.collection(BID_COLLECTION);
        const cartCollection = db.collection(CART_COLLECTION);

        const item = await itemsCollection.findOne({ _id: new ObjectId(itemId) });

        // 驗證過期
        if (!item || item.dSale || item.status !== 'active' || new Date(item.endTime) > new Date()) {
            return;
        }

        // 1. 找出最高出價者
        const winningBid = await bidsCollection.find({ itemId: new ObjectId(itemId) })
            .sort({ price: -1, createdAt: 1 })
            .limit(1)
            .next();

        // 2.  檢查是否達到保留價 (Reserve Price)
        // 如果有設定 reservePrice，且最高出價小於它 -> 流標
        if (winningBid && item.reservePrice && winningBid.price < item.reservePrice) {

            console.log(`Auction ${itemId} ended. Highest bid ${winningBid.price} did not meet reserve price ${item.reservePrice}.`);

            // 設定為流標 (unsold)
            await itemsCollection.updateOne(
                { _id: item._id },
                { $set: { status: 'unsold_reserve_not_met' } } // 或用 'unsold'
            );
            return; // 結束函數，不執行後面的加入購物車
        }

        // 3. 處理得標 (原本的邏輯)
        if (winningBid) {

            // ... (加入購物車 cartCollection.insertOne 的代碼保持不變) ...
            await cartCollection.insertOne({
                userId: new ObjectId(winningBid.bidderId), // 確保用 ObjectId
                itemId: item._id,
                title: item.title,
                price: winningBid.price,
                quantity: 1,
                addedAt: new Date(),
                type: 'auction_win',
                productImage: item.images?.[0] || '/Image/default-item.jpg' // 如果你有加這個優化
            });

            // 更新狀態為 inactive
            await itemsCollection.updateOne(
                { _id: item._id },
                {
                    $set: {
                        status: 'inactive',
                        winnerId: winningBid.bidderId,
                        finalPrice: winningBid.price
                    }
                }
            );

            // 建立聊天室
            if (item.sellerId && winningBid.bidderId) {
                // 記得 import { establishChat } from './chat.js';
                // await establishChat(...) 
            }

            console.log(`Auction ${itemId} settled. Winner ${winningBid.bidderId}.`);

        } else {
            // 完全沒人出價 -> 流標
            await itemsCollection.updateOne(
                { _id: item._id },
                { $set: { status: 'unsold' } }
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