import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';
import { z } from 'zod';

const megaCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const planSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  storageLimit: z.string(),
  pricePerMonth: z.string(),
  apiCallsPerHour: z.number(),
});

const paymentActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  planId: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

const paymentMethodSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['stripe', 'bank_transfer', 'paypal', 'mbway']),
  isActive: z.boolean(),
  configuration: z.object({
    processingTime: z.string().optional(),
    fees: z.string().optional(),
    description: z.string().optional(),
  }),
});

export class AdminController {
  // Authentication & Authorization
  static async checkAdminAccess(req: Request, res: Response, next: any) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await AdminService.getUserById(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      (req as any).adminUser = user;
      next();
    } catch (error) {
      console.error('Admin access check error:', error);
      res.status(500).json({ message: 'Failed to verify admin access' });
    }
  }

  // Dashboard & Statistics
  static async getDashboard(req: Request, res: Response) {
    try {
      const stats = await AdminService.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({ message: 'Failed to get dashboard data' });
    }
  }

  // User Management
  static async getUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const result = await AdminService.getAllUsers(page, limit, search);
      res.json(result);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to get users' });
    }
  }

  static async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await AdminService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({ message: 'Failed to get user details' });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminUser = (req as any).adminUser;
      const updates = userUpdateSchema.parse(req.body);

      const oldUser = await AdminService.getUserById(userId);
      const updatedUser = await AdminService.updateUser(userId, updates);

      if (updatedUser) {
        await AdminService.logAuditAction(
          adminUser.id,
          'user_updated',
          'user',
          userId,
          oldUser,
          updates,
          req.ip,
          req.get('User-Agent')
        );
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update user' });
    }
  }

  static async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminUser = (req as any).adminUser;

      await AdminService.suspendUser(userId, adminUser.id);
      res.json({ message: 'User suspended successfully' });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  }

  // Payment Management
  static async getPayments(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters = {
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        userId: req.query.userId as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const result = await AdminService.getAllPayments(page, limit, filters);
      res.json(result);
    } catch (error) {
      console.error('Get payments error:', error);
      res.status(500).json({ message: 'Failed to get payments' });
    }
  }

  static async updatePaymentStatus(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const adminUser = (req as any).adminUser;
      const { action, notes, reason } = paymentActionSchema.parse(req.body);

      let result;
      if (action === 'approve') {
        result = await AdminService.approvePayment(paymentId, adminUser.id, notes);
      } else {
        if (!reason) {
          return res.status(400).json({ message: 'Reason is required for rejection' });
        }
        result = await AdminService.rejectPayment(paymentId, adminUser.id, reason);
      }

      res.json(result);
    } catch (error) {
      console.error('Update payment status error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  }

  // API Management
  static async getApiKeys(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.query.userId as string;

      const result = await AdminService.getAllApiKeys(page, limit, userId);
      res.json(result);
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ message: 'Failed to get API keys' });
    }
  }

  static async getApiUsage(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters = {
        userId: req.query.userId as string,
        apiKeyId: req.query.apiKeyId as string,
        endpoint: req.query.endpoint as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const result = await AdminService.getApiUsage(page, limit, filters);
      res.json(result);
    } catch (error) {
      console.error('Get API usage error:', error);
      res.status(500).json({ message: 'Failed to get API usage' });
    }
  }

  static async revokeApiKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const adminUser = (req as any).adminUser;

      await AdminService.revokeApiKey(keyId, adminUser.id);
      res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error('Revoke API key error:', error);
      res.status(500).json({ message: 'Failed to revoke API key' });
    }
  }

  // MEGA Management
  static async getMegaCredentials(req: Request, res: Response) {
    try {
      const credentials = await AdminService.getMegaCredentials();
      res.json({ 
        credentials: credentials ? { 
          email: credentials.email, 
          hasPassword: !!credentials.passwordHash 
        } : null 
      });
    } catch (error) {
      console.error('Get MEGA credentials error:', error);
      res.status(500).json({ message: 'Failed to get MEGA credentials' });
    }
  }

  static async updateMegaCredentials(req: Request, res: Response) {
    try {
      const adminUser = (req as any).adminUser;
      const { email, password } = megaCredentialsSchema.parse(req.body);

      // Test connection first
      const isValid = await AdminService.testMegaConnection(email, password);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid MEGA credentials' });
      }

      await AdminService.updateMegaCredentials(email, password);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'mega_credentials_updated',
        'system',
        'mega_credentials',
        null,
        { email },
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: 'MEGA credentials updated successfully' });
    } catch (error) {
      console.error('Update MEGA credentials error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update MEGA credentials' });
    }
  }

  static async getMegaAccountStatus(req: Request, res: Response) {
    try {
      const status = await AdminService.getMegaAccountStatus();
      res.json(status);
    } catch (error) {
      console.error('Get MEGA account status error:', error);
      res.status(500).json({ message: 'Failed to get MEGA account status' });
    }
  }

  static async refreshMegaAccountStatus(req: Request, res: Response) {
    try {
      const adminUser = (req as any).adminUser;
      const status = await AdminService.updateMegaAccountStatus();
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'mega_status_refreshed',
        'system',
        'mega_account',
        null,
        null,
        req.ip,
        req.get('User-Agent')
      );

      res.json(status);
    } catch (error) {
      console.error('Refresh MEGA account status error:', error);
      res.status(500).json({ message: 'Failed to refresh MEGA account status' });
    }
  }

  // Audit Logs
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const adminId = req.query.adminId as string;

      const result = await AdminService.getAuditLogs(page, limit, adminId);
      res.json(result);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ message: 'Failed to get audit logs' });
    }
  }

  // Plan Management
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await AdminService.getPlans();
      res.json(plans);
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ message: 'Failed to get plans' });
    }
  }

  static async createPlan(req: Request, res: Response) {
    try {
      const adminUser = (req as any).adminUser;
      const planData = planSchema.parse(req.body);

      const plan = await AdminService.createPlan(planData);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'plan_created',
        'plan',
        plan.id,
        null,
        planData,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json(plan);
    } catch (error) {
      console.error('Create plan error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create plan' });
    }
  }

  static async updatePlan(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const adminUser = (req as any).adminUser;
      const updates = planSchema.partial().parse(req.body);

      const oldPlan = await AdminService.getPlans().then(plans => plans.find(p => p.id === planId));
      const plan = await AdminService.updatePlan(planId, updates);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'plan_updated',
        'plan',
        planId,
        oldPlan,
        updates,
        req.ip,
        req.get('User-Agent')
      );

      res.json(plan);
    } catch (error) {
      console.error('Update plan error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update plan' });
    }
  }

  static async deletePlan(req: Request, res: Response) {
    try {
      const { planId } = req.params;
      const adminUser = (req as any).adminUser;

      const plans = await AdminService.getPlans();
      const planToDelete = plans.find(p => p.id === planId);
      
      await AdminService.deletePlan(planId);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'plan_deleted',
        'plan',
        planId,
        planToDelete,
        null,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: 'Plan deleted successfully' });
    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({ message: 'Failed to delete plan' });
    }
  }

  // Payment Method Management
  static async getPaymentMethods(req: Request, res: Response) {
    try {
      const paymentMethods = await AdminService.getPaymentMethods();
      res.json({ paymentMethods, total: paymentMethods.length });
    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({ message: 'Failed to get payment methods' });
    }
  }

  static async createPaymentMethod(req: Request, res: Response) {
    try {
      const adminUser = (req as any).adminUser;
      const methodData = paymentMethodSchema.parse(req.body);

      const method = await AdminService.createPaymentMethod(methodData);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'payment_method_created',
        'payment_method',
        method.id,
        null,
        methodData,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json(method);
    } catch (error) {
      console.error('Create payment method error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create payment method' });
    }
  }

  static async updatePaymentMethod(req: Request, res: Response) {
    try {
      const { methodId } = req.params;
      const adminUser = (req as any).adminUser;
      const updates = paymentMethodSchema.partial().parse(req.body);

      const oldMethod = await AdminService.getPaymentMethods().then(methods => methods.find(m => m.id === methodId));
      const method = await AdminService.updatePaymentMethod(methodId, updates);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'payment_method_updated',
        'payment_method',
        methodId,
        oldMethod,
        updates,
        req.ip,
        req.get('User-Agent')
      );

      res.json(method);
    } catch (error) {
      console.error('Update payment method error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update payment method' });
    }
  }

  static async deletePaymentMethod(req: Request, res: Response) {
    try {
      const { methodId } = req.params;
      const adminUser = (req as any).adminUser;

      const methods = await AdminService.getPaymentMethods();
      const methodToDelete = methods.find(m => m.id === methodId);
      
      await AdminService.deletePaymentMethod(methodId);
      
      // Log the action
      await AdminService.logAuditAction(
        adminUser.id,
        'payment_method_deleted',
        'payment_method',
        methodId,
        methodToDelete,
        null,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ message: 'Payment method deleted successfully' });
    } catch (error) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ message: 'Failed to delete payment method' });
    }
  }

  // Reports & Analytics
  static async generateReport(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { dateFrom, dateTo } = req.query;

      let reportData;
      
      switch (type) {
        case 'users':
          reportData = await AdminService.getAllUsers(1, 1000);
          break;
        case 'payments':
          reportData = await AdminService.getAllPayments(1, 1000, {
            dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
            dateTo: dateTo ? new Date(dateTo as string) : undefined,
          });
          break;
        case 'api-usage':
          reportData = await AdminService.getApiUsage(1, 1000, {
            dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
            dateTo: dateTo ? new Date(dateTo as string) : undefined,
          });
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      res.json(reportData);
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  }
}