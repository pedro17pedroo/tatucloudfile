import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const selectPlanSchema = z.object({
  planId: z.string().min(1),
});

export class UserController {
  static async selectPlan(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId || (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { planId } = selectPlanSchema.parse(req.body);
      
      // Check if plan exists
      const plans = await storage.getPlans();
      const planExists = plans.some(plan => plan.id === planId);
      if (!planExists) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }

      // Update user's plan
      await storage.updateUserPlan(userId, planId);
      
      res.json({
        message: 'Plan selected successfully',
        planId
      });
    } catch (error) {
      console.error('Select plan error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to select plan' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId || (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
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
          isAdmin: user.isAdmin,
          storageUsed: user.storageUsed
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  }
}