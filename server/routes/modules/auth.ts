import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { RegistrationController } from '../../controllers/RegistrationController';

const authRouter = Router();

// Custom authentication routes
authRouter.post('/register', RegistrationController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/user', AuthController.getUser);

export { authRouter };