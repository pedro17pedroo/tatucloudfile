import { Router } from 'express';
import { FileController } from '../../controllers/FileController';
import { AdminController } from '../../controllers/AdminController';
import { SeedController } from '../../controllers/SeedController';
import { UserController } from '../../controllers/UserController';
import { UserProfileController } from '../../controllers/UserProfileController';
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

// Plans (moved to auth routes for public access during registration)

// Admin routes
portalRouter.use('/admin', isAdmin);
portalRouter.get('/admin/mega-credentials', AdminController.getMegaCredentials);
portalRouter.post('/admin/mega-credentials', AdminController.updateMegaCredentials);
portalRouter.get('/admin/stats', AdminController.getSystemStats);
portalRouter.post('/admin/plans', AdminController.createPlan);
portalRouter.post('/admin/seed', SeedController.seedDatabase);
portalRouter.post('/admin/create-test-api-key', SeedController.createTestApiKey);

export { portalRouter };