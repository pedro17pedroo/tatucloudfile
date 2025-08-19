import { storage } from '../storage';
import { megaService } from './megaService';
import bcrypt from 'bcrypt';
import type { User, Plan, MegaCredentials } from '@shared/schema';

export interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: string;
  apiCallsToday: number;
}

export interface CreatePlanData {
  name: string;
  storageLimit: string;
  pricePerMonth: string;
  apiCallsPerHour: number;
}

export class AdminService {
  static async getUserById(id: string): Promise<User | undefined> {
    return await storage.getUser(id);
  }

  static async getMegaCredentials(): Promise<MegaCredentials | undefined> {
    return await storage.getMegaCredentials();
  }

  static async updateMegaCredentials(email: string, password: string): Promise<MegaCredentials> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await storage.upsertMegaCredentials({ 
      email, 
      passwordHash,
      password // Store plain password for MEGA API access
    });
    
    // Clear any cached MEGA connections to force new connection with new credentials
    await megaService.clearConnection();
    console.log('[Admin] MEGA credentials updated and connection cache cleared');
    
    return result;
  }

  static async testMegaConnection(email: string, password: string): Promise<boolean> {
    return await megaService.testConnection(email, password);
  }

  static async getSystemStats(): Promise<SystemStats> {
    // This would need to be implemented in storage to get actual stats
    // For now, return placeholder data
    return {
      totalUsers: 0,
      totalFiles: 0,
      totalStorage: '0',
      apiCallsToday: 0,
    };
  }

  static async getPlans(): Promise<Plan[]> {
    return await storage.getPlans();
  }

  static async createPlan(planData: CreatePlanData): Promise<Plan> {
    const planId = planData.name.toLowerCase().replace(/\s+/g, '-');
    return await storage.createPlan({
      id: planId,
      ...planData,
    });
  }
}