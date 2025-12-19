import express from 'express';
import * as path from 'path';
import bodyParser from 'body-parser';
import mainRouter from './Router.js';
import session from "express-session";
import MongoStore from "connect-mongo";
import {client} from "./ConnectToDB.js";
import { fileURLToPath } from 'url';
import { runScheduledCleanup } from './auctionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/homePage.html'));
});

app.use(
    session({
        secret: "8f3b26fd27e28abf1750c65f2a27dfe94ac3b2b6a9ec55fc85d1bfbe47dbf0c3",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            client,
            dbName: "BidShark",
            collectionName: "sessions",
            ttl: 24 * 60 * 60,
            stringify: false,
        }),
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60,
        },
    })
);

app.use('/api', mainRouter);
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default app;