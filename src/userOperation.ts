import expressPkg from 'express';
import type { Request, Response } from 'express';
import { connectDB } from './ConnectToDB.js';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library'; 
import fs from 'fs';
import path from 'path';

const { Router } = expressPkg;
const loginRouter = Router();

// ==========================================
// Google OAuth 設定
// ==========================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// 1. 優先讀取我們手動設定的 BASE_URL (最穩，解決 Vercel 部署後的 redirect_uri_mismatch)
// 2. 如果沒有，嘗試讀取 Vercel 自動提供的網址 (記得補上 https://)
// 3. 最後才是 localhost (本地開發用)
const baseUrl = process.env.BASE_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const REDIRECT_URI = `${baseUrl}/api/auth/google/callback`;

// Debug: 方便在 Vercel Logs 確認當前使用的 callback 網址
console.log("Current Google OAuth Redirect URI:", REDIRECT_URI);

const oAuth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
);

// 2. [GET] /api/auth/google -> 啟動登入，導向 Google
loginRouter.get('/google', (req: Request, res: Response) => {
    // 確保 client 使用正確的 redirect uri
    oAuth2Client.redirectUri = REDIRECT_URI;

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ] 
    });

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
                image: picture, 
                googleId: payload.sub, 
                authType: 'google',    
                createdAt: new Date(),
                chat: [],
                
                // 🔥【關鍵修正】為了通過 MongoDB Validation
                password: "GOOGLE_LOGIN_NO_PASSWORD", 
                phone: "0000000000" // 必須符合 Regex (不能是空字串)
            };
            const result = await users.insertOne(newUser);
            user = { ...newUser, _id: result.insertedId };
        } 

        // D. 建立 Session (登入成功)
        if (req.session) {
            req.session.user = {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                image: user.image || picture,
                phoneNumber: user.phone || null,
                isLoggedIn: true // 確保與一般登入一致
            };
        }

        // E. 登入完成，跳轉回首頁
        res.redirect('/homePage.html');

    } catch (error: any) {
        // 如果是 Validation Error，印出詳細資訊方便除錯
        if (error.code === 121) {
            console.error("❌ MongoDB Validation Error Details:");
            console.dir(error.errInfo?.details, { depth: null, colors: true });
        }
        console.error('Google Auth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

// 一般註冊 (SignUp)
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
        
        const defaultProfilePath = path.join(process.cwd(), 'public', 'default-profile.svg');
        let img = '';
        if (fs.existsSync(defaultProfilePath)) {
            img = fs.readFileSync(defaultProfilePath, { encoding: 'base64' });
        }
        
        await users.insertOne({
            email: email,
            password: hashedPassword,
            name: email.split("@")[0],
            image: img,
            phone: "0000000000", // 確保一般註冊也有預設電話，避免未來驗證失敗
            chat: [],
            createdAt: new Date()
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

// 一般登入 (Login)
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
        
        // 如果是 Google 帳號但嘗試用密碼登入
        if (user.authType === 'google' && user.password === "GOOGLE_LOGIN_NO_PASSWORD") {
             return res.status(400).json({ status: 'error', message: 'Please login with Google' });
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