import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.js';
import {ObjectId} from "mongodb";

const { Router } = expressPkg;
const chatRouter = Router();
export async function establishChat(userAId:string, userBId:string, subject:string) {
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    const userCollection = db.collection('Users');
    const result = await chatsCollection.insertOne({
        Aside_id: new ObjectId(userAId),
        Bside_id: new ObjectId(userBId),
        subject: new ObjectId(subject),
        chat: []
    });
    await userCollection.updateOne({
        _id: new ObjectId(userAId)
    }, {
        $push: {
            chat: result.insertedId
        }
    });
    await userCollection.updateOne({
        _id: new ObjectId(userBId)
    }, {
        $push: {
            chat: result.insertedId
        }
    });
}
chatRouter.get('/getChat/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
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
        chatData.chat.forEach(m => {
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
    const chatDetails = await chatsCollection.find({
        _id: { $in: chatIds }
    }).toArray();
    let output = [];
    for (const chatDetail of chatDetails) {
        const otherUserId = chatDetail.Aside_id.toString() === userId ? chatDetail.Bside_id : chatDetail.Aside_id;
        const otherUserData = await userCollection.findOne({
            _id: new ObjectId(otherUserId.toString())
        });
        const subjectData = await db.collection('deal').findOne({
            _id: new ObjectId(chatDetail.subject.toString())
        });
        const name = await db.collection('auctionItems').findOne({
            _id: new ObjectId(subjectData ? subjectData.itemId.toString() : '')
        });
        output.push({
            chatId: chatDetail._id,
            withUser: otherUserData ? otherUserData.name : 'Unknown',
            OnSubject: name ? name.title : 'Unknown Subject'
        });
    }
    return res.status(200).json(output);
});
chatRouter.post('/sendMessage', async (req: Request, res: Response) => {
    const {message, chatId} = req.body;
    // console.log(message, chatId);
    const senderId = req.session.user.id;
    // console.log(senderId || 'no sender id');
    if (!senderId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    try {
        const result = await chatsCollection.updateOne(
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

        // console.log("--- MongoDB Update Result ---");
        // console.log("Matched Count:", result.matchedCount);
        // console.log("Modified Count:", result.modifiedCount);

        res.status(200).json({ status: 'Message sent' });
    } catch (err) {
        console.error("MongoDB error:", err);
        res.status(500).json({ error: 'DB error' });
    }
});

export default chatRouter;