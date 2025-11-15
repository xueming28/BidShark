import { connectDB } from "./ConnectToDB";

async function main() {
    const db = await connectDB();         // wait for DB connection
    const users = db.collection("Users"); // get your collection
    await users.insertOne({ email: "example@yahoo.com",password: "123456" });
    const result = await users.find().toArray();
    console.log(result);
}

main();