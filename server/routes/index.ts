import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../replitAuth";
import { authRouter } from "./modules/auth";
import { developerRouter } from "./modules/developer";
import { portalRouter } from "./modules/portal";
import { db } from "../db";
import { 
  users, plans, megaCredentials, payments, apiUsage, auditLogs, 
  systemSettings, megaAccountStatus, apiKeys, files, userSubscriptions
} from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from 'bcrypt';

async function initializeDatabase() {
  console.log('[Database] Initializing database schema and data...');
  
  try {
    // Initialize default plans
    const existingPlans = await db.select().from(plans);
    console.log(`[Plans] Found ${existingPlans.length} existing plans:`, existingPlans.map(p => `${p.name}: ${p.storageLimit} bytes`));
    
    if (existingPlans.length === 0) {
      console.log('[Plans] Creating default plans...');
      await db.insert(plans).values([
        {
          id: 'basic',
          name: 'Basic',
          storageLimit: '2147483648', // 2GB
          pricePerMonth: '0',
          apiCallsPerHour: 100,
        },
        {
          id: 'pro',
          name: 'Pro',
          storageLimit: '5368709120', // 5GB
          pricePerMonth: '9.99',
          apiCallsPerHour: 1000,
        },
        {
          id: 'premium',
          name: 'Premium',
          storageLimit: '10737418240', // 10GB
          pricePerMonth: '19.99',
          apiCallsPerHour: 5000,
        }
      ]);
      console.log('[Plans] Default plans created successfully');
    } else {
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
          await db.update(plans).set({ storageLimit: expectedLimit }).where(eq(plans.id, plan.id));
          needsCorrection = true;
        }
      }
      
      if (needsCorrection) {
        console.log('[Plans] Storage limits corrected');
      }
    }

    // Initialize default admin user AFTER plans are created
    const adminEmail = 'admin@megafilemanager.com';
    const existingAdmins = await db.select().from(users).where(eq(users.email, adminEmail));
    let existingAdmin = existingAdmins[0];
    
    if (!existingAdmin) {
      console.log('[Admin] Creating default admin user...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await db.insert(users).values({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
        planId: 'premium',
        passwordHash,
        isAdmin: true,
        storageUsed: '0'
      }).returning();
      
      existingAdmin = newAdmin[0];
      console.log('[Admin] Default admin user created: admin@megafilemanager.com / admin123');
    } else {
      console.log('[Admin] Admin user already exists');
      
      // Ensure admin has Premium plan and admin privileges
      if (!existingAdmin.isAdmin || existingAdmin.planId !== 'premium') {
        console.log('[Admin] Updating admin user privileges...');
        await db.update(users)
          .set({ isAdmin: true, planId: 'premium' })
          .where(eq(users.id, existingAdmin.id));
      }
    }

    // Grant admin privileges to test user  
    const testUserEmail = 'pedro17pedroo@gmail.com';
    const testUsers = await db.select().from(users).where(eq(users.email, testUserEmail));
    if (testUsers.length > 0) {
      const testUser = testUsers[0];
      if (!testUser.isAdmin) {
        console.log('[Admin] Granting admin privileges to test user...');
        await db.update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, testUser.id));
      }
    }

    console.log('[Database] Initialization completed successfully');
    
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database first
  await initializeDatabase();
  
  // Auth middleware setup
  await setupAuth(app);

  // Mount module routes
  app.use('/api/auth', authRouter);
  app.use('/api/dev', developerRouter);
  app.use('/api/portal', portalRouter);

  // API documentation endpoint
  app.get('/api', (req: any, res: any) => {
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
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return createServer(app);
}