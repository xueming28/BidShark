import { Router } from 'express';
import loginRouter from './userOperation';
import sessionInfo from './getSessionInfo';

const mainRouter = Router();


mainRouter.use('/auth', loginRouter);
mainRouter.use('/info', sessionInfo);


export default mainRouter;