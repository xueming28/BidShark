import { Router } from 'express';
import loginRouter from './userOperation.js';
import sessionInfo from './getSessionInfo.js';
import dataRouter from "./dataManipulation.js";
import DBreader from "./getDBdata.js";
import chatRouter from "./chat.js";
import { getCartItems, checkout } from './cartService.js'; 
import { runScheduledCleanup } from './auctionService.js';
const mainRouter = Router();

mainRouter.use('/data', dataRouter);
mainRouter.use('/auth', loginRouter);
mainRouter.use('/info', sessionInfo);
mainRouter.use('/read', DBreader);
mainRouter.use('/chat', chatRouter);


mainRouter.get('/cart', async (req, res) => {
    try {
        // 假設你的 session 結構是 req.session.user.id
        // 如果是用 passport 或其他方式，請自行調整這裡的 userId 來源
        const userId = (req.session as any)?.user?.id || (req.session as any)?.user?._id; 
        
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized: Please login first' });
            return;
        }

        const items = await getCartItems(userId);
        res.json(items);
    } catch (error) {
        console.error('Cart fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});



mainRouter.post('/checkout', async (req, res) => {
    try {
        const userId = (req.session as any)?.user?.id || (req.session as any)?.user?._id;
        const { cartIds } = req.body; 

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        
        if (!cartIds || !Array.isArray(cartIds) || cartIds.length === 0) {
             res.status(400).json({ error: 'No items selected for checkout' });
             return;
        }

        const result = await checkout(userId, cartIds);
        res.json({ message: 'Checkout successful', result });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Checkout failed' });
    }
});

mainRouter.get('/test-force-cleanup', async (req, res) => {
    try {
        await runScheduledCleanup();
        res.send('Cleanup executed manually. Check server logs.');
    } catch (error) {
        res.status(500).send('Error during cleanup');
    }
});
export default mainRouter;