import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { storage } from '../storage';

const registrationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6),
  planId: z.string().min(1), // Plano obrigatório durante registro
}).refine((data) => data.email || data.phone, {
  message: "Email or phone is required",
});

export class RegistrationController {
  static async register(req: Request, res: Response) {
    try {
      const { email, phone, firstName, lastName, password, planId } = registrationSchema.parse(req.body);

      // Check if plan exists
      const plans = await storage.getPlans();
      const planExists = plans.some(plan => plan.id === planId);
      if (!planExists) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }

      // Check if user already exists
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: 'User with this email already exists' });
        }
      }

      if (phone) {
        const existingUser = await storage.getUserByPhone(phone);
        if (existingUser) {
          return res.status(400).json({ message: 'User with this phone already exists' });
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with mandatory plan
      const user = await storage.createUser({
        email,
        phone,
        firstName,
        lastName,
        passwordHash,
        planId, // Plano obrigatório
        isAdmin: false,
        storageUsed: '0',
      });

      // Create session
      (req.session as any).userId = user.id;

      res.status(201).json({
        message: 'Registration successful',
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
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  }
}