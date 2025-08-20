import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { RegistrationController } from '../../controllers/RegistrationController';
import { OtpController } from '../../controllers/OtpController';
import { ProfileController } from '../../controllers/ProfileController';
import { AdminController } from '../../controllers/AdminController';
import { db } from '../../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const authRouter = Router();

// Custom authentication routes
authRouter.post('/register', RegistrationController.register);
authRouter.post('/check-user-exists', RegistrationController.checkUserExists);
authRouter.post('/login', AuthController.login);
authRouter.post('/logout', AuthController.logout);
authRouter.get('/user', AuthController.getUser);

// OTP routes
authRouter.post('/send-otp', OtpController.sendOtp);
authRouter.post('/verify-otp', OtpController.verifyOtp);

// Profile management routes
authRouter.put('/profile', ProfileController.updateProfile);
authRouter.put('/change-password', ProfileController.changePassword);

// Public routes for registration
authRouter.get('/plans', AdminController.getPlans);

// Admin login route
authRouter.post('/admin-login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e password são obrigatórios' });
    }

    // Find user by email
    const { db } = await import('../../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const userResult = await db.select().from(users).where(eq(users.email, email));
    const user = userResult[0];
    
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Check password
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Check if user is admin
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Acesso administrativo necessário' });
    }

    // Set session
    req.session.userId = user.id;
    
    res.json({
      message: 'Login administrativo realizado com sucesso',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        planId: user.planId,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export { authRouter };