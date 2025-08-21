import { storage } from '../storage';

export interface CreateFolderParams {
  userId: string;
  name: string;
  parentId?: string;
}

export interface UpdateFolderParams {
  name?: string;
}

export class FolderService {
  static async createFolder(params: CreateFolderParams) {
    const { userId, name, parentId } = params;

    // Check if folder with same name exists in the same parent
    const existingFolder = await storage.getFolderByNameAndParent(userId, name, parentId || null);

    if (existingFolder) {
      throw new Error('Folder with this name already exists in this location');
    }

    const newFolder = await storage.createFolder({
      userId,
      name,
      parentId: parentId || null,
    });

    return newFolder;
  }

  static async getUserFolders(userId: string) {
    const userFolders = await storage.getFoldersByUserId(userId);
    return userFolders;
  }

  static async getFolderById(folderId: string, userId: string) {
    const folder = await storage.getFolderById(folderId);

    if (!folder || folder.userId !== userId) {
      throw new Error('Folder not found');
    }

    return folder;
  }

  static async deleteFolder(folderId: string, userId: string) {
    // First verify the folder belongs to the user
    await this.getFolderById(folderId, userId);

    // TODO: Check if folder has files or subfolders and handle accordingly
    
    await storage.deleteFolder(folderId);
  }

  static async updateFolder(folderId: string, userId: string, updates: UpdateFolderParams) {
    // First verify the folder belongs to the user
    await this.getFolderById(folderId, userId);

    const updatedFolder = await storage.updateFolder(folderId, updates);
    return updatedFolder;
  }

  static async getFolderPath(folderId: string, userId: string): Promise<any[]> {
    const path: any[] = [];
    let currentFolderId = folderId;

    while (currentFolderId) {
      const folder = await storage.getFolderById(currentFolderId);

      if (!folder || folder.userId !== userId) break;

      path.unshift(folder);
      currentFolderId = folder.parentId;
    }

    return path;
  }
}