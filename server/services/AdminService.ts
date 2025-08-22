import { db } from '../db';
import { 
  users, plans, megaCredentials, payments, apiUsage, auditLogs, systemSettings, 
  megaAccountStatus, apiKeys, files, userSubscriptions, paymentMethods, paymentProofs,
  User, Plan, MegaCredentials, Payment, ApiUsage, AuditLog, SystemSetting, 
  MegaAccountStatus, ApiKey, File, UserSubscription, PaymentMethod, PaymentProof,
  InsertPlan, InsertPayment, InsertAuditLog, InsertSystemSetting,
  InsertMegaAccountStatus, InsertPaymentMethod, InsertPaymentProof
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

  static async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    planId: string;
    isAdmin?: boolean;
  }): Promise<User | null> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          planId: userData.planId,
          isAdmin: userData.isAdmin || false,
          storageUsed: '0',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return newUser || null;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  static async resetUserPassword(userId: string): Promise<string> {
    try {
      // Generate a random 12-character password
      const newPassword = Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      return newPassword;
    } catch (error) {
      console.error('Reset user password error:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      // Delete related records first (cascade delete)
      await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
      await db.delete(files).where(eq(files.userId, userId));
      await db.delete(payments).where(eq(payments.userId, userId));
      await db.delete(apiUsage).where(eq(apiUsage.userId, userId));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
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
      const { PasswordEncryption } = await import('../utils/encryption');
      const passwordHash = await bcrypt.hash(password, 10);
      const encryptedPassword = PasswordEncryption.encrypt(password);
      
      // Deactivate existing credentials
      await db.update(megaCredentials).set({ isActive: false });
      
      // Create new credentials with encrypted password
      const result = await db.insert(megaCredentials).values({
        email,
        passwordHash,
        encryptedPassword, // Store encrypted password for MEGA API access
        isActive: true
      }).returning();

      console.log('[MEGA Security] Password encrypted and stored securely');

      // Automatically update account status after successful credential save
      setTimeout(async () => {
        try {
          await this.updateMegaAccountStatus();
          console.log('[MEGA] Account status updated after credential save');
        } catch (error) {
          console.error('[MEGA] Failed to auto-update account status:', error);
        }
      }, 1000);

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

      const { PasswordEncryption } = await import('../utils/encryption');
      const decryptedPassword = PasswordEncryption.decrypt(credentials.encryptedPassword!);

      console.log('[MEGA Status] Connecting to get account info...');
      const storage = new Storage({ email: credentials.email, password: decryptedPassword });
      await storage.ready;

      console.log('[MEGA Status] Connected, retrieving account information...');
      
      // Wait for storage to fully initialize and get account info
      let totalSpace = 0;
      let usedSpace = 0;
      let transferQuota = 0;
      let transferUsed = 0;
      
      // Try multiple methods to get account information
      try {
        // Method 1: Direct properties (might not be immediately available)
        const storageAny = storage as any;
        if (storageAny.spaceTotal && storageAny.spaceTotal > 0) {
          totalSpace = storageAny.spaceTotal;
          usedSpace = storageAny.spaceUsed || 0;
          transferQuota = storageAny.downloadBandwidthTotal || 0;
          transferUsed = storageAny.downloadBandwidthUsed || 0;
        } else {
          // Method 2: Force refresh by accessing account info
          console.log('[MEGA Status] Forcing account info refresh...');
          
          // Access the root to trigger account info loading
          await storage.root;
          
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          totalSpace = storageAny.spaceTotal || 0;
          usedSpace = storageAny.spaceUsed || 0;
          transferQuota = storageAny.downloadBandwidthTotal || 0;
          transferUsed = storageAny.downloadBandwidthUsed || 0;
          
          // Method 3: If still no data, try to get from account info API
          if (totalSpace === 0) {
            console.log('[MEGA Status] Trying alternative method to get account info...');
            
            // Get account information from storage internals
            if (storageAny.api && storageAny.api.request) {
              try {
                const accountInfo: any = await storageAny.api.request({a: 'uq', strg: 1});
                console.log('[MEGA Status] Raw account info:', accountInfo);
                
                if (accountInfo && accountInfo.mstrg !== undefined) {
                  totalSpace = accountInfo.mstrg || 0;
                  usedSpace = accountInfo.cstrg || 0;
                }
              } catch (apiError) {
                console.log('[MEGA Status] API request failed:', apiError);
              }
            }
          }
        }
      } catch (infoError) {
        console.log('[MEGA Status] Error getting detailed account info:', infoError);
      }
      
      const availableSpace = Math.max(0, totalSpace - usedSpace);
      
      // Determine account type based on space limits
      let accountType = 'free';
      if (totalSpace > 53687091200) { // More than 50GB
        accountType = 'business';
      } else if (totalSpace > 21474836480) { // More than 20GB
        accountType = 'pro';
      }
      
      console.log('[MEGA Status] Final account info:', {
        totalSpace: totalSpace,
        usedSpace: usedSpace,
        availableSpace: availableSpace,
        accountType: accountType,
        transferQuota: transferQuota,
        transferUsed: transferUsed
      });
      
      const statusData: InsertMegaAccountStatus = {
        totalSpace: totalSpace.toString(),
        usedSpace: usedSpace.toString(), 
        availableSpace: availableSpace.toString(),
        accountType: accountType,
        transferQuota: transferQuota.toString(),
        transferUsed: transferUsed.toString(),
        isConnected: true,
        lastChecked: new Date(),
        error: null
      };

      // Delete old records and insert new one
      await db.delete(megaAccountStatus);
      const result = await db.insert(megaAccountStatus).values(statusData).returning();
      
      console.log('[MEGA Status] Status updated successfully');
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

  // Payment Method Management
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const result = await db.select().from(paymentMethods).orderBy(desc(paymentMethods.createdAt));
      return result;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  static async createPaymentMethod(data: Omit<InsertPaymentMethod, 'id' | 'createdAt'>): Promise<PaymentMethod> {
    try {
      const result = await db.insert(paymentMethods).values({
        name: data.name,
        type: data.type,
        isActive: data.isActive ?? true,
        configuration: data.configuration || {}
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  static async updatePaymentMethod(id: string, updates: Partial<Omit<InsertPaymentMethod, 'id' | 'createdAt'>>): Promise<PaymentMethod> {
    try {
      const result = await db.update(paymentMethods)
        .set(updates)
        .where(eq(paymentMethods.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error('Payment method not found');
      }
      
      return result[0];
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  static async deletePaymentMethod(id: string): Promise<void> {
    try {
      const result = await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
      if (result.rowCount === 0) {
        throw new Error('Payment method not found');
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
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

  // Payment Methods Management
  static async getAllPaymentMethods(): Promise<{ paymentMethods: PaymentMethod[], total: number }> {
    try {
      const methods = await db.select().from(paymentMethods).orderBy(paymentMethods.country, paymentMethods.name);
      return { paymentMethods: methods, total: methods.length };
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  static async createPaymentMethod(methodData: InsertPaymentMethod): Promise<PaymentMethod> {
    try {
      const [newMethod] = await db.insert(paymentMethods).values(methodData).returning();
      return newMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  static async updatePaymentMethod(id: string, updates: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    try {
      const [updated] = await db.update(paymentMethods)
        .set(updates)
        .where(eq(paymentMethods.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  static async deletePaymentMethod(id: string): Promise<void> {
    try {
      await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  static async seedAngolianPaymentMethods(): Promise<void> {
    try {
      // Check if methods already exist
      const existing = await db.select().from(paymentMethods).limit(1);
      if (existing.length > 0) return;

      const angolianMethods = [
        {
          name: 'Transferência BAI',
          type: 'bank_transfer_bai',
          country: 'AO',
          bankDetails: {
            bankName: 'Banco Angolano de Investimentos',
            accountNumber: '40400000012345678901',
            accountHolder: 'MEGA File Manager Lda',
            iban: 'AO06000400400000012345678901'
          },
          processingTime: '24-48 horas',
          fees: 'Sem taxas adicionais',
          instructions: 'Faça a transferência usando os dados acima. Após o pagamento, faça upload do comprovativo para verificação.',
          description: 'Transferência bancária através do Banco Angolano de Investimentos'
        },
        {
          name: 'Transferência BFA',
          type: 'bank_transfer_bfa',
          country: 'AO',
          bankDetails: {
            bankName: 'Banco de Fomento Angola',
            accountNumber: '12300000012345678902',
            accountHolder: 'MEGA File Manager Lda',
            iban: 'AO06012312300000012345678902'
          },
          processingTime: '24-48 horas',
          fees: 'Sem taxas adicionais',
          instructions: 'Transfira para a conta indicada. Guarde o comprovativo e faça upload aqui.',
          description: 'Transferência bancária através do Banco de Fomento Angola'
        },
        {
          name: 'Transferência BIC',
          type: 'bank_transfer_bic',
          country: 'AO',
          bankDetails: {
            bankName: 'Banco BIC Angola',
            accountNumber: '11200000012345678903',
            accountHolder: 'MEGA File Manager Lda',
            iban: 'AO06011211200000012345678903'
          },
          processingTime: '24-48 horas',
          fees: 'Sem taxas adicionais',
          instructions: 'Realize a transferência e envie o comprovativo para ativação imediata.',
          description: 'Transferência bancária através do Banco BIC Angola'
        },
        {
          name: 'Multicaixa Express',
          type: 'multicaixa',
          country: 'AO',
          configuration: {
            entityCode: '20567',
            reference: 'Gerada automaticamente'
          },
          processingTime: 'Imediato',
          fees: 'AOA 150',
          instructions: 'Use a referência gerada para pagar numa Multicaixa ou via app.',
          description: 'Pagamento através da rede Multicaixa'
        },
        {
          name: 'PayPal Internacional',
          type: 'paypal',
          country: 'INT',
          configuration: {
            clientId: 'configurar-admin',
            currency: 'USD'
          },
          processingTime: 'Imediato',
          fees: '3.4% + $0.30',
          instructions: 'Pagamento seguro via PayPal com cartão ou conta PayPal.',
          description: 'Pagamento internacional via PayPal'
        },
        {
          name: 'Wise (TransferWise)',
          type: 'wise',
          country: 'INT',
          configuration: {
            accountId: 'configurar-admin',
            currencies: ['USD', 'EUR', 'GBP']
          },
          processingTime: '1-3 dias úteis',
          fees: 'Variável por moeda',
          instructions: 'Transferência internacional de baixo custo via Wise.',
          description: 'Transferência internacional via Wise'
        }
      ];

      for (const method of angolianMethods) {
        await db.insert(paymentMethods).values(method);
      }

      console.log('[Payment Methods] Seeded Angolan payment methods');
    } catch (error) {
      console.error('Error seeding payment methods:', error);
    }
  }

  // Payment Proof Management
  static async uploadPaymentProof(proofData: InsertPaymentProof): Promise<PaymentProof> {
    try {
      const [proof] = await db.insert(paymentProofs).values(proofData).returning();
      return proof;
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      throw error;
    }
  }

  static async getPaymentProofs(paymentId?: string): Promise<PaymentProof[]> {
    try {
      let query = db.select().from(paymentProofs);
      
      if (paymentId) {
        query = query.where(eq(paymentProofs.paymentId, paymentId));
      }
      
      return await query.orderBy(desc(paymentProofs.uploadedAt));
    } catch (error) {
      console.error('Error getting payment proofs:', error);
      throw error;
    }
  }

  static async verifyPaymentProof(proofId: string, verifierId: string, status: 'verified' | 'rejected', notes?: string): Promise<PaymentProof> {
    try {
      const [updated] = await db.update(paymentProofs)
        .set({
          status,
          verifiedAt: new Date(),
          verifiedBy: verifierId,
          notes
        })
        .where(eq(paymentProofs.id, proofId))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error verifying payment proof:', error);
      throw error;
    }
  }

  // Create API key
  static async createApiKey(data: { name: string; userId: string; description?: string }) {
    try {
      const { nanoid } = await import('nanoid');
      const keyValue = `mega_${nanoid(32)}`;
      const keyHash = await bcrypt.hash(keyValue, 10);

      const [newKey] = await db.insert(apiKeys).values({
        name: data.name,
        userId: data.userId,
        keyHash,
        description: data.description,
        isActive: true
      }).returning();

      return { 
        ...newKey, 
        key: keyValue, // Return the actual key only once during creation
        message: 'API key created successfully' 
      };
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  // Toggle API key status
  static async toggleApiKey(keyId: string, isActive: boolean) {
    try {
      const [updatedKey] = await db
        .update(apiKeys)
        .set({ isActive })
        .where(eq(apiKeys.id, keyId))
        .returning();

      if (!updatedKey) {
        throw new Error('API key not found');
      }

      return { 
        ...updatedKey, 
        message: `API key ${isActive ? 'activated' : 'deactivated'} successfully` 
      };
    } catch (error) {
      console.error('Error toggling API key:', error);
      throw error;
    }
  }
}