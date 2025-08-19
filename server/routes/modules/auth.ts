import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { RegistrationController } from '../../controllers/RegistrationController';
import { OtpController } from '../../controllers/OtpController';
import { AdminController } from '../../controllers/AdminController';

const authRouter = Router();

// Custom authentication routes
authRouter.post('/register', RegistrationController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/user', AuthController.getUser);

// OTP routes
authRouter.post('/send-otp', OtpController.sendOtp);
authRouter.post('/verify-otp', OtpController.verifyOtp);

// Public routes for registration
authRouter.get('/plans', AdminController.getPlans);

export { authRouter };