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

    // Build the MEGA folder path based on folderId
    let megaFolderPath = '';
    if (folderId) {
      // Get folder path from database
      const { FolderService } = await import('./FolderService');
      const folderPath = await FolderService.getFolderPath(folderId, userId);
      megaFolderPath = folderPath.map((folder: any) => folder.name).join('/');
    }

    const remotePath = megaFolderPath ? `${megaFolderPath}/${fileName}` : fileName;

    // Upload to MEGA
    const megaFile = await megaService.uploadFile(
      file.buffer,
      fileName,
      remotePath
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

  static async streamFile(fileId: string, userId: string): Promise<{ stream: any; size: number; mimeType: string; fileName: string }> {
    const file = await storage.getFileById(fileId);
    
    if (!file || file.userId !== userId) {
      throw new Error('File not found or unauthorized');
    }

    const { stream, size, mimeType } = await megaService.getFileStream(file.megaFileId);
    
    return {
      stream,
      size,
      mimeType: file.mimeType || mimeType || 'application/octet-stream',
      fileName: file.fileName
    };
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

  static async replaceFile(fileId: string, userId: string, newFile: Express.Multer.File, fileName?: string): Promise<File> {
    const existingFile = await storage.getFileById(fileId);
    
    if (!existingFile || existingFile.userId !== userId) {
      throw new Error('File not found or unauthorized');
    }

    // Build the remote path from the existing file
    const remotePath = existingFile.filePath || existingFile.fileName;
    const finalFileName = fileName || newFile.originalname;

    // Replace file in MEGA (delete old, upload new)
    const megaFile = await megaService.replaceFile(
      existingFile.megaFileId,
      newFile.buffer,
      finalFileName,
      remotePath
    );

    // Update database record with new file info
    const updatedFileData = {
      megaFileId: megaFile.id,
      fileName: finalFileName,
      fileSize: newFile.size.toString(),
      mimeType: newFile.mimetype,
      uploadedAt: new Date(),
    };

    const updatedFile = await storage.updateFile(fileId, updatedFileData);

    // Update user storage usage (difference between old and new file sizes)
    const user = await storage.getUser(userId);
    if (user) {
      const currentStorage = BigInt(user.storageUsed || '0');
      const oldFileSize = BigInt(existingFile.fileSize);
      const newFileSize = BigInt(newFile.size);
      const sizeDifference = newFileSize - oldFileSize;
      const newStorageUsed = (currentStorage + sizeDifference).toString();
      await storage.updateUserStorageUsed(userId, newStorageUsed);
    }

    return updatedFile;
  }
}