import { Router } from 'express';
import { FileController } from '../../controllers/FileController';
import { AdminController } from '../../controllers/AdminController';
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

// Plans
portalRouter.get('/plans', AdminController.getPlans);

// Admin routes
portalRouter.use('/admin', isAdmin);
portalRouter.get('/admin/mega-credentials', AdminController.getMegaCredentials);
portalRouter.post('/admin/mega-credentials', AdminController.updateMegaCredentials);
portalRouter.get('/admin/stats', AdminController.getSystemStats);
portalRouter.post('/admin/plans', AdminController.createPlan);

export { portalRouter };