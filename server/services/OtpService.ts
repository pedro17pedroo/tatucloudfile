import { storage } from '../storage';

interface OtpData {
  code: string;
  expiresAt: Date;
  contact: string;
  contactType: 'email' | 'phone';
  verified: boolean;
}

// In-memory OTP storage (in production, use Redis or database)
const otpStorage = new Map<string, OtpData>();

export class OtpService {
  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendOtp(contact: string, contactType: 'email' | 'phone'): Promise<string> {
    const code = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const otpData: OtpData = {
      code,
      expiresAt,
      contact,
      contactType,
      verified: false
    };

    // Store OTP (use contact as key)
    otpStorage.set(contact, otpData);

    // In production, integrate with real email/SMS services
    if (contactType === 'email') {
      console.log(`📧 Sending OTP to email ${contact}: ${code}`);
      // TODO: Integrate with SendGrid or similar
    } else {
      console.log(`📱 Sending OTP to phone ${contact}: ${code}`);
      // TODO: Integrate with Twilio or similar
    }

    return code; // In production, don't return the code
  }

  static async verifyOtp(contact: string, inputCode: string): Promise<boolean> {
    const otpData = otpStorage.get(contact);
    
    if (!otpData) {
      throw new Error('OTP not found or expired');
    }

    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(contact);
      throw new Error('OTP expired');
    }

    if (otpData.code !== inputCode) {
      throw new Error('Invalid OTP code');
    }

    // Mark as verified
    otpData.verified = true;
    otpStorage.set(contact, otpData);
    
    return true;
  }

  static isVerified(contact: string): boolean {
    const otpData = otpStorage.get(contact);
    return otpData?.verified || false;
  }

  static clearOtp(contact: string): void {
    otpStorage.delete(contact);
  }
}