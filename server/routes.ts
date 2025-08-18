import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { megaService } from "./services/megaService";
import multer from "multer";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 1024 } // 1GB limit
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    if (req.user?.claims?.sub) {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.planId === 'pro') return 5000;
      if (user?.planId === 'premium') return 10000;
    }
    return 1000; // default for basic
  },
  message: 'Too many API requests, please try again later.',
});

// API key authentication middleware
async function authenticateApiKey(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'API key required' });
  }

  const apiKey = authHeader.substring(7);
  const validKey = await storage.validateApiKey(apiKey);
  
  if (!validKey) {
    return res.status(401).json({ message: 'Invalid API key' });
  }

  await storage.updateApiKeyLastUsed(validKey.id);
  req.apiKey = validKey;
  req.user = { claims: { sub: validKey.userId } };
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize default plans
  const existingPlans = await storage.getPlans();
  if (existingPlans.length === 0) {
    await storage.createPlan({
      id: 'basic',
      name: 'Basic',
      storageLimit: '2147483648', // 2GB
      pricePerMonth: '0',
      apiCallsPerHour: 100,
    });
    await storage.createPlan({
      id: 'pro',
      name: 'Pro',
      storageLimit: '5368709120', // 5GB
      pricePerMonth: '9.99',
      apiCallsPerHour: 1000,
    });
    await storage.createPlan({
      id: 'premium',
      name: 'Premium',
      storageLimit: '10737418240', // 10GB
      pricePerMonth: '19.99',
      apiCallsPerHour: 5000,
    });
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Plans
  app.get('/api/plans', async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ message: 'Failed to fetch plans' });
    }
  });

  // API Keys management
  app.get('/api/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const apiKeys = await storage.getApiKeysByUserId(userId);
      res.json(apiKeys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ message: 'Failed to fetch API keys' });
    }
  });

  app.post('/api/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Name is required' });
      }

      const userId = req.user.claims.sub;
      const { apiKey, rawKey } = await storage.createApiKey(userId, name);
      
      res.json({ ...apiKey, rawKey });
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  app.delete('/api/api-keys/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteApiKey(req.params.id);
      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ message: 'Failed to delete API key' });
    }
  });

  // Files - API endpoints (with API key auth)
  app.use('/api/v1', apiLimiter);

  app.post('/api/v1/files/upload', authenticateApiKey, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check storage quota
      const currentUsed = BigInt(user.storageUsed || '0');
      const fileSize = BigInt(req.file.size);
      const plan = await storage.getPlans().then(plans => plans.find(p => p.id === user.planId));
      
      if (plan && currentUsed + fileSize > BigInt(plan.storageLimit)) {
        return res.status(413).json({ message: 'Storage quota exceeded' });
      }

      // Upload to MEGA
      const fileName = req.body.fileName || req.file.originalname;
      const filePath = req.body.path || `/${fileName}`;
      
      const megaFile = await megaService.uploadFile(req.file.buffer, fileName, filePath);
      
      // Save file metadata
      const file = await storage.createFile({
        userId,
        megaFileId: megaFile.id,
        fileName,
        fileSize: req.file.size.toString(),
        mimeType: req.file.mimetype,
        filePath,
      });

      // Update user storage
      const newStorageUsed = (currentUsed + fileSize).toString();
      await storage.updateUserStorageUsed(userId, newStorageUsed);

      // Log API usage
      await storage.logApiUsage({
        userId,
        apiKeyId: req.apiKey.id,
        endpoint: '/api/v1/files/upload',
        method: 'POST',
        responseCode: 200,
      });

      res.json({
        status: 'success',
        file_id: file.id,
        name: fileName,
        size: req.file.size,
        upload_date: file.uploadedAt,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      await storage.logApiUsage({
        userId: req.user?.claims?.sub || '',
        apiKeyId: req.apiKey?.id,
        endpoint: '/api/v1/files/upload',
        method: 'POST',
        responseCode: 500,
      });
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  app.get('/api/v1/files/:id/download', authenticateApiKey, async (req: any, res) => {
    try {
      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: 'File not found' });
      }

      const downloadUrl = await megaService.getDownloadUrl(file.megaFileId);
      
      await storage.logApiUsage({
        userId: req.user.claims.sub,
        apiKeyId: req.apiKey.id,
        endpoint: '/api/v1/files/download',
        method: 'GET',
        responseCode: 200,
      });

      res.json({
        download_url: downloadUrl,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        file_name: file.fileName,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ message: 'Failed to get download URL' });
    }
  });

  app.get('/api/v1/files/search', authenticateApiKey, async (req: any, res) => {
    try {
      const { query, type, limit = 50, offset = 0 } = req.query;
      const userId = req.user.claims.sub;
      
      let files = await storage.getFilesByUserId(userId);
      
      // Apply filters
      if (query) {
        files = files.filter(file => 
          file.fileName.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      if (type) {
        files = files.filter(file => 
          file.mimeType?.includes(type) || file.fileName.endsWith(`.${type}`)
        );
      }

      // Pagination
      const total = files.length;
      const paginatedFiles = files.slice(offset, offset + parseInt(limit));

      await storage.logApiUsage({
        userId,
        apiKeyId: req.apiKey.id,
        endpoint: '/api/v1/files/search',
        method: 'GET',
        responseCode: 200,
      });

      res.json({
        status: 'success',
        total,
        files: paginatedFiles.map(file => ({
          id: file.id,
          name: file.fileName,
          size: parseInt(file.fileSize),
          type: file.mimeType,
          created_at: file.uploadedAt,
        })),
      });
    } catch (error) {
      console.error('Error searching files:', error);
      res.status(500).json({ message: 'Failed to search files' });
    }
  });

  app.delete('/api/v1/files/:id', authenticateApiKey, async (req: any, res) => {
    try {
      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete from MEGA
      await megaService.deleteFile(file.megaFileId);
      
      // Delete from database
      await storage.deleteFile(file.id);

      // Update user storage
      const user = await storage.getUser(file.userId);
      if (user) {
        const currentUsed = BigInt(user.storageUsed || '0');
        const fileSize = BigInt(file.fileSize);
        const newStorageUsed = (currentUsed - fileSize).toString();
        await storage.updateUserStorageUsed(file.userId, newStorageUsed);
      }

      await storage.logApiUsage({
        userId: req.user.claims.sub,
        apiKeyId: req.apiKey.id,
        endpoint: '/api/v1/files/delete',
        method: 'DELETE',
        responseCode: 200,
      });

      res.json({
        status: 'success',
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Web interface file operations
  app.get('/api/files', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const files = await storage.getFilesByUserId(userId);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.post('/api/files/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check storage quota
      const currentUsed = BigInt(user.storageUsed || '0');
      const fileSize = BigInt(req.file.size);
      const plan = await storage.getPlans().then(plans => plans.find(p => p.id === user.planId));
      
      if (plan && currentUsed + fileSize > BigInt(plan.storageLimit)) {
        return res.status(413).json({ message: 'Storage quota exceeded' });
      }

      // Upload to MEGA
      const fileName = req.file.originalname;
      const filePath = `/${userId}/${fileName}`;
      
      const megaFile = await megaService.uploadFile(req.file.buffer, fileName, filePath);
      
      // Save file metadata
      const file = await storage.createFile({
        userId,
        megaFileId: megaFile.id,
        fileName,
        fileSize: req.file.size.toString(),
        mimeType: req.file.mimetype,
        filePath,
      });

      // Update user storage
      const newStorageUsed = (currentUsed + fileSize).toString();
      await storage.updateUserStorageUsed(userId, newStorageUsed);

      res.json(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  app.delete('/api/files/:id', isAuthenticated, async (req: any, res) => {
    try {
      const file = await storage.getFileById(req.params.id);
      if (!file || file.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete from MEGA
      await megaService.deleteFile(file.megaFileId);
      
      // Delete from database
      await storage.deleteFile(file.id);

      // Update user storage
      const user = await storage.getUser(file.userId);
      if (user) {
        const currentUsed = BigInt(user.storageUsed || '0');
        const fileSize = BigInt(file.fileSize);
        const newStorageUsed = (currentUsed - fileSize).toString();
        await storage.updateUserStorageUsed(file.userId, newStorageUsed);
      }

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // This would need a proper admin user listing implementation
      res.json([]);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/admin/mega-credentials', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Test connection first
      const isValid = await megaService.testConnection(email, password);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid MEGA credentials' });
      }

      await storage.upsertMegaCredentials({ email, passwordHash: password });
      
      res.json({ message: 'MEGA credentials updated successfully' });
    } catch (error) {
      console.error('Error updating MEGA credentials:', error);
      res.status(500).json({ message: 'Failed to update MEGA credentials' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
