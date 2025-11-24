import { Router } from 'express';
import loginRouter from './userOperation.ts';
import sessionInfo from './getSessionInfo.ts';

const mainRouter = Router();


mainRouter.use('/auth', loginRouter);
mainRouter.use('/info', sessionInfo);


export default mainRouter;