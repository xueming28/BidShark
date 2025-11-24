import { Router, Request, Response } from 'express';

const sessionInfo = Router();

sessionInfo.post('/session', async (req: Request, res: Response) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            isLoggedIn: false
        });
    }else{
        return res.status(200).json({
            id: req.session.user.id,
            email: req.session.user.email,
            name: req.session.user.name,
            isLoggedIn: true,
            image: req.session.user.image,
            phoneNumber: req.session.user.phoneNumber,
        })
    }
});
sessionInfo.post('/logout', (req: Request, res: Response) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ message: 'Logout failed' });
            }
            res.clearCookie('connect.sid');
            return res.status(200).json({ message: 'Logged out successfully' });
        });
    } else {
        return res.status(200).json({ message: 'No active session' });
    }
});
export default sessionInfo;