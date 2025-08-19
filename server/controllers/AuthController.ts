import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  emailOrPhone: z.string().min(1),
  password: z.string().min(6),
});

const loginSchema = z.object({
  emailOrPhone: z.string().min(1),
  password: z.string().min(1),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { firstName, lastName, emailOrPhone, password } = registerSchema.parse(req.body);

      const user = await AuthService.register({
        firstName,
        lastName,
        emailOrPhone,
        password,
      });

      res.status(201).json({
        message: 'Conta criada com sucesso',
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if ((error as any).message?.includes('duplicate key')) {
        return res.status(400).json({ message: 'Email ou telefone já está em uso' });
      }
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { emailOrPhone, password } = loginSchema.parse(req.body);

      const user = await AuthService.login(emailOrPhone, password);
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.json({
        message: 'Login realizado com sucesso',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          planId: user.planId
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(401).json({ message: 'Credenciais inválidas' });
    }
  }

  static async logout(req: Request, res: Response) {
    req.session.destroy(() => {
      res.json({ message: 'Logout realizado com sucesso' });
    });
  }

  static async getUser(req: Request, res: Response) {
    try {
      // Check for userId in session (custom registration) or Replit OAuth
      const sessionUserId = (req.session as any)?.userId;
      const oauthUserId = (req as any).user?.claims?.sub;
      const userId = sessionUserId || oauthUserId;
      
      console.log(`[Auth] Session userId: ${sessionUserId}, OAuth userId: ${oauthUserId}, Final userId: ${userId}`);
      
      if (!userId) {
        console.log('[Auth] No userId found in session or OAuth');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          planId: user.planId,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}