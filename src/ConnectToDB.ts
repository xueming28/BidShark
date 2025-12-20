import {MongoClient, ServerApiVersion, Db} from 'mongodb';
const uri = "mongodb+srv://linzhewei123_db_user:asVZV275tIK7cGiv@cluster0.xkzri2v.mongodb.net/?appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectDB() {
    // 1. 如果已經有連線，直接回傳 (快取)
    if (cachedClient && cachedDb) {
        return cachedDb;
    }

    // 2. 如果沒有，建立新連線
    const client = new MongoClient(uri);

    await client.connect();
    
    const db = client.db('BidShark'); 

    // 3. 儲存到變數中以便下次使用
    cachedClient = client;
    cachedDb = db;

    return db;
}