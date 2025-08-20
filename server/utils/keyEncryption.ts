import crypto from 'crypto';

// Use a consistent secret for encryption/decryption
// In production, this should be an environment variable
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || 'mega-file-manager-api-key-secret-2024-v1-default-key';

// Ensure the key is 32 bytes for AES-256
const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

export class KeyEncryption {
  static encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error encrypting API key:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      const [ivHex, encryptedData] = encryptedText.split(':');
      if (!ivHex || !encryptedData) {
        throw new Error('Invalid encrypted format');
      }
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Error decrypting API key:', error);
      throw new Error('Failed to decrypt API key');
    }
  }
}