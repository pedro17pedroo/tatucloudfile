import {
  users,
  plans,
  apiKeys,
  files,
  megaCredentials,
  apiUsage,
  userSubscriptions,
  payments,
  userSettings,
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
  type UserSubscription,
  type InsertUserSubscription,
  type Payment,
  type InsertPayment,
  type UserSettings,
  type InsertUserSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: any): Promise<User>;
  getUserByEmailOrPhone(emailOrPhone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  updateUserPlan(userId: string, planId: string): Promise<void>;
  
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
  
  // User subscriptions
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  getUserSubscriptions(userId: string): Promise<UserSubscription[]>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getUserPayments(userId: string): Promise<Payment[]>;
  
  // User settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // User profile
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone));
    return user;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.storageLimit);
  }

  async updateUserPlan(userId: string, planId: string): Promise<void> {
    await db
      .update(users)
      .set({ planId })
      .where(eq(users.id, userId));
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

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [result] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    return result;
  }

  async getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    return db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)).orderBy(desc(userSubscriptions.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return result;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  async updateUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings> {
    const [result] = await db
      .insert(userSettings)
      .values({ userId, ...settingsData, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { ...settingsData, updatedAt: new Date() }
      })
      .returning();
    return result;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

// Memory storage implementation for development
export class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private plans = new Map<string, Plan>();
  private apiKeys = new Map<string, ApiKey>();
  private files = new Map<string, File>();
  private megaCredentials: MegaCredentials | undefined;
  private apiUsageEntries: ApiUsage[] = [];
  private userSubscriptions = new Map<string, UserSubscription>();
  private payments = new Map<string, Payment>();
  private userSettings = new Map<string, UserSettings>();

  constructor() {
    // Initialize with default plans
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultPlans: Plan[] = [
      {
        id: 'basic',
        name: 'Basic',
        storageLimit: '5368709120', // 5GB
        pricePerMonth: '0',
        apiCallsPerHour: 100,
        createdAt: new Date(),
      },
      {
        id: 'pro',
        name: 'Pro',
        storageLimit: '53687091200', // 50GB
        pricePerMonth: '9.99',
        apiCallsPerHour: 1000,
        createdAt: new Date(),
      },
      {
        id: 'premium',
        name: 'Premium',
        storageLimit: '107374182400', // 100GB
        pricePerMonth: '19.99',
        apiCallsPerHour: 5000,
        createdAt: new Date(),
      },
    ];

    defaultPlans.forEach(plan => this.plans.set(plan.id, plan));

    // Create admin user
    const adminUser: User = {
      id: 'admin-1',
      email: 'admin@megafilemanager.com',
      phone: null,
      passwordHash: '$2b$10$rQZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9QZ9Q', // admin123
      firstName: 'Admin',
      lastName: 'User',
      profileImageUrl: null,
      planId: 'premium',
      storageUsed: '0',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id || '');
    const user: User = {
      id: userData.id || randomUUID(),
      email: userData.email || null,
      phone: userData.phone || null,
      passwordHash: userData.passwordHash || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      planId: userData.planId || 'basic',
      storageUsed: userData.storageUsed || '0',
      isAdmin: userData.isAdmin || false,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUserByEmailOrPhone(emailOrPhone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => {
      return (emailOrPhone.includes('@') && user.email === emailOrPhone) || 
             (!emailOrPhone.includes('@') && user.phone === emailOrPhone);
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phone === phone);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...existingUser, ...updates, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getPlans(): Promise<Plan[]> {
    return Array.from(this.plans.values()).sort((a, b) => 
      parseInt(a.storageLimit) - parseInt(b.storageLimit)
    );
  }

  async updateUserPlan(userId: string, planId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.planId = planId;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  async createPlan(plan: InsertPlan): Promise<Plan> {
    const newPlan: Plan = {
      ...plan,
      createdAt: new Date(),
    };
    this.plans.set(newPlan.id, newPlan);
    return newPlan;
  }

  async updatePlan(id: string, planData: Partial<InsertPlan>): Promise<Plan> {
    const existingPlan = this.plans.get(id);
    if (!existingPlan) throw new Error('Plan not found');
    
    const updatedPlan: Plan = {
      ...existingPlan,
      ...planData,
    };
    this.plans.set(id, updatedPlan);
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<void> {
    this.plans.delete(id);
  }

  async createApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = `mega_${randomUUID().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    
    const apiKey: ApiKey = {
      id: randomUUID(),
      userId,
      keyHash,
      name,
      isActive: true,
      lastUsed: null,
      createdAt: new Date(),
    };
    
    this.apiKeys.set(apiKey.id, apiKey);
    return { apiKey, rawKey };
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async validateApiKey(rawKey: string): Promise<ApiKey | undefined> {
    for (const key of Array.from(this.apiKeys.values())) {
      if (key.isActive && await bcrypt.compare(rawKey, key.keyHash)) {
        return key;
      }
    }
    return undefined;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.lastUsed = new Date();
      this.apiKeys.set(id, apiKey);
    }
  }

  async deleteApiKey(id: string): Promise<void> {
    this.apiKeys.delete(id);
  }

  async createFile(file: InsertFile): Promise<File> {
    const newFile: File = {
      id: randomUUID(),
      userId: file.userId,
      megaFileId: file.megaFileId,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType || null,
      filePath: file.filePath || null,
      uploadedAt: new Date(),
    };
    this.files.set(newFile.id, newFile);
    return newFile;
  }

  async getFilesByUserId(userId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.userId === userId)
      .sort((a, b) => (b.uploadedAt?.getTime() || 0) - (a.uploadedAt?.getTime() || 0));
  }

  async getFileById(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  async updateUserStorageUsed(userId: string, storageUsed: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.storageUsed = storageUsed;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  async getMegaCredentials(): Promise<MegaCredentials | undefined> {
    return this.megaCredentials;
  }

  async upsertMegaCredentials(credentials: InsertMegaCredentials): Promise<MegaCredentials> {
    const passwordHash = await bcrypt.hash(credentials.passwordHash, 10);
    
    this.megaCredentials = {
      id: randomUUID(),
      ...credentials,
      passwordHash,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return this.megaCredentials;
  }

  async logApiUsage(usage: Omit<ApiUsage, 'id' | 'timestamp'>): Promise<void> {
    const apiUsageEntry: ApiUsage = {
      id: randomUUID(),
      ...usage,
      timestamp: new Date(),
    };
    this.apiUsageEntries.push(apiUsageEntry);
  }

  async getApiUsageStats(userId: string): Promise<{ total: number; lastHour: number }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const userUsage = this.apiUsageEntries.filter(usage => usage.userId === userId);
    
    return {
      total: userUsage.length,
      lastHour: userUsage.filter(usage => (usage.timestamp?.getTime() || 0) > oneHourAgo.getTime()).length,
    };
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const result: UserSubscription = {
      id: randomUUID(),
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status || 'active',
      startDate: subscription.startDate || new Date(),
      endDate: subscription.endDate || null,
      createdAt: new Date(),
    };
    this.userSubscriptions.set(result.id, result);
    return result;
  }

  async getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    return Array.from(this.userSubscriptions.values())
      .filter(sub => sub.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result: Payment = {
      id: randomUUID(),
      userId: payment.userId,
      subscriptionId: payment.subscriptionId || null,
      planId: payment.planId,
      amount: payment.amount,
      currency: payment.currency || 'EUR',
      status: payment.status || 'pending',
      paymentMethod: payment.paymentMethod || null,
      transactionId: payment.transactionId || null,
      receiptUrl: payment.receiptUrl || null,
      createdAt: new Date(),
      paidAt: payment.paidAt || null,
    };
    this.payments.set(result.id, result);
    return result;
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(payment => payment.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return this.userSettings.get(userId);
  }

  async updateUserSettings(userId: string, settingsData: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existingSettings = this.userSettings.get(userId);
    const result: UserSettings = {
      id: existingSettings?.id || randomUUID(),
      userId,
      notifications: true,
      theme: 'light',
      language: 'pt',
      timezone: 'Europe/Lisbon',
      ...existingSettings,
      ...settingsData,
      updatedAt: new Date(),
    };
    this.userSettings.set(userId, result);
    return result;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = passwordHash;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }
}

// Use database storage if available, otherwise use memory storage
export const storage = db ? new DatabaseStorage() : new MemoryStorage();
