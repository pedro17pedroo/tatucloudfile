// Temporary storage for API keys (24-hour access window)
// This allows users to see their actual API key for a limited time after creation

interface StoredApiKey {
  key: string;
  userId: string;
  expiresAt: number;
}

export class TemporaryApiKeyStore {
  private static keyStore = new Map<string, StoredApiKey>();

  // Store API key for 24 hours
  static store(keyId: string, key: string, userId: string): void {
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    this.keyStore.set(keyId, {
      key,
      userId,
      expiresAt
    });
  }

  // Retrieve API key if not expired and belongs to user
  static retrieve(keyId: string, userId: string): string | null {
    const stored = this.keyStore.get(keyId);
    
    if (!stored) {
      return null;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.keyStore.delete(keyId);
      return null;
    }

    // Check if belongs to user
    if (stored.userId !== userId) {
      return null;
    }

    return stored.key;
  }

  // Clean up expired keys (run periodically)
  static cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.keyStore.entries());
    for (const [keyId, stored] of entries) {
      if (now > stored.expiresAt) {
        this.keyStore.delete(keyId);
      }
    }
  }

  // Remove specific key
  static remove(keyId: string): void {
    this.keyStore.delete(keyId);
  }

  // Check if key exists and is valid
  static exists(keyId: string, userId: string): boolean {
    const stored = this.keyStore.get(keyId);
    if (!stored) return false;
    if (Date.now() > stored.expiresAt) {
      this.keyStore.delete(keyId);
      return false;
    }
    return stored.userId === userId;
  }
}

// Run cleanup every hour
setInterval(() => {
  TemporaryApiKeyStore.cleanup();
}, 60 * 60 * 1000);