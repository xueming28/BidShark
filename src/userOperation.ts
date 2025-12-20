import type { Request, Response } from 'express';
import expressPkg from 'express';
import { connectDB } from './ConnectToDB.js';
import fs from 'fs';
import bcrypt from 'bcrypt';

const { Router } = expressPkg;
const loginRouter = Router();
loginRouter.post('/SignUp',async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const db = await connectDB();
        const users = db.collection('Users');
        const existingUser = await users.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists!' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const img = fs.readFileSync('public/default-profile.svg', { encoding: 'base64' })
        await users.insertOne({
            email: email,
            password: hashedPassword,
            name: email.split("@")[0],
            image:  img
        });
        const user = await users.findOne({ email: email });
        req.session.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            isLoggedIn: true,
            image: user.image,
            phoneNumber: user.phone || null
        };
        return res.status(201).json({ status: 'success', message: 'User created' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Something is wrong' });
    }
});

loginRouter.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const db = await connectDB();
        const users = db.collection('Users');
        const user = await users.findOne({ email });
        if (!user) {
            return res.status(409).json({ error: 'User does not exist!' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = {
                id: user._id.toString(),
                email: email,
                name: user.name,
                isLoggedIn: true,
                image: user.image,
                phoneNumber: user.phone || null
            };
            return res.status(201).json({ status: 'success', message: 'Logged in successfully!' });
        }else{
            return res.status(409).json({status:'error', message: 'Invalid Password!'});
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Something is wrong' });
    }
});

export default loginRouter;