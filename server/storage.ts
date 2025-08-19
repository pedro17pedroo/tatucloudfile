import {
  users,
  plans,
  apiKeys,
  files,
  megaCredentials,
  apiUsage,
  type User,
  type UpsertUser,
  type Plan,
  type InsertPlan,
  type ApiKey,
  type InsertApiKey,
  type File,
  type InsertFile,
  type MegaCredentials,
  type InsertMegaCredentials,
  type ApiUsage,
  type InsertApiUsage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Plan operations
  getPlans(): Promise<Plan[]>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, plan: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;
  
  // API Key operations
  createApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; rawKey: string }>;
  getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
  validateApiKey(keyHash: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  deleteApiKey(id: string): Promise<void>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFilesByUserId(userId: string): Promise<File[]>;
  getFileById(id: string): Promise<File | undefined>;
  deleteFile(id: string): Promise<void>;
  updateUserStorageUsed(userId: string, storageUsed: string): Promise<void>;
  
  // MEGA credentials (admin only)
  getMegaCredentials(): Promise<MegaCredentials | undefined>;
  upsertMegaCredentials(credentials: InsertMegaCredentials): Promise<MegaCredentials>;
  
  // Usage tracking
  logApiUsage(usage: Omit<ApiUsage, 'id' | 'timestamp'>): Promise<void>;
  getApiUsageStats(userId: string): Promise<{ total: number; lastHour: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUserByEmailOrPhone(emailOrPhone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        emailOrPhone.includes('@') 
          ? eq(users.email, emailOrPhone)
          : eq(users.phone, emailOrPhone)
      );
    return user;
  }

  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.storageLimit);
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const [newPlan] = await db.insert(plans).values(plan).returning();
    return newPlan;
  }

  async updatePlan(id: string, planData: Partial<InsertPlan>): Promise<Plan> {
    const [updatedPlan] = await db
      .update(plans)
      .set(planData)
      .where(eq(plans.id, id))
      .returning();
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  async createApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `mega_${randomUUID().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId,
        keyHash,
        name,
      })
      .returning();
    
    return { apiKey, rawKey };
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async validateApiKey(rawKey: string): Promise<ApiKey | undefined> {
    const allKeys = await db.select().from(apiKeys).where(eq(apiKeys.isActive, true));
    
    for (const key of allKeys) {
      if (await bcrypt.compare(rawKey, key.keyHash)) {
        return key;
      }
    }
    
    return undefined;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async createFile(file: InsertFile): Promise<File> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.uploadedAt));
  }

  async getFileById(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async updateUserStorageUsed(userId: string, storageUsed: string): Promise<void> {
    await db
      .update(users)
      .set({ storageUsed })
      .where(eq(users.id, userId));
  }

  async getMegaCredentials(): Promise<MegaCredentials | undefined> {
    const [credentials] = await db
      .select()
      .from(megaCredentials)
      .where(eq(megaCredentials.isActive, true))
      .limit(1);
    return credentials;
  }

  async upsertMegaCredentials(credentials: InsertMegaCredentials): Promise<MegaCredentials> {
    // Deactivate all existing credentials
    await db.update(megaCredentials).set({ isActive: false });
    
    // Hash the password
    const passwordHash = await bcrypt.hash(credentials.passwordHash, 10);
    
    const [newCredentials] = await db
      .insert(megaCredentials)
      .values({
        ...credentials,
        passwordHash,
      })
      .returning();
    
    return newCredentials;
  }

  async logApiUsage(usage: Omit<ApiUsage, 'id' | 'timestamp'>): Promise<void> {
    await db.insert(apiUsage).values(usage);
  }

  async getApiUsageStats(userId: string): Promise<{ total: number; lastHour: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiUsage)
      .where(eq(apiUsage.userId, userId));
    
    const [lastHourResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiUsage)
      .where(and(
        eq(apiUsage.userId, userId),
        sql`${apiUsage.timestamp} > ${oneHourAgo}`
      ));
    
    return {
      total: totalResult?.count || 0,
      lastHour: lastHourResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
