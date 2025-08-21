import { storage } from '../storage';
import { megaService } from './megaService';
import type { File } from '@shared/schema';

export interface UploadFileData {
  userId: string;
  file: Express.Multer.File;
  fileName: string;
  filePath: string;
  folderId?: string | null;
}

export class FileService {
  static async uploadFile(data: UploadFileData): Promise<File> {
    const { userId, file, fileName, filePath, folderId } = data;

    // Upload to MEGA
    const megaFile = await megaService.uploadFile(
      file.buffer,
      fileName,
      `${filePath}/${fileName}`
    );

    // Save metadata to database
    const fileData = {
      userId,
      folderId: folderId || null,
      megaFileId: megaFile.id,
      fileName,
      fileSize: file.size.toString(),
      mimeType: file.mimetype,
      filePath,
    };

    const savedFile = await storage.createFile(fileData);

    // Update user storage usage
    const user = await storage.getUser(userId);
    if (user) {
      const newStorageUsed = (BigInt(user.storageUsed || '0') + BigInt(file.size)).toString();
      await storage.updateUserStorageUsed(userId, newStorageUsed);
    }

    return savedFile;
  }

  static async getUserFiles(userId: string): Promise<File[]> {
    return await storage.getFilesByUserId(userId);
  }

  static async getDownloadUrl(fileId: string, userId: string): Promise<string> {
    const file = await storage.getFileById(fileId);
    
    if (!file || file.userId !== userId) {
      throw new Error('File not found or unauthorized');
    }

    return await megaService.getDownloadUrl(file.megaFileId);
  }

  static async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await storage.getFileById(fileId);
    
    if (!file || file.userId !== userId) {
      throw new Error('File not found or unauthorized');
    }

    // Delete from MEGA
    await megaService.deleteFile(file.megaFileId);

    // Delete from database
    await storage.deleteFile(fileId);

    // Update user storage usage
    const user = await storage.getUser(userId);
    if (user && file.fileSize) {
      const newStorageUsed = (BigInt(user.storageUsed || '0') - BigInt(file.fileSize)).toString();
      await storage.updateUserStorageUsed(userId, Math.max(0, parseInt(newStorageUsed)).toString());
    }
  }

  static async searchFiles(userId: string, query: string): Promise<File[]> {
    const files = await storage.getFilesByUserId(userId);
    
    return files.filter(file => 
      file.fileName.toLowerCase().includes(query.toLowerCase()) ||
      (file.filePath && file.filePath.toLowerCase().includes(query.toLowerCase()))
    );
  }
}