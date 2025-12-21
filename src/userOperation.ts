import expressPkg from 'express';
import type { Request, Response } from 'express';
import { connectDB } from './ConnectToDB.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library'; // 1. 引入 Google 套件
import fs from 'fs';
import path from 'path';

const { Router } = expressPkg;
const loginRouter = Router();

// ==========================================
// Google OAuth 設定
// ==========================================
// 請確保這些變數在 .env (本地) 和 Vercel Environment Variables 中都有設定
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// 動態判斷 Redirect URI (本地 vs 線上)
// 確保這個邏輯能正確抓到當前的網域
const REDIRECT_URI = process.env.NODE_ENV === 'production'
    ? `https://${process.env.VERCEL_URL}/api/auth/google/callback` // Vercel 會自動提供這個變數
    : 'http://localhost:3000/api/auth/google/callback';

const oAuth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

// 2. [GET] /api/auth/google -> 啟動登入，導向 Google
loginRouter.get('/google', (req: Request, res: Response) => {
    // 修正 REDIRECT_URI (有時候 Vercel URL 沒帶 https)
    const redirectUrl = process.env.NODE_ENV === 'production'
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}/api/auth/google/callback`
        : 'http://localhost:3000/api/auth/google/callback';

    // 重新設定 client 的 redirect uri (保險起見)
    oAuth2Client.redirectUri = redirectUrl;

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ] // 我們要請求的資料：個人資料和 Email
    });

    // 讓前端跳轉到 Google 登入頁
    res.redirect(authUrl);
});

// 3. [GET] /api/auth/google/callback -> Google 登入後跳回來這裡
loginRouter.get('/google/callback', async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
        return res.status(400).send('Invalid request: No code provided');
    }

    try {
        // A. 用 Code 換取 Token
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // B. 取得使用者資訊
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).send('Google login failed: No email info');
        }

        const email = payload.email;
        const name = payload.name || 'Google User';
        const picture = payload.picture;

        // C. 資料庫操作
        const db = await connectDB();
        const users = db.collection('Users');

        // 檢查使用者是否存在
        let user = await users.findOne({ email });

        if (!user) {
            // 如果是新使用者，自動註冊
            const newUser = {
                email,
                name,
                image: picture, // 存入 Google 大頭貼
                googleId: payload.sub, // 紀錄 Google ID
                authType: 'google',    // 標記為 Google 登入
                createdAt: new Date(),
                chat: [],
                password: "GOOGLE_LOGIN_NO_PASSWORD", // 給一個隨機字串當佔位符
                phone: "0000000000" 
            };
            const result = await users.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
        } else {
            // 如果是舊使用者，可以選擇更新頭像 (可選)
            // await users.updateOne({ _id: user._id }, { $set: { image: picture } });
        }

        // D. 建立 Session (登入成功)
        if (req.session) {
            req.session.user = {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                image: user.image || picture,
                phoneNumber: user.phone
            };
        }

        // E. 登入完成，跳轉回首頁
        // 因為這是後端 Redirect，瀏覽器會直接跳轉
        res.redirect('/homePage.html');

    } catch (error) {
        if (error.code === 121) {
            console.error("❌ MongoDB Validation Error Details:");
            console.dir(error.errInfo?.details, { depth: null, colors: true });
        }
        console.error('Google Auth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

loginRouter.post('/SignUp', async (req: Request, res: Response) => {
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
        //const img = fs.readFileSync('public/default-profile.svg', { encoding: 'base64' })
        const defaultProfilePath = path.join(process.cwd(), 'public', 'default-profile.svg');
        let img = '';
        if (fs.existsSync(defaultProfilePath)) {
            img = fs.readFileSync(defaultProfilePath, { encoding: 'base64' });
        }
        await users.insertOne({
            email: email,
            password: hashedPassword,
            name: email.split("@")[0],
            image: img
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
        } else {
            return res.status(409).json({ status: 'error', message: 'Invalid Password!' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Something is wrong' });
    }
});

export default loginRouter;