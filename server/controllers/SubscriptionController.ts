import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';

const changePlanSchema = z.object({
  planId: z.string().min(1, 'Plan ID é obrigatório'),
});

export class SubscriptionController {
  static async getSubscriptionInfo(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'Utilizador não encontrado' });
      }

      // For now, return basic subscription info
      // In a real implementation, this would integrate with payment systems like Stripe
      const subscriptionInfo = {
        currentPlan: user.planId,
        status: 'active' as const,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        cancelAtPeriodEnd: false,
      };

      res.json(subscriptionInfo);
    } catch (error) {
      console.error('Get subscription info error:', error);
      res.status(500).json({ message: 'Erro ao obter informações da subscrição' });
    }
  }

  static async changePlan(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const { planId } = changePlanSchema.parse(req.body);

      // Validate plan exists
      const plans = await storage.getPlans();
      const planExists = plans.some(plan => plan.id === planId);
      if (!planExists) {
        return res.status(400).json({ message: 'Plano inválido' });
      }

      // Update user plan
      const updatedUser = await storage.updateUser(userId, {
        planId,
        updatedAt: new Date(),
      });

      res.json({
        message: 'Plano alterado com sucesso',
        newPlan: planId
      });
    } catch (error) {
      console.error('Change plan error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro ao alterar plano' });
    }
  }

  static async cancelSubscription(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      // In a real implementation, this would integrate with payment systems
      // For now, we'll just simulate the cancellation
      
      res.json({
        message: 'Subscrição cancelada com sucesso',
        cancelAtPeriodEnd: true,
        periodEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ message: 'Erro ao cancelar subscrição' });
    }
  }

  static async reactivateSubscription(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      // In a real implementation, this would integrate with payment systems
      // For now, we'll just simulate the reactivation
      
      res.json({
        message: 'Subscrição reativada com sucesso',
        cancelAtPeriodEnd: false
      });
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ message: 'Erro ao reativar subscrição' });
    }
  }
}