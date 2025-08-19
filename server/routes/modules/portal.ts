import { Router } from 'express';
import { FileController } from '../../controllers/FileController';
import { AdminController } from '../../controllers/AdminController';
import { SeedController } from '../../controllers/SeedController';
import { UserController } from '../../controllers/UserController';
import { UserProfileController } from '../../controllers/UserProfileController';
import { ProfileController } from '../../controllers/ProfileController';
import { SubscriptionController } from '../../controllers/SubscriptionController';
import { BillingController } from '../../controllers/BillingController';
import { authenticateUser, isAdmin } from '../../middleware/auth';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

const portalRouter = Router();

// All portal routes require user authentication
portalRouter.use(authenticateUser);

// File management for end users
portalRouter.post('/files/upload', upload.single('file'), FileController.uploadFile);
portalRouter.get('/files', FileController.getUserFiles);
portalRouter.get('/files/:id/download', FileController.downloadFile);
portalRouter.delete('/files/:id', FileController.deleteFile);
portalRouter.get('/files/search', FileController.searchFiles);

// User profile and plans
portalRouter.get('/user/profile', UserController.getProfile);
portalRouter.post('/user/select-plan', UserController.selectPlan);

// User profile management
portalRouter.get('/user/subscriptions', UserProfileController.getUserSubscriptions);
portalRouter.get('/user/payments', UserProfileController.getUserPayments);
portalRouter.post('/user/change-password', UserProfileController.changePassword);
portalRouter.post('/user/change-plan', UserProfileController.changePlan);
portalRouter.get('/user/settings', UserProfileController.getUserSettings);
portalRouter.put('/user/settings', UserProfileController.updateUserSettings);

// New user management routes
portalRouter.put('/profile/update', ProfileController.updateProfile);
portalRouter.put('/profile/change-password', ProfileController.changePassword);

// Subscription management routes
portalRouter.get('/subscription/info', SubscriptionController.getSubscriptionInfo);
portalRouter.post('/subscription/change-plan', SubscriptionController.changePlan);
portalRouter.post('/subscription/cancel', SubscriptionController.cancelSubscription);
portalRouter.post('/subscription/reactivate', SubscriptionController.reactivateSubscription);

// Billing history routes
portalRouter.get('/billing/history', BillingController.getBillingHistory);
portalRouter.get('/billing/summary', BillingController.getBillingSummary);
portalRouter.get('/billing/receipt/:paymentId', BillingController.downloadReceipt);

// Plans (moved to auth routes for public access during registration)

// Admin routes
portalRouter.use('/admin', AdminController.checkAdminAccess);

// Dashboard & Statistics
portalRouter.get('/admin/dashboard', AdminController.getDashboard);
portalRouter.get('/admin/stats', AdminController.getDashboard);

// User Management
portalRouter.get('/admin/users', AdminController.getUsers);
portalRouter.get('/admin/users/:userId', AdminController.getUserDetails);
portalRouter.put('/admin/users/:userId', AdminController.updateUser);
portalRouter.post('/admin/users/:userId/suspend', AdminController.suspendUser);

// Payment Management
portalRouter.get('/admin/payments', AdminController.getPayments);
portalRouter.put('/admin/payments/:paymentId/status', AdminController.updatePaymentStatus);

// API Management
portalRouter.get('/admin/api-keys', AdminController.getApiKeys);
portalRouter.get('/admin/api-usage', AdminController.getApiUsage);
portalRouter.delete('/admin/api-keys/:keyId', AdminController.revokeApiKey);

// MEGA Management
portalRouter.get('/admin/mega-credentials', AdminController.getMegaCredentials);
portalRouter.post('/admin/mega-credentials', AdminController.updateMegaCredentials);
portalRouter.get('/admin/mega-status', AdminController.getMegaAccountStatus);
portalRouter.post('/admin/mega-status/refresh', AdminController.refreshMegaAccountStatus);

// Audit Logs
portalRouter.get('/admin/audit-logs', AdminController.getAuditLogs);

// Plan Management
portalRouter.get('/admin/plans', AdminController.getPlans);
portalRouter.post('/admin/plans', AdminController.createPlan);
portalRouter.put('/admin/plans/:planId', AdminController.updatePlan);
portalRouter.delete('/admin/plans/:planId', AdminController.deletePlan);

// Reports & Analytics
portalRouter.get('/admin/reports/:type', AdminController.generateReport);

// Legacy routes for seed functionality
portalRouter.post('/admin/seed', SeedController.seedDatabase);
portalRouter.post('/admin/create-test-api-key', SeedController.createTestApiKey);

export { portalRouter };