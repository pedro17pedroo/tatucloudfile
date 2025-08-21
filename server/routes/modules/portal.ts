import { Router } from 'express';
import { FileController } from '../../controllers/FileController';
import { FolderController } from '../../controllers/FolderController';
import { AdminController } from '../../controllers/AdminController';
import { DeveloperController } from '../../controllers/DeveloperController';
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

// Folder management for end users
portalRouter.post('/folders', FolderController.createFolder);
portalRouter.get('/folders', FolderController.getUserFolders);
portalRouter.put('/folders/:id', FolderController.updateFolder);
portalRouter.delete('/folders/:id', FolderController.deleteFolder);

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
portalRouter.post('/admin/users', AdminController.createUser);
portalRouter.get('/admin/users/:userId', AdminController.getUserDetails);
portalRouter.put('/admin/users/:userId', AdminController.updateUser);
portalRouter.post('/admin/users/:userId/suspend', AdminController.suspendUser);
portalRouter.post('/admin/users/:userId/reset-password', AdminController.resetUserPassword);
portalRouter.delete('/admin/users/:userId', AdminController.deleteUser);

// Payment Management
portalRouter.get('/admin/payments', AdminController.getPayments);
portalRouter.put('/admin/payments/:paymentId/status', AdminController.updatePaymentStatus);

// Payment Methods Management
portalRouter.get('/admin/payment-methods', AdminController.getPaymentMethods);
portalRouter.post('/admin/payment-methods', AdminController.createPaymentMethod);
portalRouter.put('/admin/payment-methods/:methodId', AdminController.updatePaymentMethod);
portalRouter.delete('/admin/payment-methods/:methodId', AdminController.deletePaymentMethod);

// API Management
portalRouter.get('/admin/api-keys', AdminController.getApiKeys);
portalRouter.post('/admin/api-keys', AdminController.createApiKey);
portalRouter.patch('/admin/api-keys/:keyId/toggle', AdminController.toggleApiKey);
portalRouter.delete('/admin/api-keys/:keyId', AdminController.revokeApiKey);
portalRouter.get('/admin/api-usage', AdminController.getApiUsage);

// MEGA Management
portalRouter.get('/admin/mega-credentials', AdminController.getMegaCredentials);
portalRouter.put('/admin/mega-credentials', AdminController.updateMegaCredentials);
portalRouter.post('/admin/mega-test-connection', AdminController.testMegaConnection);
portalRouter.get('/admin/mega-account-status', AdminController.getMegaAccountStatus);
portalRouter.post('/admin/mega-account-status/refresh', AdminController.refreshMegaAccountStatus);

// Developer Management (Admin only)
portalRouter.get('/admin/developer/applications', DeveloperController.getAllApplications);
portalRouter.post('/admin/developer/applications/:applicationId/review', DeveloperController.reviewApplication);
portalRouter.get('/admin/developer/settings', DeveloperController.getApiSettings);
portalRouter.put('/admin/developer/settings', DeveloperController.updateApiSettings);

// Audit Logs
portalRouter.get('/admin/audit-logs', AdminController.getAuditLogs);

// Plan Management
portalRouter.get('/admin/plans', AdminController.getPlans);
portalRouter.post('/admin/plans', AdminController.createPlan);
portalRouter.put('/admin/plans/:planId', AdminController.updatePlan);
portalRouter.delete('/admin/plans/:planId', AdminController.deletePlan);

// Payment Method Management
portalRouter.get('/admin/payment-methods', AdminController.getPaymentMethods);
portalRouter.post('/admin/payment-methods', AdminController.createPaymentMethod);
portalRouter.put('/admin/payment-methods/:methodId', AdminController.updatePaymentMethod);
portalRouter.delete('/admin/payment-methods/:methodId', AdminController.deletePaymentMethod);

// Reports & Analytics
portalRouter.get('/admin/reports/:type', AdminController.generateReport);

// Legacy routes for seed functionality
portalRouter.post('/admin/seed', SeedController.seedDatabase);
portalRouter.post('/admin/create-test-api-key', SeedController.createTestApiKey);

export { portalRouter };