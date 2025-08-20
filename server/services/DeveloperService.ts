import { db } from '../db';
import { 
  developerApplications, apiKeys, developerApiSettings, users,
  DeveloperApplication, ApiKey, DeveloperApiSettings,
  InsertDeveloperApplication, InsertDeveloperApiSettings
} from '@shared/schema';
import { eq, desc, and, count, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { TemporaryApiKeyStore } from '../utils/temporaryApiKeyStore';

export class DeveloperService {
  // Submit new developer application and create trial API key immediately
  static async submitApplication(userId: string, applicationData: Omit<InsertDeveloperApplication, 'userId'>): Promise<{
    application: DeveloperApplication;
    apiKey: string;
    trialExpiresAt: Date;
  }> {
    try {
      // Check if user already has any application or active API key
      const existingData = await db
        .select()
        .from(developerApplications)
        .where(eq(developerApplications.userId, userId))
        .limit(1);

      if (existingData.length > 0) {
        throw new Error('Já possui uma aplicação registrada. Verifique o estado da sua chave API.');
      }

      // Get trial settings (default values if not configured)
      const apiSettings = await this.getApiSettings();
      const trialDays = apiSettings?.trialDurationDays || 14;
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays);

      // Create the application with approved status (since we're giving immediate access)
      const applicationResult = await db.insert(developerApplications).values({
        userId,
        systemName: applicationData.systemName,
        systemDescription: applicationData.systemDescription,
        websiteUrl: applicationData.websiteUrl || null,
        expectedUsage: applicationData.expectedUsage,
        status: 'approved', // Automatically approved for trial
        reviewedAt: new Date(),
      }).returning();

      // Generate API key
      const apiKey = `mk_test_${nanoid(32)}`;
      const hashedKey = await bcrypt.hash(apiKey, 10);

      // Create API key with trial period
      const apiKeyResult = await db.insert(apiKeys).values({
        userId,
        name: `${applicationData.systemName} - API Key`,
        keyHash: hashedKey,
        applicationId: applicationResult[0].id,
        systemName: applicationData.systemName,
        isActive: true,
        isTrial: true,
        trialExpiresAt,
      }).returning();

      // Store the plain text API key temporarily so user can access it
      TemporaryApiKeyStore.store(apiKeyResult[0].id, apiKey, userId);

      return {
        application: applicationResult[0],
        apiKey,
        trialExpiresAt,
      };
    } catch (error) {
      console.error('Error submitting developer application:', error);
      throw error;
    }
  }

  // Get user's applications
  static async getUserApplications(userId: string): Promise<DeveloperApplication[]> {
    try {
      const applications = await db
        .select()
        .from(developerApplications)
        .where(eq(developerApplications.userId, userId))
        .orderBy(desc(developerApplications.createdAt));

      return applications;
    } catch (error) {
      console.error('Error getting user applications:', error);
      throw error;
    }
  }

  // Get user's API keys via applications
  static async getUserApiKeys(userId: string): Promise<(ApiKey & { plainTextKey?: string })[]> {
    try {
      // Get user's applications first
      const userApplications = await db
        .select({ id: developerApplications.id })
        .from(developerApplications)
        .where(eq(developerApplications.userId, userId));

      if (userApplications.length === 0) {
        return [];
      }

      // Get API keys for all user applications
      const applicationIds = userApplications.map(app => app.id);
      const keys = await db
        .select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, userId),
            applicationIds.length > 0 ? or(...applicationIds.map(id => eq(apiKeys.applicationId, id))) : eq(apiKeys.applicationId, '')
          )
        )
        .orderBy(desc(apiKeys.createdAt));

      // Try to get the plain text key for recently created keys
      const keysWithPlainText = keys.map(key => {
        const plainTextKey = TemporaryApiKeyStore.retrieve(key.id, userId);
        return {
          ...key,
          plainTextKey: plainTextKey || undefined
        };
      });

      return keysWithPlainText;
    } catch (error) {
      console.error('Error getting user API keys:', error);
      throw error;
    }
  }

  // Get a specific API key in plain text (if available in temporary storage)
  static async getApiKeyPlainText(keyId: string, userId: string): Promise<string | null> {
    try {
      // First verify the key belongs to the user
      const userApplications = await db
        .select({ id: developerApplications.id })
        .from(developerApplications)
        .where(eq(developerApplications.userId, userId));

      if (userApplications.length === 0) {
        return null;
      }

      const keyExists = await db
        .select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.id, keyId),
            eq(apiKeys.applicationId, userApplications[0].id)
          )
        )
        .limit(1);

      if (keyExists.length === 0) {
        return null;
      }

      // Get the plain text key from temporary storage
      return TemporaryApiKeyStore.retrieve(keyId, userId);
    } catch (error) {
      console.error('Error getting API key plain text:', error);
      return null;
    }
  }

  // Get API settings (create default if doesn't exist)
  static async getApiSettings(): Promise<DeveloperApiSettings> {
    try {
      let settings = await db.select().from(developerApiSettings).limit(1);
      
      if (settings.length === 0) {
        // Create default settings
        const defaultSettings = await db.insert(developerApiSettings).values({
          trialDurationDays: 14,
          monthlyPrice: '29.99',
          yearlyPrice: '299.99',
          freeRequestsPerDay: 100,
          paidRequestsPerDay: 10000,
          autoApproveApplications: true, // Changed to true for automatic approval
          requireManualReview: false, // Changed to false for immediate API keys
        }).returning();
        
        return defaultSettings[0];
      }
      
      return settings[0];
    } catch (error) {
      console.error('Error getting API settings:', error);
      throw error;
    }
  }

  // Get all applications (admin)
  static async getAllApplications(page = 1, limit = 20, status?: string): Promise<{
    applications: (DeveloperApplication & { user: { email: string; firstName?: string; lastName?: string } })[];
    total: number;
  }> {
    try {
      const offset = (page - 1) * limit;
      
      const baseQuery = db
        .select({
          id: developerApplications.id,
          userId: developerApplications.userId,
          systemName: developerApplications.systemName,
          systemDescription: developerApplications.systemDescription,
          websiteUrl: developerApplications.websiteUrl,
          expectedUsage: developerApplications.expectedUsage,
          status: developerApplications.status,
          approvedBy: developerApplications.approvedBy,
          rejectionReason: developerApplications.rejectionReason,
          createdAt: developerApplications.createdAt,
          reviewedAt: developerApplications.reviewedAt,
          user: {
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          }
        })
        .from(developerApplications)
        .leftJoin(users, eq(developerApplications.userId, users.id));

      const query = status 
        ? baseQuery.where(eq(developerApplications.status, status))
        : baseQuery;

      const applications = await query
        .orderBy(desc(developerApplications.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(developerApplications)
        .where(status ? eq(developerApplications.status, status) : undefined);

      return {
        applications: applications.map(app => ({
          ...app,
          user: app.user ? {
            email: app.user.email || '',
            firstName: app.user.firstName || undefined,
            lastName: app.user.lastName || undefined,
          } : { email: '', firstName: undefined, lastName: undefined }
        })),
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting all applications:', error);
      throw error;
    }
  }

  // Review application (approve/reject)
  static async reviewApplication(
    applicationId: string, 
    action: 'approve' | 'reject',
    adminUserId: string,
    rejectionReason?: string
  ): Promise<DeveloperApplication> {
    try {
      const application = await db
        .select()
        .from(developerApplications)
        .where(eq(developerApplications.id, applicationId))
        .limit(1);

      if (application.length === 0) {
        throw new Error('Aplicação não encontrada');
      }

      if (application[0].status !== 'pending') {
        throw new Error('Aplicação já foi revista');
      }

      // Update application status
      const updatedApplication = await db
        .update(developerApplications)
        .set({
          status: action === 'approve' ? 'approved' : 'rejected',
          approvedBy: adminUserId,
          rejectionReason: action === 'reject' ? rejectionReason : null,
          reviewedAt: new Date(),
        })
        .where(eq(developerApplications.id, applicationId))
        .returning();

      // If approved, create API key for trial
      if (action === 'approve') {
        await this.createTrialApiKey(application[0].userId, application[0].systemName, applicationId);
      }

      return updatedApplication[0];
    } catch (error) {
      console.error('Error reviewing application:', error);
      throw error;
    }
  }

  // Create trial API key (simplified version)
  private static async createTrialApiKey(userId: string, systemName: string, applicationId: string): Promise<void> {
    try {
      const settings = await this.getApiSettings();
      const apiKey = `mk_test_${nanoid(32)}`;
      const keyHash = await bcrypt.hash(apiKey, 10);

      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + (settings.trialDurationDays || 14));

      await db.insert(apiKeys).values({
        userId,
        applicationId,
        name: `${systemName} API Key`,
        systemName,
        keyHash,
        isTrial: true,
        trialExpiresAt: trialExpiresAt,
      });

      console.log(`[Developer API] Created trial API key for ${systemName}: ${apiKey}`);
      console.log(`[Developer API] Key expires at: ${trialExpiresAt.toISOString()}`);
    } catch (error) {
      console.error('Error creating trial API key:', error);
      throw error;
    }
  }

  // Update API settings
  static async updateApiSettings(
    settings: Partial<InsertDeveloperApiSettings>,
    adminUserId: string
  ): Promise<DeveloperApiSettings> {
    try {
      const existingSettings = await this.getApiSettings();
      
      const updatedSettings = await db
        .update(developerApiSettings)
        .set({
          ...settings,
          updatedBy: adminUserId,
          updatedAt: new Date(),
        })
        .where(eq(developerApiSettings.id, existingSettings.id))
        .returning();

      return updatedSettings[0];
    } catch (error) {
      console.error('Error updating API settings:', error);
      throw error;
    }
  }

  // Check if API key is valid and not expired
  static async validateApiKey(keyHash: string): Promise<{ 
    isValid: boolean; 
    apiKey?: ApiKey; 
    isExpired?: boolean;
    requestsRemaining?: number;
  }> {
    try {
      const key = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (key.length === 0) {
        return { isValid: false };
      }

      const apiKey = key[0];
      
      if (!apiKey.isActive) {
        return { isValid: false, apiKey };
      }

      // Check if trial period has expired
      if (apiKey.isTrial && apiKey.trialExpiresAt && new Date() > new Date(apiKey.trialExpiresAt)) {
        return { isValid: false, apiKey, isExpired: true };
      }

      // TODO: Check daily request limits based on settings
      const settings = await this.getApiSettings();
      const requestLimit = apiKey.isTrial ? settings.freeRequestsPerDay : settings.paidRequestsPerDay;

      return { 
        isValid: true, 
        apiKey, 
        isExpired: false,
        requestsRemaining: requestLimit ?? undefined // Simplified - in real implementation, track actual usage
      };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { isValid: false };
    }
  }
}