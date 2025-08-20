import { Storage } from 'megajs';
import { storage } from '../storage';

class MegaService {
  private megaStorage: any = null;
  private connectionPromise: Promise<any> | null = null;

  private async getMegaStorage(): Promise<any> {
    if (this.megaStorage) {
      return this.megaStorage;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.initializeMegaConnection();
    this.megaStorage = await this.connectionPromise;
    this.connectionPromise = null;
    
    return this.megaStorage;
  }

  private async initializeMegaConnection(): Promise<any> {
    const credentials = await storage.getMegaCredentials();
    if (!credentials) {
      throw new Error('MEGA credentials not configured');
    }

    try {
      console.log('[MEGA] Attempting connection with email:', credentials.email);
      
      if (!credentials.encryptedPassword) {
        throw new Error('No encrypted password found in credentials');
      }
      
      const { PasswordEncryption } = await import('../utils/encryption');
      const decryptedPassword = PasswordEncryption.decrypt(credentials.encryptedPassword);
      
      const megaStorage = await new Storage({
        email: credentials.email,
        password: decryptedPassword, // Use the decrypted password
      }).ready;

      console.log('[MEGA] Connection successful');
      return megaStorage;
    } catch (error) {
      console.error('Failed to connect to MEGA:', error);
      throw new Error('Failed to connect to MEGA. Please check credentials.');
    }
  }

  async testConnection(email: string, password: string): Promise<boolean> {
    try {
      const testStorage = await new Storage({
        email,
        password,
      }).ready;
      
      // Test by listing root folder
      await testStorage.root;
      return true;
    } catch (error) {
      console.error('MEGA connection test failed:', error);
      return false;
    }
  }

  async uploadFile(buffer: Buffer, fileName: string, remotePath: string): Promise<any> {
    try {
      const megaStorage = await this.getMegaStorage();
      
      // Create directory structure if needed
      const pathParts = remotePath.split('/').filter(part => part);
      let currentFolder = megaStorage.root;
      
      // Navigate/create folders (except the filename)
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        let folder = currentFolder.children?.find((child: any) => 
          child.name === folderName && child.directory
        );
        
        if (!folder) {
          folder = await currentFolder.mkdir(folderName);
        }
        currentFolder = folder;
      }

      // Upload the file
      const file = await currentFolder.upload(fileName, buffer).complete;
      
      return {
        id: file.nodeId,
        name: file.name,
        size: file.size,
        url: file.link(),
      };
    } catch (error) {
      console.error('Error uploading file to MEGA:', error);
      throw new Error('Failed to upload file to MEGA');
    }
  }

  async getDownloadUrl(fileId: string): Promise<string> {
    try {
      const megaStorage = await this.getMegaStorage();
      
      // Find file by nodeId
      const file = await this.findFileById(megaStorage.root, fileId);
      if (!file) {
        throw new Error('File not found in MEGA');
      }

      return file.link();
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw new Error('Failed to get download URL');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const megaStorage = await this.getMegaStorage();
      
      // Find and delete file by nodeId
      const file = await this.findFileById(megaStorage.root, fileId);
      if (!file) {
        throw new Error('File not found in MEGA');
      }

      await file.delete();
    } catch (error) {
      console.error('Error deleting file from MEGA:', error);
      throw new Error('Failed to delete file from MEGA');
    }
  }

  private async findFileById(folder: any, fileId: string): Promise<any> {
    if (!folder.children) {
      await folder.loadChildren();
    }

    for (const child of folder.children) {
      if (child.nodeId === fileId) {
        return child;
      }
      
      if (child.directory) {
        const found = await this.findFileById(child, fileId);
        if (found) return found;
      }
    }
    
    return null;
  }

  async reconnect(): Promise<void> {
    console.log('[MEGA] Forcing reconnection...');
    this.megaStorage = null;
    this.connectionPromise = null;
    await this.getMegaStorage();
    console.log('[MEGA] Reconnection successful');
  }

  async clearConnection(): Promise<void> {
    console.log('[MEGA] Clearing connection cache...');
    this.megaStorage = null;
    this.connectionPromise = null;
  }

  // Create folder
  async createFolder(folderPath: string): Promise<any> {
    try {
      const megaStorage = await this.getMegaStorage();
      const pathParts = folderPath.split('/').filter(part => part);
      let currentFolder = megaStorage.root;
      
      // Navigate/create each folder in the path
      for (const folderName of pathParts) {
        let folder = currentFolder.children?.find((child: any) => 
          child.name === folderName && child.directory
        );
        
        if (!folder) {
          folder = await currentFolder.mkdir(folderName);
        }
        currentFolder = folder;
      }

      return {
        id: currentFolder.nodeId,
        name: currentFolder.name,
        path: folderPath
      };
    } catch (error) {
      console.error('Error creating folder in MEGA:', error);
      throw new Error('Failed to create folder in MEGA');
    }
  }

  // Move file to different folder
  async moveFile(fileId: string, newPath: string): Promise<any> {
    try {
      const megaStorage = await this.getMegaStorage();
      
      // Find the file to move
      const file = await this.findFileById(megaStorage.root, fileId);
      if (!file) {
        throw new Error('File not found in MEGA');
      }

      // Create destination folder if needed
      const pathParts = newPath.split('/').filter(part => part);
      let targetFolder = megaStorage.root;
      
      for (const folderName of pathParts) {
        let folder = targetFolder.children?.find((child: any) => 
          child.name === folderName && child.directory
        );
        
        if (!folder) {
          folder = await targetFolder.mkdir(folderName);
        }
        targetFolder = folder;
      }

      // Move file to new folder
      await file.moveTo(targetFolder);

      return {
        id: file.nodeId,
        name: file.name,
        newPath: newPath
      };
    } catch (error) {
      console.error('Error moving file in MEGA:', error);
      throw new Error('Failed to move file in MEGA');
    }
  }

  // Advanced upload with multiple files, custom names and folder creation
  async uploadMultipleFiles(uploads: Array<{
    buffer: Buffer;
    originalName: string;
    customName?: string;
    mimeType: string;
    size: number;
  }>, folderPath?: string): Promise<any[]> {
    try {
      const megaStorage = await this.getMegaStorage();
      let targetFolder = megaStorage.root;
      
      // Create folder structure if specified
      if (folderPath) {
        const pathParts = folderPath.split('/').filter(part => part);
        for (const folderName of pathParts) {
          let folder = targetFolder.children?.find((child: any) => 
            child.name === folderName && child.directory
          );
          
          if (!folder) {
            folder = await targetFolder.mkdir(folderName);
          }
          targetFolder = folder;
        }
      }

      // Upload all files
      const results = [];
      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i];
        const fileName = upload.customName || upload.originalName;
        
        console.log(`[MEGA Upload] File ${i}: ${upload.originalName} -> ${fileName}`);
        console.log(`[MEGA Upload] Buffer size: ${upload.buffer.length} bytes`);
        
        const file = await targetFolder.upload(fileName, upload.buffer).complete;
        
        console.log(`[MEGA Upload] Uploaded successfully: ${file.name}, Size: ${file.size}`);
        
        results.push({
          id: file.nodeId,
          originalName: upload.originalName,
          name: file.name,
          size: file.size,
          mimeType: upload.mimeType,
          url: file.link(),
          folderPath: folderPath || '/'
        });
      }

      return results;
    } catch (error) {
      console.error('Error uploading multiple files to MEGA:', error);
      throw new Error('Failed to upload multiple files to MEGA');
    }
  }
}

export const megaService = new MegaService();
