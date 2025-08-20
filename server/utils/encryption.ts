import crypto from 'crypto';

// Use environment variable or generate a consistent key
const ENCRYPTION_KEY = process.env.MEGA_ENCRYPTION_KEY || 'mega-file-manager-encryption-key-2024-v1-default';

if (!process.env.MEGA_ENCRYPTION_KEY) {
  console.warn('[Security] MEGA_ENCRYPTION_KEY not set, using temporary key. Set MEGA_ENCRYPTION_KEY environment variable for production.');
}

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits / 8 = 32 bytes

export class PasswordEncryption {
  private static getKey(): Buffer {
    // Create a consistent 32-byte key from the encryption key
    return crypto.scryptSync(ENCRYPTION_KEY, 'mega-salt', KEY_LENGTH);
  }

  static encrypt(text: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted format');
      }
      
      const key = this.getKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[Encryption] Failed to decrypt password:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  static isEncrypted(value: string): boolean {
    // Check if value has the encrypted format (iv:authTag:encrypted)
    return value.includes(':') && value.split(':').length === 3;
  }
}