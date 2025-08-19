import { Request, Response } from 'express';
import { storage } from '../storage';
import bcrypt from 'bcrypt';

export class UserProfileController {
  static async getUserSubscriptions(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const subscriptions = await storage.getUserSubscriptions(req.user.id);
      res.json(subscriptions);
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUserPayments(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const payments = await storage.getUserPayments(req.user.id);
      res.json(payments);
    } catch (error) {
      console.error('Error fetching user payments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: 'User not found or no password set' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await storage.updateUserPassword(req.user.id, hashedNewPassword);

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async changePlan(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }

      // Verify plan exists
      const plans = await storage.getPlans();
      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) {
        return res.status(400).json({ message: 'Invalid plan ID' });
      }

      // Update user plan
      await storage.updateUserPlan(req.user.id, planId);

      // Create subscription record
      await storage.createUserSubscription({
        userId: req.user.id,
        planId: planId,
        status: 'active',
        startDate: new Date(),
      });

      // Create payment record (in real app, this would be after actual payment)
      await storage.createPayment({
        userId: req.user.id,
        planId: planId,
        amount: selectedPlan.pricePerMonth,
        currency: 'EUR',
        status: 'completed',
        paymentMethod: 'system_change',
        paidAt: new Date(),
      });

      res.json({ message: 'Plan updated successfully' });
    } catch (error) {
      console.error('Error changing plan:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUserSettings(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const settings = await storage.getUserSettings(req.user.id);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching user settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async updateUserSettings(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const settings = await storage.updateUserSettings(req.user.id, req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}