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
  console.log(`[Plans] Found ${existingPlans.length} existing plans:`, existingPlans.map(p => `${p.name}: ${p.storageLimit} bytes`));
  
  // Check if any plan has incorrect storage limits and fix them
  const expectedLimits: Record<string, string> = {
    'basic': '2147483648',   // 2GB
    'pro': '5368709120',     // 5GB  
    'premium': '10737418240' // 10GB
  };
  
  let needsCorrection = false;
  for (const plan of existingPlans) {
    const expectedLimit = expectedLimits[plan.id];
    if (expectedLimit && plan.storageLimit !== expectedLimit) {
      console.log(`[Plans] Correcting ${plan.name} storage limit from ${plan.storageLimit} to ${expectedLimit}`);
      await storage.updatePlan(plan.id, { storageLimit: expectedLimit });
      needsCorrection = true;
    }
  }
  
  if (needsCorrection) {
    console.log('[Plans] Storage limits corrected');
  }
  
  if (existingPlans.length === 0) {
    console.log('[Plans] Creating default plans...');
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
    console.log('[Plans] Default plans created successfully');
  }

  // Initialize default admin user AFTER plans are created
  const adminEmail = 'admin@megafilemanager.com';
  let existingAdmin = await storage.getUserByEmail(adminEmail);
  
  if (!existingAdmin) {
    console.log('[Admin] Creating default admin user...');
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    existingAdmin = await storage.createUser({
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      planId: 'premium',
      isAdmin: true
    });
    console.log('[Admin] Default admin user created: admin@megafilemanager.com / admin123');
  } else {
    console.log('[Admin] Admin user already exists');
  }

  // For development: Make the test user an admin so they can configure MEGA credentials
  const testUserEmail = 'pedro17pedroo@gmail.com';
  const testUser = await storage.getUserByEmail(testUserEmail);
  if (testUser && !testUser.isAdmin) {
    console.log('[Admin] Making test user admin for MEGA configuration...');
    await storage.updateUser(testUser.id, { isAdmin: true });
    console.log('[Admin] Test user is now admin');
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