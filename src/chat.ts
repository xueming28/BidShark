import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.js'; // 確保是 .js
import { ObjectId } from "mongodb";

const { Router } = expressPkg;
const chatRouter = Router();


export async function establishChat(userAId:string, userBId:string, subject:string) {
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    const userCollection = db.collection('Users');
    const existingChat = await chatsCollection.findOne({
        $or: [
            { Aside_id: new ObjectId(userAId), Bside_id: new ObjectId(userBId), subject: new ObjectId(subject) },
            { Aside_id: new ObjectId(userBId), Bside_id: new ObjectId(userAId), subject: new ObjectId(subject) }
        ]
    });

    if (existingChat) {
        console.log('Chat already exists');
        return;
    }

    const result = await chatsCollection.insertOne({
        Aside_id: new ObjectId(userAId),
        Bside_id: new ObjectId(userBId),
        subject: new ObjectId(subject), // 這裡可能是 Deal ID 或 Item ID
        chat: []
    });
    
    await userCollection.updateOne({ _id: new ObjectId(userAId) }, { $push: { chat: result.insertedId } });
    await userCollection.updateOne({ _id: new ObjectId(userBId) }, { $push: { chat: result.insertedId } });
}

chatRouter.get('/getChat/:id', async (req: Request, res: Response) => {
    // ... (這部分保持原本代碼不變) ...
    const { id } = req.params;
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    
    // 驗證 ID 格式，防止崩潰
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid chat ID' });

    const chatData = await chatsCollection.findOne({
        _id: new ObjectId(id)
    });
    if (!chatData) {
        return res.status(404).json({ error: 'Chat not found' });
    }else{
        type shtuff = {
            speaker: string,
            message: string
        }
        let msg : shtuff[] = [];
        chatData.chat.forEach((m: any) => {
            if(m.speaker === req.session.user.id){
                msg.push({
                    speaker: 'You',
                    message: m.message
                });
            }else{
                msg.push({
                    speaker: 'Them',
                    message: m.message
                });
            }
        });
        return res.status(200).json(msg);
    }
});

chatRouter.get('/getYourChats', async (req: Request, res: Response) => {
    const userId = req.session.user.id;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = await connectDB();
    const userCollection = db.collection('Users');
    const chatsCollection = db.collection('chat');
    
    const userData = await userCollection.findOne({
        _id: new ObjectId(userId)
    });
    if (!userData) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const chatIds = userData.chat || [];
    
    // 找出所有聊天記錄
    const chatDetails = await chatsCollection.find({
        _id: { $in: chatIds }
    }).toArray();
    
    let output = [];
    
    for (const chatDetail of chatDetails) {
        const otherUserId = chatDetail.Aside_id.toString() === userId ? chatDetail.Bside_id : chatDetail.Aside_id;
        
        const otherUserData = await userCollection.findOne({
            _id: new ObjectId(otherUserId.toString())
        });

        // === 修改邏輯開始 ===
        
        let itemTitle = 'Unknown Subject';
        const subjectId = chatDetail.subject; // ObjectId

        // 1. 嘗試直接在 auctionItems 找 (拍賣結標的情況)
        let item = await db.collection('auctionItems').findOne({ _id: subjectId });

        // 2. 如果沒找到，嘗試在 deal 找 (直購的情況)，再透過 deal 找 item
        if (!item) {
            const deal = await db.collection('deal').findOne({ _id: subjectId });
            if (deal) {
                item = await db.collection('auctionItems').findOne({ _id: deal.itemId });
            }
        }

        if (item) {
            itemTitle = item.title;
        }
        // === 修改邏輯結束 ===

        output.push({
            chatId: chatDetail._id,
            withUser: otherUserData ? otherUserData.name : 'Unknown User',
            OnSubject: itemTitle
        });
    }
    return res.status(200).json(output);
});

chatRouter.post('/sendMessage', async (req: Request, res: Response) => {
    const {message, chatId} = req.body;
    const senderId = req.session.user.id;
    if (!senderId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    try {
        await chatsCollection.updateOne(
            { _id: new ObjectId(chatId.trim()) },
            {
                $push: {
                    chat: {
                        speaker: senderId.toString(),
                        message
                    }
                }
            }
        );
        res.status(200).json({ status: 'Message sent' });
    } catch (err) {
        console.error("MongoDB error:", err);
        res.status(500).json({ error: 'DB error' });
    }
});

export default chatRouter;