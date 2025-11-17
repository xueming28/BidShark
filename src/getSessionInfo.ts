import { Router, Request, Response } from 'express';

const sessionInfo = Router();

sessionInfo.post('/session', async (req: Request, res: Response) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            isLoggedIn: false
        });
    }else{
        return res.status(200).json({
            email: req.session.user.email,
            name: req.session.user.name,
            isLoggedIn: true
        })
    }
});
export default sessionInfo;