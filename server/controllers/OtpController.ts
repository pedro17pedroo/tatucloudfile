import { Request, Response } from 'express';
import { OtpService } from '../services/OtpService';
import { z } from 'zod';

const sendOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
});

const verifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  otp: z.string().length(6),
}).refine((data) => data.email || data.phone, {
  message: "Either email or phone is required",
});

export class OtpController {
  static async sendOtp(req: Request, res: Response) {
    try {
      const { email, phone } = sendOtpSchema.parse(req.body);
      
      const contact = email || phone!;
      const contactType = email ? 'email' : 'phone';

      // Validate format
      if (contactType === 'email' && !/\S+@\S+\.\S+/.test(contact)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      if (contactType === 'phone' && !/^\+\d{10,}$/.test(contact)) {
        return res.status(400).json({ message: 'Invalid phone format. Use international format like +351912345678' });
      }

      await OtpService.sendOtp(contact, contactType);

      res.status(200).json({
        message: `OTP sent to ${contactType}`,
        contact: contactType === 'email' ? contact : `${contact.substring(0, 4)}****${contact.substring(contact.length - 4)}`
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  }

  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, phone, otp } = verifyOtpSchema.parse(req.body);
      
      const contact = email || phone!;
      
      const isValid = await OtpService.verifyOtp(contact, otp);
      
      if (isValid) {
        res.status(200).json({ 
          message: 'OTP verified successfully',
          verified: true
        });
      } else {
        res.status(400).json({ message: 'Invalid OTP' });
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      res.status(400).json({ 
        message: error.message || 'OTP verification failed' 
      });
    }
  }
}