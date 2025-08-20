import { Router } from 'express';
import multer from 'multer';
import { megaService } from '../../services/megaService';
import { db } from '../../db';
import { apiKeys, files } from '@shared/schema';
import { eq, and, or, like } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const apiRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// API Key Authentication Middleware
async function authenticateApiKey(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const apiKey = authHeader.slice(7);
  
  try {
    // Hash the provided key to compare with stored hash
    const keyRecord = await db.select().from(apiKeys).where(
      and(eq(apiKeys.isActive, true))
    );
    
    let validKey = null;
    for (const key of keyRecord) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        validKey = key;
        break;
      }
    }
    
    if (!validKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Add user info to request
    req.apiUser = { userId: validKey.userId };
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(401).json({ error: 'Invalid API key' });
  }
}

// Apply API key auth to all routes
apiRouter.use(authenticateApiKey);

// File Upload
apiRouter.post('/files/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const remotePath = req.body.path || `/${fileName}`;

    // Upload to MEGA
    const result = await megaService.uploadFile(fileBuffer, fileName, remotePath);

    // Store file metadata
    const fileRecord = await db.insert(files).values({
      userId: req.apiUser.userId,
      fileName: fileName,
      fileSize: req.file.size.toString(),
      mimeType: req.file.mimetype,
      megaFileId: result.id,
      filePath: remotePath,
    }).returning();

    const file = fileRecord[0];

    res.json({
      success: true,
      file: {
        id: file.id,
        name: file.fileName,
        size: parseInt(file.fileSize),
        uploadedAt: file.uploadedAt,
        downloadUrl: `/api/v1/files/${file.id}/download`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// List Files
apiRouter.get('/files', async (req: any, res) => {
  try {
    const userFiles = await db.select().from(files).where(eq(files.userId, req.apiUser.userId));
    res.json({
      files: userFiles.map(file => ({
        id: file.id,
        name: file.fileName,
        size: parseInt(file.fileSize),
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        downloadUrl: `/api/v1/files/${file.id}/download`
      }))
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Download File
apiRouter.get('/files/:id/download', async (req: any, res) => {
  try {
    const fileRecord = await db.select().from(files).where(
      and(eq(files.id, req.params.id), eq(files.userId, req.apiUser.userId))
    );

    if (fileRecord.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileRecord[0];
    const downloadUrl = await megaService.getDownloadUrl(file.megaFileId);
    res.json({
      success: true,
      downloadUrl: downloadUrl,
      fileName: file.fileName
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// Search Files
apiRouter.get('/files/search', async (req: any, res) => {
  try {
    const query = req.query.q as string;
    const fileType = req.query.type as string;

    let baseConditions = [eq(files.userId, req.apiUser.userId)];
    let searchConditions = [];
    
    // Add search query conditions if provided - search in ID, fileName, or mimeType
    if (query) {
      searchConditions.push(
        eq(files.id, query), // Exact ID match
        like(files.fileName, `%${query}%`), // Partial filename match
        like(files.mimeType, `%${query}%`) // Partial mime type match
      );
    }
    
    // Add specific file type condition if provided
    if (fileType) {
      searchConditions.push(like(files.mimeType, `%${fileType}%`));
    }
    
    // If no search parameters, return all files for the user
    let finalCondition;
    if (searchConditions.length > 0) {
      finalCondition = and(...baseConditions, or(...searchConditions));
    } else {
      finalCondition = and(...baseConditions);
    }

    const searchResults = await db.select().from(files).where(finalCondition);

    res.json({
      files: searchResults.map((file: any) => ({
        id: file.id,
        name: file.fileName,
        size: parseInt(file.fileSize),
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        downloadUrl: `/api/v1/files/${file.id}/download`
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Delete File
apiRouter.delete('/files/:id', async (req: any, res) => {
  try {
    const fileRecord = await db.select().from(files).where(
      and(eq(files.id, req.params.id), eq(files.userId, req.apiUser.userId))
    );

    if (fileRecord.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileRecord[0];

    // Delete from MEGA
    await megaService.deleteFile(file.megaFileId);
    
    // Delete from database
    await db.delete(files).where(eq(files.id, req.params.id));

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Create Folder
apiRouter.post('/folders', async (req: any, res) => {
  try {
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const result = await megaService.createFolder(folderPath);
    
    res.json({
      success: true,
      folder: result
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Move File
apiRouter.put('/files/:id/move', async (req: any, res) => {
  try {
    const { newPath } = req.body;
    
    if (!newPath) {
      return res.status(400).json({ error: 'New path is required' });
    }

    const fileRecord = await db.select().from(files).where(
      and(eq(files.id, req.params.id), eq(files.userId, req.apiUser.userId))
    );

    if (fileRecord.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileRecord[0];
    const result = await megaService.moveFile(file.megaFileId, newPath);
    
    // Update file path in database
    await db.update(files).set({ 
      filePath: `/${newPath}/${file.fileName}`
    }).where(eq(files.id, req.params.id));

    res.json({
      success: true,
      file: result
    });
  } catch (error) {
    console.error('Move file error:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// Advanced Multiple File Upload
apiRouter.post('/files/upload-multiple', upload.array('files'), async (req: any, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const folderPath = req.body.folderPath || null;
    const customNames = req.body.customNames ? JSON.parse(req.body.customNames) : {};

    console.log('[Multiple Upload] Received files:', (req.files as any[]).map(f => f.originalname));
    console.log('[Multiple Upload] Custom names received:', customNames);

    // Prepare upload data
    const uploads = (req.files as any[]).map((file, index) => {
      const customName = customNames[index] || null;
      console.log(`[Multiple Upload] File ${index}: ${file.originalname} -> Custom: ${customName || 'none'}`);
      
      return {
        buffer: file.buffer,
        originalName: file.originalname,
        customName: customName,
        mimeType: file.mimetype,
        size: file.size
      };
    });

    // Upload to MEGA
    const megaResults = await megaService.uploadMultipleFiles(uploads, folderPath);

    // Store file metadata in database
    const fileRecords = [];
    for (let i = 0; i < megaResults.length; i++) {
      const megaResult = megaResults[i];
      const upload = uploads[i];
      
      const fileRecord = await db.insert(files).values({
        userId: req.apiUser.userId,
        fileName: megaResult.name,
        fileSize: upload.size.toString(),
        mimeType: upload.mimeType,
        megaFileId: megaResult.id,
        filePath: `${megaResult.folderPath}/${megaResult.name}`,
      }).returning();

      fileRecords.push({
        id: fileRecord[0].id,
        originalName: megaResult.originalName,
        name: megaResult.name,
        size: upload.size,
        uploadedAt: fileRecord[0].uploadedAt,
        downloadUrl: `/api/v1/files/${fileRecord[0].id}/download`,
        folderPath: megaResult.folderPath
      });
    }

    res.json({
      success: true,
      files: fileRecords,
      totalUploaded: fileRecords.length
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

export { apiRouter };