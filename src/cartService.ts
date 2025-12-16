import { connectDB } from './ConnectToDB.ts';
import { ObjectId } from 'mongodb';

const CART_COLLECTION = 'cart';
const DEAL_COLLECTION = 'deal';
const AUCTION_COLLECTION = 'auctionItems';

// 取得某人的購物車內容
export async function getCartItems(userId: string) {
    const db = await connectDB();
    const cartCollection = db.collection(CART_COLLECTION);

    // 使用 aggregate 關聯查詢，把商品詳細資料(如圖片)一起抓出來
    const cartItems = await cartCollection.aggregate([
        { $match: { userId: userId } }, 
        {
            $lookup: { 
                from: AUCTION_COLLECTION,
                localField: 'itemId',
                foreignField: '_id',
                as: 'itemDetails'
            }
        },
        { $unwind: '$itemDetails' }, 
        {
            $project: { 
                _id: 1, // Cart ID
                itemId: 1,
                title: 1,
                price: 1,
                productImage: '$itemDetails.image', // 假設 DB 有 image 欄位
                endTime: '$itemDetails.endTime'
            }
        }
    ]).toArray();

    return cartItems;
}

// 結帳：從 Cart 移到 Deal
export async function checkout(userId: string, cartItemIds: string[]) {
    const db = await connectDB();
    const cartCollection = db.collection(CART_COLLECTION);
    const dealsCollection = db.collection(DEAL_COLLECTION);

    // 字串 ID 轉 ObjectId
    const objectIds = cartItemIds.map(id => new ObjectId(id));

    // 1. 確保這些商品真的在這個人的購物車裡
    const validItems = await cartCollection.find({
        _id: { $in: objectIds },
        userId: userId
    }).toArray();

    if (validItems.length === 0) {
        throw new Error("No valid items found to checkout.");
    }

    // 2. 準備寫入 Deal 的資料
    const deals = validItems.map(item => ({
        itemId: item.itemId,
        buyerId: userId,
        quantity: 1,
        individual_price: item.price,
        total_price: item.price, // 拍賣通常數量為 1
        purchaseDate: new Date(),
        title: item.title,
        status: 'completed' 
    }));

    // 3. 寫入 Deal (歷史訂單) 並 清空購物車對應項目
    if (deals.length > 0) {
        await dealsCollection.insertMany(deals);
        await cartCollection.deleteMany({
            _id: { $in: objectIds }
        });
    }

    return { success: true, count: deals.length };
}