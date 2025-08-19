import { db } from '../db';
import { 
  users, plans, megaCredentials, payments, apiUsage, auditLogs, systemSettings, 
  megaAccountStatus, apiKeys, files, userSubscriptions,
  User, Plan, MegaCredentials, Payment, ApiUsage, AuditLog, SystemSetting, 
  MegaAccountStatus, ApiKey, File, UserSubscription,
  InsertPlan, InsertPayment, InsertAuditLog, InsertSystemSetting,
  InsertMegaAccountStatus
} from '@shared/schema';
import { eq, desc, sql, count, sum, gte, lte, and, or, like, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { Storage } from 'megajs';

export interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: string;
  totalPayments: number;
  pendingPayments: number;
  apiCallsToday: number;
  activeApiKeys: number;
  megaAccountStatus?: MegaAccountStatus;
}

export interface UserStats extends User {
  plan?: Plan;
  totalFiles: number;
  totalApiCalls: number;
  lastActivity?: Date;
  paymentStatus: string;
}

export interface PaymentFilters {
  status?: string;
  paymentMethod?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ApiUsageFilters {
  userId?: string;
  apiKeyId?: string;
  endpoint?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export class AdminService {
  // User Management
  static async getAllUsers(page = 1, limit = 20, search?: string): Promise<{ users: UserStats[], total: number }> {
    try {
      let query = db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          firstName: users.firstName,
          lastName: users.lastName,
          planId: users.planId,
          storageUsed: users.storageUsed,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          plan: plans,
        })
        .from(users)
        .leftJoin(plans, eq(users.planId, plans.id));

      if (search) {
        query = query.where(
          or(
            like(users.email, `%${search}%`),
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.phone, `%${search}%`)
          )
        );
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(desc(users.createdAt));

      // Get additional stats for each user
      const userStats: UserStats[] = await Promise.all(
        results.map(async (user: any) => {
          const [fileCount, apiCallCount, lastPayment] = await Promise.all([
            db.select({ count: count() }).from(files).where(eq(files.userId, user.id)),
            db.select({ count: count() }).from(apiUsage).where(eq(apiUsage.userId, user.id)),
            db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(1)
          ]);

          return {
            ...user,
            totalFiles: fileCount[0]?.count || 0,
            totalApiCalls: apiCallCount[0]?.count || 0,
            paymentStatus: lastPayment[0]?.status || 'none'
          };
        })
      );

      const totalResult = await db.select({ count: count() }).from(users);
      const total = totalResult[0]?.count || 0;

      return { users: userStats, total };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  static async getUserById(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async suspendUser(id: string, adminId: string): Promise<void> {
    try {
      // Deactivate all user's API keys
      await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.userId, id));
      
      // Log the action
      await this.logAuditAction(adminId, 'user_suspended', 'user', id, null, { suspended: true });
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  // Payment Management
  static async getAllPayments(page = 1, limit = 20, filters?: PaymentFilters): Promise<{ payments: Payment[], total: number }> {
    try {
      let query = db
        .select({
          payment: payments,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          },
          plan: plans
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .leftJoin(plans, eq(payments.planId, plans.id));

      if (filters) {
        const conditions = [];
        if (filters.status) conditions.push(eq(payments.status, filters.status));
        if (filters.paymentMethod) conditions.push(eq(payments.paymentMethod, filters.paymentMethod));
        if (filters.userId) conditions.push(eq(payments.userId, filters.userId));
        if (filters.dateFrom) conditions.push(gte(payments.createdAt, filters.dateFrom));
        if (filters.dateTo) conditions.push(lte(payments.createdAt, filters.dateTo));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(desc(payments.createdAt));

      const totalResult = await db.select({ count: count() }).from(payments);
      const total = totalResult[0]?.count || 0;

      return { payments: results.map((r: any) => ({ ...r.payment, user: r.user, plan: r.plan })), total };
    } catch (error) {
      console.error('Error getting payments:', error);
      throw error;
    }
  }

  static async approvePayment(paymentId: string, adminId: string, notes?: string): Promise<Payment> {
    try {
      const result = await db.update(payments)
        .set({ 
          status: 'approved', 
          approvedBy: adminId, 
          approvedAt: new Date(),
          notes: notes || undefined,
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId))
        .returning();

      if (result[0]) {
        // Log the action
        await this.logAuditAction(adminId, 'payment_approved', 'payment', paymentId, { status: 'pending' }, { status: 'approved', notes });
        
        // Update user's plan if needed
        const payment = result[0];
        await db.update(users).set({ planId: payment.planId }).where(eq(users.id, payment.userId));
      }

      return result[0];
    } catch (error) {
      console.error('Error approving payment:', error);
      throw error;
    }
  }

  static async rejectPayment(paymentId: string, adminId: string, reason: string): Promise<Payment> {
    try {
      const result = await db.update(payments)
        .set({ 
          status: 'rejected', 
          approvedBy: adminId, 
          approvedAt: new Date(),
          notes: reason,
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId))
        .returning();

      if (result[0]) {
        // Log the action
        await this.logAuditAction(adminId, 'payment_rejected', 'payment', paymentId, { status: 'pending' }, { status: 'rejected', reason });
      }

      return result[0];
    } catch (error) {
      console.error('Error rejecting payment:', error);
      throw error;
    }
  }

  // API Management
  static async getAllApiKeys(page = 1, limit = 20, userId?: string): Promise<{ apiKeys: ApiKey[], total: number }> {
    try {
      let query = db
        .select({
          apiKey: apiKeys,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(apiKeys)
        .leftJoin(users, eq(apiKeys.userId, users.id));

      if (userId) {
        query = query.where(eq(apiKeys.userId, userId));
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(desc(apiKeys.createdAt));

      const totalResult = await db.select({ count: count() }).from(apiKeys);
      const total = totalResult[0]?.count || 0;

      return { apiKeys: results.map((r: any) => ({ ...r.apiKey, user: r.user })), total };
    } catch (error) {
      console.error('Error getting API keys:', error);
      throw error;
    }
  }

  static async getApiUsage(page = 1, limit = 20, filters?: ApiUsageFilters): Promise<{ usage: ApiUsage[], total: number }> {
    try {
      let query = db
        .select({
          usage: apiUsage,
          user: {
            id: users.id,
            email: users.email
          },
          apiKey: {
            id: apiKeys.id,
            name: apiKeys.name
          }
        })
        .from(apiUsage)
        .leftJoin(users, eq(apiUsage.userId, users.id))
        .leftJoin(apiKeys, eq(apiUsage.apiKeyId, apiKeys.id));

      if (filters) {
        const conditions = [];
        if (filters.userId) conditions.push(eq(apiUsage.userId, filters.userId));
        if (filters.apiKeyId) conditions.push(eq(apiUsage.apiKeyId, filters.apiKeyId));
        if (filters.endpoint) conditions.push(like(apiUsage.endpoint, `%${filters.endpoint}%`));
        if (filters.dateFrom) conditions.push(gte(apiUsage.createdAt, filters.dateFrom));
        if (filters.dateTo) conditions.push(lte(apiUsage.createdAt, filters.dateTo));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(desc(apiUsage.createdAt));

      const totalResult = await db.select({ count: count() }).from(apiUsage);
      const total = totalResult[0]?.count || 0;

      return { usage: results.map((r: any) => ({ ...r.usage, user: r.user, apiKey: r.apiKey })), total };
    } catch (error) {
      console.error('Error getting API usage:', error);
      throw error;
    }
  }

  static async revokeApiKey(keyId: string, adminId: string): Promise<void> {
    try {
      await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, keyId));
      await this.logAuditAction(adminId, 'api_key_revoked', 'api_key', keyId, { isActive: true }, { isActive: false });
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw error;
    }
  }

  // MEGA Management
  static async getMegaCredentials(): Promise<MegaCredentials | undefined> {
    try {
      const result = await db.select().from(megaCredentials).where(eq(megaCredentials.isActive, true)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting MEGA credentials:', error);
      return undefined;
    }
  }

  static async updateMegaCredentials(email: string, password: string): Promise<MegaCredentials> {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Deactivate existing credentials
      await db.update(megaCredentials).set({ isActive: false });
      
      // Create new credentials
      const result = await db.insert(megaCredentials).values({
        email,
        passwordHash,
        password, // Store plain password for MEGA API access
        isActive: true
      }).returning();

      return result[0];
    } catch (error) {
      console.error('Error updating MEGA credentials:', error);
      throw error;
    }
  }

  static async testMegaConnection(email: string, password: string): Promise<boolean> {
    try {
      const storage = new Storage({ email, password });
      await storage.ready;
      return true;
    } catch (error) {
      console.error('MEGA connection test failed:', error);
      return false;
    }
  }

  static async updateMegaAccountStatus(): Promise<MegaAccountStatus | null> {
    try {
      const credentials = await this.getMegaCredentials();
      if (!credentials) return null;

      const storage = new Storage({ email: credentials.email, password: credentials.password });
      await storage.ready;

      const accountInfo = await storage.getAccountInfo();
      
      const statusData: InsertMegaAccountStatus = {
        totalSpace: (accountInfo as any).spaceTotal?.toString() || '0',
        usedSpace: (accountInfo as any).spaceUsed?.toString() || '0',
        availableSpace: ((accountInfo as any).spaceTotal - (accountInfo as any).spaceUsed)?.toString() || '0',
        accountType: (accountInfo as any).type || 'free',
        transferQuota: (accountInfo as any).transferMax?.toString() || '0',
        transferUsed: (accountInfo as any).transferUsed?.toString() || '0',
        isConnected: true,
        lastChecked: new Date(),
        error: null
      };

      // Delete old records and insert new one
      await db.delete(megaAccountStatus);
      const result = await db.insert(megaAccountStatus).values(statusData).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating MEGA account status:', error);
      
      // Record the error
      await db.delete(megaAccountStatus);
      const result = await db.insert(megaAccountStatus).values({
        isConnected: false,
        lastChecked: new Date(),
        error: (error as Error).message
      }).returning();
      
      return result[0];
    }
  }

  static async getMegaAccountStatus(): Promise<MegaAccountStatus | null> {
    try {
      const result = await db.select().from(megaAccountStatus).orderBy(desc(megaAccountStatus.lastChecked)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting MEGA account status:', error);
      return null;
    }
  }

  // System Statistics
  static async getSystemStats(): Promise<SystemStats> {
    try {
      const [
        totalUsersResult,
        totalFilesResult,
        totalStorageResult,
        totalPaymentsResult,
        pendingPaymentsResult,
        apiCallsTodayResult,
        activeApiKeysResult,
        megaStatus
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(files),
        db.select({ total: sum(files.fileSize) }).from(files),
        db.select({ count: count() }).from(payments),
        db.select({ count: count() }).from(payments).where(eq(payments.status, 'pending')),
        db.select({ count: count() }).from(apiUsage).where(gte(apiUsage.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
        db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.isActive, true)),
        this.getMegaAccountStatus()
      ]);

      return {
        totalUsers: totalUsersResult[0]?.count || 0,
        totalFiles: totalFilesResult[0]?.count || 0,
        totalStorage: totalStorageResult[0]?.total || '0',
        totalPayments: totalPaymentsResult[0]?.count || 0,
        pendingPayments: pendingPaymentsResult[0]?.count || 0,
        apiCallsToday: apiCallsTodayResult[0]?.count || 0,
        activeApiKeys: activeApiKeysResult[0]?.count || 0,
        megaAccountStatus: megaStatus || undefined
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        totalUsers: 0,
        totalFiles: 0,
        totalStorage: '0',
        totalPayments: 0,
        pendingPayments: 0,
        apiCallsToday: 0,
        activeApiKeys: 0
      };
    }
  }

  // Audit Logging
  static async logAuditAction(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        adminUserId,
        action,
        targetType,
        targetId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  }

  static async getAuditLogs(page = 1, limit = 20, adminId?: string): Promise<{ logs: AuditLog[], total: number }> {
    try {
      let query = db
        .select({
          log: auditLogs,
          admin: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          }
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.adminUserId, users.id));

      if (adminId) {
        query = query.where(eq(auditLogs.adminUserId, adminId));
      }

      const offset = (page - 1) * limit;
      const results = await query.limit(limit).offset(offset).orderBy(desc(auditLogs.createdAt));

      const totalResult = await db.select({ count: count() }).from(auditLogs);
      const total = totalResult[0]?.count || 0;

      return { logs: results.map((r: any) => ({ ...r.log, admin: r.admin })), total };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  // Plan Management
  static async getPlans(): Promise<Plan[]> {
    try {
      return await db.select().from(plans).orderBy(plans.pricePerMonth);
    } catch (error) {
      console.error('Error getting plans:', error);
      throw error;
    }
  }

  static async createPlan(planData: InsertPlan): Promise<Plan> {
    try {
      const result = await db.insert(plans).values(planData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  static async updatePlan(id: string, updates: Partial<Plan>): Promise<Plan> {
    try {
      const result = await db.update(plans).set(updates).where(eq(plans.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  static async deletePlan(id: string): Promise<void> {
    try {
      await db.delete(plans).where(eq(plans.id, id));
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  }

  // System Settings
  static async getSystemSetting(key: string): Promise<SystemSetting | null> {
    try {
      const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error getting system setting:', error);
      return null;
    }
  }

  static async updateSystemSetting(key: string, value: string, description?: string, updatedBy?: string): Promise<SystemSetting> {
    try {
      const existing = await this.getSystemSetting(key);
      
      if (existing) {
        const result = await db.update(systemSettings)
          .set({ value, description, updatedBy, updatedAt: new Date() })
          .where(eq(systemSettings.key, key))
          .returning();
        return result[0];
      } else {
        const result = await db.insert(systemSettings)
          .values({ key, value, description, updatedBy })
          .returning();
        return result[0];
      }
    } catch (error) {
      console.error('Error updating system setting:', error);
      throw error;
    }
  }
}