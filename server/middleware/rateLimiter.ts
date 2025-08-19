import rateLimit from 'express-rate-limit';
import { storage } from '../storage';

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req: any) => {
    try {
      if (req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        if (user?.planId === 'pro') return 5000;
        if (user?.planId === 'premium') return 10000;
      }
      return 1000; // default for basic
    } catch (error) {
      console.error('Rate limit check error:', error);
      return 100; // conservative fallback
    }
  },
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for portal endpoints
export const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});