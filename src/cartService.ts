import { connectDB } from './ConnectToDB.js';
import { ObjectId } from 'mongodb';
import { establishChat } from './chat.js';

const CART_COLLECTION = 'cart';
const DEAL_COLLECTION = 'deal';
const AUCTION_COLLECTION = 'auctionItems';

// 取得某人的購物車內容
export async function getCartItems(userId: string) {
    const db = await connectDB();
    const cartCollection = db.collection(CART_COLLECTION);

    // 1. 【關鍵修正】將字串 userId 轉為 ObjectId
    // 如果你的 session 存的是字串，但 DB 存的是 ObjectId，這裡必須轉型
    let userObjectId;
    try {
        userObjectId = new ObjectId(userId);
    } catch (e) {
        // 如果 userId 格式不對，直接回傳空陣列，避免崩潰
        console.error("Invalid User ID in getCartItems:", userId);
        return [];
    }

    const cartItems = await cartCollection.aggregate([
        {
            $match: {
                // 為了保險，使用 $or 同時比對 ObjectId 和 String 格式
                // 這樣無論之前寫入的是哪種格式，都能撈得到
                $or: [
                    { userId: userObjectId },
                    { userId: userId }
                ]
            }
        },
        {
            $lookup: {
                from: AUCTION_COLLECTION,
                localField: 'itemId',
                foreignField: '_id',
                as: 'itemDetails'
            }
        },
        // 2. 【關鍵修正】preserveNullAndEmptyArrays: true
        // 這樣即使找不到關聯商品 (lookup 失敗)，購物車項目也不會消失，方便除錯
        {
            $unwind: {
                path: '$itemDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1, // Cart ID
                itemId: 1,
                title: 1,
                price: 1,
                quantity: 1, 
                // 3. 【關鍵修正】處理圖片陣列
                // 嘗試抓 itemDetails.images 的第一張圖，如果沒有則 fallback 到 cart 內的 productImage
                productImage: {
                    $ifNull: [
                        { $arrayElemAt: ["$itemDetails.thumbnails", 0] }, // 1. 試試縮圖
                        { $arrayElemAt: ["$itemDetails.images", 0] },     // 2. 沒有縮圖就用大圖
                        "$productImage",
                        "/Image/default-item.jpg"
                    ]
                },
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
    const itemsCollection = db.collection(AUCTION_COLLECTION);

    const objectIds = cartItemIds.map(id => new ObjectId(id));
    const userObjectId = new ObjectId(userId);

    // 1. 撈出購物車內的這些項目
    const cartItems = await cartCollection.find({
        _id: { $in: objectIds },
        $or: [{ userId: userObjectId }, { userId: userId }]
    }).toArray();

    if (cartItems.length === 0) {
        throw new Error("No valid items found to checkout.");
    }

    const successfulDeals = [];

    // 2. 逐一處理每個商品 (檢查庫存 -> 扣庫存 -> 建立訂單 -> 建立聊天)
    for (const cartItem of cartItems) {

        // 取得該商品的最新庫存狀態
        const product = await itemsCollection.findOne({ _id: cartItem.itemId });

        if (!product) continue; // 商品被刪了？跳過

        // 如果是直購商品 (dSale: true)，需要檢查並扣除庫存
        if (product.dSale) {
            const buyQty = cartItem.quantity || 1;

            if (product.stock < buyQty) {
                throw new Error(`Item "${product.title}" is out of stock.`);
            }

            // 扣除庫存
            await itemsCollection.updateOne(
                { _id: product._id },
                { $inc: { stock: -buyQty } }
            );

            // 如果庫存歸零，設為 inactive (可選)
            if (product.stock - buyQty <= 0) {
                await itemsCollection.updateOne({ _id: product._id }, { $set: { status: 'inactive' } });
            }
        }

        // 3. 準備訂單資料
        const dealData = {
            itemId: cartItem.itemId,
            buyerId: userObjectId,
            quantity: cartItem.quantity || 1,
            individual_price: cartItem.price,
            total_price: cartItem.price * (cartItem.quantity || 1),
            purchaseDate: new Date(),
            title: cartItem.title,
            status: 'completed'
        };

        const dealResult = await dealsCollection.insertOne(dealData);
        successfulDeals.push(dealResult.insertedId);

        // 4. 建立買賣雙方聊天室
        // 賣家: product.sellerId, 買家: userObjectId, 主題: 商品ID
        if (product.sellerId) {
            await establishChat(
                product.sellerId.toString(),
                userId,
                product._id.toString()
            );
        }
    }

    // 5. 從購物車移除已結帳的商品
    if (successfulDeals.length > 0) {
        await cartCollection.deleteMany({
            _id: { $in: objectIds }
        });
    }

    return { success: true, count: successfulDeals.length };
}