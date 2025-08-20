import crypto from 'crypto';

// Use environment variable or generate a key during startup
const ENCRYPTION_KEY = process.env.MEGA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

if (!process.env.MEGA_ENCRYPTION_KEY) {
  console.warn('[Security] MEGA_ENCRYPTION_KEY not set, using temporary key. Set MEGA_ENCRYPTION_KEY environment variable for production.');
}

const ALGORITHM = 'aes-256-gcm';

export class PasswordEncryption {
  private static key: Buffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');

  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, this.key);
    
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
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(ALGORITHM, this.key);
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