import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { z } from 'zod';

const megaCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const planSchema = z.object({
  name: z.string().min(1),
  storageLimit: z.string(),
  pricePerMonth: z.string(),
  apiCallsPerHour: z.number(),
});

export class AdminController {
  static async getMegaCredentials(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await AdminService.getUserById(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const credentials = await AdminService.getMegaCredentials();
      res.json({ 
        credentials: credentials ? { 
          email: credentials.email, 
          hasPassword: !!credentials.passwordHash 
        } : null 
      });
    } catch (error) {
      console.error('Get MEGA credentials error:', error);
      res.status(500).json({ message: 'Failed to get MEGA credentials' });
    }
  }

  static async updateMegaCredentials(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await AdminService.getUserById(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { email, password } = megaCredentialsSchema.parse(req.body);

      // Test connection first
      const isValid = await AdminService.testMegaConnection(email, password);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid MEGA credentials' });
      }

      await AdminService.updateMegaCredentials(email, password);
      res.json({ message: 'MEGA credentials updated successfully' });
    } catch (error) {
      console.error('Update MEGA credentials error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update MEGA credentials' });
    }
  }

  static async getSystemStats(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await AdminService.getUserById(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const stats = await AdminService.getSystemStats();
      res.json({ stats });
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({ message: 'Failed to get system stats' });
    }
  }

  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await AdminService.getPlans();
      res.json({ plans });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ message: 'Failed to get plans' });
    }
  }

  static async createPlan(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await AdminService.getUserById(userId);

      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const planData = planSchema.parse(req.body);
      const plan = await AdminService.createPlan(planData);
      
      res.status(201).json({
        message: 'Plan created successfully',
        plan
      });
    } catch (error) {
      console.error('Create plan error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create plan' });
    }
  }
}