import { Router } from 'express';
import { FileController } from '../../controllers/FileController';
import { ApiKeyController } from '../../controllers/ApiKeyController';
import { authenticateApiKey, authenticateUser } from '../../middleware/auth';
import { apiLimiter } from '../../middleware/rate-limiter';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

const developerRouter = Router();

// Apply rate limiting to all developer API routes
developerRouter.use(apiLimiter);

// API key management routes
developerRouter.post('/api-keys', authenticateUser, ApiKeyController.createApiKey);
developerRouter.get('/api-keys', authenticateUser, ApiKeyController.getUserApiKeys);
developerRouter.delete('/api-keys/:id', authenticateUser, ApiKeyController.deleteApiKey);

// File operations with API key authentication
developerRouter.post('/files/upload', authenticateApiKey, upload.single('file'), FileController.uploadFile);
developerRouter.get('/files', authenticateApiKey, FileController.getUserFiles);
developerRouter.get('/files/:id/download', authenticateApiKey, FileController.downloadFile);
developerRouter.delete('/files/:id', authenticateApiKey, FileController.deleteFile);
developerRouter.get('/files/search', authenticateApiKey, FileController.searchFiles);

// Documentation route
developerRouter.get('/docs', (req, res) => {
  res.json({
    title: 'MEGA File Manager API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'GET /api/auth/user': 'Get current user'
      },
      apiKeys: {
        'POST /api/dev/api-keys': 'Create new API key',
        'GET /api/dev/api-keys': 'Get user API keys',
        'DELETE /api/dev/api-keys/:id': 'Delete API key'
      },
      files: {
        'POST /api/dev/files/upload': 'Upload file to MEGA',
        'GET /api/dev/files': 'Get user files',
        'GET /api/dev/files/:id/download': 'Get download URL',
        'DELETE /api/dev/files/:id': 'Delete file',
        'GET /api/dev/files/search': 'Search files'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer {your-api-key}'
    }
  });
});

export { developerRouter };