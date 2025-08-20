// Temporary storage for API keys that need to be shown to users
// In production, this would be a Redis cache or similar
const temporaryApiKeys = new Map<string, { 
  key: string; 
  userId: string; 
  expiresAt: Date; 
}>();

// Clean up expired keys every 5 minutes
setInterval(() => {
  const now = new Date();
  temporaryApiKeys.forEach((keyData, id) => {
    if (keyData.expiresAt < now) {
      temporaryApiKeys.delete(id);
    }
  });
}, 5 * 60 * 1000);

export class TemporaryApiKeyStore {
  // Store API key temporarily (24 hours)
  static store(keyId: string, key: string, userId: string): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours to retrieve
    
    temporaryApiKeys.set(keyId, {
      key,
      userId,
      expiresAt
    });
  }

  // Retrieve API key (only by owner)
  static retrieve(keyId: string, userId: string): string | null {
    const keyData = temporaryApiKeys.get(keyId);
    
    if (!keyData || keyData.userId !== userId || keyData.expiresAt < new Date()) {
      return null;
    }
    
    return keyData.key;
  }

  // Remove API key from temporary storage
  static remove(keyId: string): void {
    temporaryApiKeys.delete(keyId);
  }
}