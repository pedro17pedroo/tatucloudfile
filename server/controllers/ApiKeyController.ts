import { Request, Response } from 'express';
import { ApiKeyService } from '../services/ApiKeyService';
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().min(1),
});

export class ApiKeyController {
  static async createApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { name } = createApiKeySchema.parse(req.body);

      const result = await ApiKeyService.createApiKey(userId, name);
      
      res.status(201).json({
        message: 'API key created successfully',
        apiKey: result.apiKey,
        rawKey: result.rawKey
      });
    } catch (error) {
      console.error('Create API key error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create API key' });
    }
  }

  static async getUserApiKeys(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const apiKeys = await ApiKeyService.getUserApiKeys(userId);
      res.json({ apiKeys });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ message: 'Failed to get API keys' });
    }
  }

  static async deleteApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const keyId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await ApiKeyService.deleteApiKey(keyId, userId);
      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({ message: 'Failed to delete API key' });
    }
  }
}