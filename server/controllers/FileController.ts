import { Request, Response } from 'express';
import { FileService } from '../services/FileService';
import { z } from 'zod';

const uploadSchema = z.object({
  fileName: z.string().min(1).optional(),
  filePath: z.string().optional(),
  folderId: z.string().optional(),
});

export class FileController {
  static async uploadFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const { fileName, filePath, folderId } = uploadSchema.parse(req.body);

      const file = await FileService.uploadFile({
        userId,
        file: req.file,
        fileName: fileName || req.file.originalname,
        filePath: filePath || '/',
        folderId: folderId || null,
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        file
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }

  static async getUserFiles(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const files = await FileService.getUserFiles(userId);
      console.log('[FileController] Sample file data:', files[0]);
      
      // Force transformation from folder_id to folderId if needed
      const transformedFiles = files.map(file => ({
        ...file,
        folderId: (file as any).folder_id || file.folderId
      }));
      
      console.log('[FileController] Transformed sample:', transformedFiles[0]);
      res.json({ files: transformedFiles });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({ message: 'Failed to get files' });
    }
  }

  static async downloadFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const fileId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const downloadUrl = await FileService.getDownloadUrl(fileId, userId);
      res.json({ downloadUrl });
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ message: 'Failed to get download URL' });
    }
  }

  static async deleteFile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const fileId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await FileService.deleteFile(fileId, userId);
      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  }

  static async searchFiles(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const query = req.query.q as string;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!query) {
        return res.status(400).json({ message: 'Search query required' });
      }

      const files = await FileService.searchFiles(userId, query);
      res.json({ files });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Failed to search files' });
    }
  }
}