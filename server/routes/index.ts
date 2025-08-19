import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../replitAuth";
import { authRouter } from "./modules/auth";
import { developerRouter } from "./modules/developer";
import { portalRouter } from "./modules/portal";
import { storage } from "../storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware setup
  await setupAuth(app);

  // Initialize default plans
  const existingPlans = await storage.getPlans();
  if (existingPlans.length === 0) {
    await storage.createPlan({
      id: 'basic',
      name: 'Basic',
      storageLimit: '2147483648', // 2GB
      pricePerMonth: '0',
      apiCallsPerHour: 100,
    });
    await storage.createPlan({
      id: 'pro',
      name: 'Pro',
      storageLimit: '5368709120', // 5GB
      pricePerMonth: '9.99',
      apiCallsPerHour: 1000,
    });
    await storage.createPlan({
      id: 'premium',
      name: 'Premium',
      storageLimit: '10737418240', // 10GB
      pricePerMonth: '19.99',
      apiCallsPerHour: 5000,
    });
  }

  // Mount module routes
  app.use('/api/auth', authRouter);
  app.use('/api/dev', developerRouter);
  app.use('/api/portal', portalRouter);

  // API documentation endpoint
  app.get('/api', (req, res) => {
    res.json({
      title: 'MEGA File Manager API',
      version: '1.0.0',
      description: 'RESTful API for MEGA cloud storage file management',
      modules: {
        auth: '/api/auth - Authentication endpoints',
        developer: '/api/dev - Developer API endpoints with API key authentication',
        portal: '/api/portal - End-user portal endpoints with session authentication'
      },
      documentation: '/api/dev/docs'
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return createServer(app);
}