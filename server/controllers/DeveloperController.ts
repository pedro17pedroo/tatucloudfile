import { Request, Response } from 'express';
import { z } from 'zod';
import { DeveloperService } from '../services/DeveloperService';

// Validation schemas
const developerApplicationSchema = z.object({
  systemName: z.string().min(1, 'Nome do sistema é obrigatório'),
  systemDescription: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  expectedUsage: z.string().min(10, 'Uso esperado deve ter pelo menos 10 caracteres'),
});

export class DeveloperController {
  // Submit application and get immediate API key
  static async submitApplication(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).currentUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Utilizador não autenticado' });
      }

      const applicationData = developerApplicationSchema.parse(req.body);
      
      const result = await DeveloperService.submitApplication(userId, applicationData);
      
      res.status(201).json({
        message: 'Aplicação aprovada! Chave API criada com sucesso.',
        application: result.application,
        apiKey: result.apiKey,
        trialExpiresAt: result.trialExpiresAt,
        trialInfo: {
          duration: '14 dias',
          requestsPerDay: 100,
          message: 'Período de teste gratuito ativado. Após o término, será necessário uma subscrição.'
        }
      });
    } catch (error) {
      console.error('Submit application error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro ao submeter aplicação' });
    }
  }

  // Get user's applications
  static async getUserApplications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).currentUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Utilizador não autenticado' });
      }

      const applications = await DeveloperService.getUserApplications(userId);
      
      res.json({ applications });
    } catch (error) {
      console.error('Get user applications error:', error);
      res.status(500).json({ message: 'Erro ao obter aplicações' });
    }
  }

  // Get user's API keys
  static async getUserApiKeys(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).currentUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Utilizador não autenticado' });
      }

      const apiKeys = await DeveloperService.getUserApiKeys(userId);
      
      res.json({ apiKeys });
    } catch (error) {
      console.error('Get user API keys error:', error);
      res.status(500).json({ message: 'Erro ao obter chaves API' });
    }
  }

  // Get API key in plain text (only for recently created keys)
  static async getApiKeyPlainText(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub || (req as any).currentUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Utilizador não autenticado' });
      }

      const { keyId } = req.params;
      const plainTextKey = await DeveloperService.getApiKeyPlainText(keyId, userId);

      if (!plainTextKey) {
        return res.status(404).json({ 
          message: 'Chave API não encontrada ou não disponível. As chaves só ficam disponíveis por 24 horas após criação.' 
        });
      }

      res.json({ key: plainTextKey });
    } catch (error) {
      console.error('Get API key plain text error:', error);
      res.status(500).json({ message: 'Erro ao obter chave API' });
    }
  }

  // Get developer API settings (public)
  static async getApiSettings(req: Request, res: Response) {
    try {
      const settings = await DeveloperService.getApiSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get API settings error:', error);
      res.status(500).json({ message: 'Erro ao obter configurações da API' });
    }
  }

  // Admin: Get all applications
  static async getAllApplications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const result = await DeveloperService.getAllApplications(page, limit, status);
      
      res.json(result);
    } catch (error) {
      console.error('Get all applications error:', error);
      res.status(500).json({ message: 'Erro ao obter aplicações' });
    }
  }

  // Admin: Review application (approve/reject)
  static async reviewApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const { action, rejectionReason } = req.body;
      const adminUserId = (req as any).user?.id;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Acção inválida' });
      }

      if (action === 'reject' && !rejectionReason) {
        return res.status(400).json({ message: 'Motivo da rejeição é obrigatório' });
      }

      const result = await DeveloperService.reviewApplication(
        applicationId, 
        action, 
        adminUserId,
        rejectionReason
      );
      
      res.json({
        message: `Aplicação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso`,
        application: result
      });
    } catch (error) {
      console.error('Review application error:', error);
      res.status(500).json({ message: 'Erro ao rever aplicação' });
    }
  }

  // Admin: Update API settings
  static async updateApiSettings(req: Request, res: Response) {
    try {
      const adminUserId = (req as any).user?.id;
      const settings = req.body;

      const updatedSettings = await DeveloperService.updateApiSettings(settings, adminUserId);
      
      res.json({
        message: 'Configurações da API atualizadas com sucesso',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Update API settings error:', error);
      res.status(500).json({ message: 'Erro ao atualizar configurações da API' });
    }
  }
}