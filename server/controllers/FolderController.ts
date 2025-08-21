import { Request, Response } from 'express';
import { FolderService } from '../services/FolderService';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

export class FolderController {
  static async createFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { name, parentId } = createFolderSchema.parse(req.body);

      const folder = await FolderService.createFolder({
        userId,
        name,
        parentId,
      });

      res.status(201).json({
        message: 'Folder created successfully',
        folder
      });
    } catch (error) {
      console.error('Create folder error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create folder' });
    }
  }

  static async getUserFolders(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const folders = await FolderService.getUserFolders(userId);
      res.json({ folders });
    } catch (error) {
      console.error('Get folders error:', error);
      res.status(500).json({ message: 'Failed to get folders' });
    }
  }

  static async deleteFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const folderId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      await FolderService.deleteFolder(folderId, userId);
      res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
      console.error('Delete folder error:', error);
      res.status(500).json({ message: 'Failed to delete folder' });
    }
  }

  static async updateFolder(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.claims?.sub;
      const folderId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { name } = z.object({ name: z.string().min(1).max(255) }).parse(req.body);

      const folder = await FolderService.updateFolder(folderId, userId, { name });
      res.json({
        message: 'Folder updated successfully',
        folder
      });
    } catch (error) {
      console.error('Update folder error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update folder' });
    }
  }
}