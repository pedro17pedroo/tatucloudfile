import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';

const authRouter = Router();

// Custom authentication routes
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/user', AuthController.getUser);

export { authRouter };