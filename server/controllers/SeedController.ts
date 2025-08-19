import { Request, Response } from 'express';
import { seedDatabase } from '../db/seed';
import { storage } from '../storage';

export class SeedController {
  static async seedDatabase(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      await seedDatabase();
      
      res.json({
        message: 'Database seeded successfully',
        testAccounts: {
          admin: { email: 'admin@megafilemanager.com', password: 'admin123', plan: 'premium' },
          user: { email: 'user@test.com', password: 'user123', plan: 'pro' },
          phoneUser: { phone: '+351912345678', password: 'phone123', plan: 'basic' }
        }
      });
    } catch (error) {
      console.error('Seed database error:', error);
      res.status(500).json({ message: 'Failed to seed database' });
    }
  }

  static async createTestApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Create API key for test user
      const testUser = await storage.getUserByEmailOrPhone('user@test.com');
      if (!testUser) {
        return res.status(404).json({ message: 'Test user not found' });
      }

      const result = await storage.createApiKey(testUser.id, 'Test API Key');
      
      res.json({
        message: 'Test API key created successfully',
        apiKey: {
          id: result.apiKey.id,
          name: result.apiKey.name,
          rawKey: result.rawKey,
          userId: testUser.id,
          userEmail: testUser.email
        }
      });
    } catch (error) {
      console.error('Create test API key error:', error);
      res.status(500).json({ message: 'Failed to create test API key' });
    }
  }
}