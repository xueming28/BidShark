import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.ts';
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
        _id: id
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
            if(m.speaker === req.session.userId){
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
chatRouter.get('getYourchats', async (req: Request, res: Response) => {
    const userId = req.session.userId;
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
    return res.status(200).json(chatIds);
});
chatRouter.post('/sendMessage', async (req: Request, res: Response) => {
    const {message, chatId} = req.body;
    const senderId = req.session.userId;
    if (!senderId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = await connectDB();
    const chatsCollection = db.collection('chat');
    chatsCollection.updateOne({
        _id: chatId
    }, {
        $push: {
            chat: {
                speaker: senderId,
                message: message
            }
        }
    })
    res.status(200).json({ status: 'Message sent' });
});



export default chatRouter;