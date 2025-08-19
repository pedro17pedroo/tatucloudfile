import { storage } from '../storage';
import type { ApiKey } from '@shared/schema';

export class ApiKeyService {
  static async createApiKey(userId: string, name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    return await storage.createApiKey(userId, name);
  }

  static async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await storage.getApiKeysByUserId(userId);
  }

  static async deleteApiKey(keyId: string, userId: string): Promise<void> {
    // Verify the API key belongs to the user
    const apiKeys = await storage.getApiKeysByUserId(userId);
    const apiKey = apiKeys.find(key => key.id === keyId);
    
    if (!apiKey) {
      throw new Error('API key not found or unauthorized');
    }

    await storage.deleteApiKey(keyId);
  }

  static async validateApiKey(keyHash: string): Promise<ApiKey | undefined> {
    return await storage.validateApiKey(keyHash);
  }
}