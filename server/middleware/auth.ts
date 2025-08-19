import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// API key authentication middleware
export async function authenticateApiKey(req: any, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'API key required' });
    }

    const apiKey = authHeader.substring(7);
    const validKey = await storage.validateApiKey(apiKey);
    
    if (!validKey) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    await storage.updateApiKeyLastUsed(validKey.id);
    req.apiKey = validKey;
    req.user = { claims: { sub: validKey.userId } };
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
}

// Session-based authentication middleware
export async function authenticateUser(req: any, res: Response, next: NextFunction) {
  try {
    const userId = (req.session as any)?.userId || req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if non-admin users have a plan
    if (!user.isAdmin && !user.planId) {
      return res.status(403).json({ 
        message: 'Plan required', 
        redirectTo: '/plans',
        error: 'NO_PLAN'
      });
    }

    req.user = { claims: { sub: user.id } };
    req.currentUser = user;
    next();
  } catch (error) {
    console.error('User authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
}

// Admin authorization middleware
export async function isAdmin(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ message: 'Authorization error' });
  }
}