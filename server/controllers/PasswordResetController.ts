import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { OtpService } from '../services/OtpService';

// Validation schemas
const forgotPasswordSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email ou telefone é obrigatório'),
});

const verifyResetOtpSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email ou telefone é obrigatório'),
  otp: z.string().length(6, 'Código OTP deve ter 6 dígitos'),
});

const resetPasswordSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email ou telefone é obrigatório'),
  password: z.string().min(6, 'Password deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirmação de password é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords não coincidem",
  path: ["confirmPassword"],
});

export class PasswordResetController {
  /**
   * Step 1: Send OTP for password reset
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { emailOrPhone } = forgotPasswordSchema.parse(req.body);

      // Check if it's email or phone
      const isEmail = emailOrPhone.includes('@');
      const isPhone = /^\+?[\d\s\-\(\)]+$/.test(emailOrPhone);

      if (!isEmail && !isPhone) {
        return res.status(400).json({ 
          message: 'Formato de email ou telefone inválido' 
        });
      }

      // Check if user exists
      let user;
      if (isEmail) {
        user = await storage.getUserByEmail(emailOrPhone);
      } else {
        user = await storage.getUserByPhone(emailOrPhone);
      }

      if (!user) {
        return res.status(404).json({ 
          message: 'Utilizador não encontrado com este email ou telefone' 
        });
      }

      // Send OTP
      const contactType = isEmail ? 'email' : 'phone';
      await OtpService.sendOtp(emailOrPhone, contactType);

      res.json({
        message: 'Código de verificação enviado com sucesso',
        contact: emailOrPhone,
        contactType
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: 'Erro ao enviar código de verificação' 
      });
    }
  }

  /**
   * Step 2: Verify OTP for password reset
   */
  static async verifyResetOtp(req: Request, res: Response) {
    try {
      const { emailOrPhone, otp } = verifyResetOtpSchema.parse(req.body);

      // Verify OTP
      const isVerified = await OtpService.verifyOtp(emailOrPhone, otp);

      if (!isVerified) {
        return res.status(400).json({ 
          message: 'Código de verificação inválido ou expirado' 
        });
      }

      res.json({
        message: 'Código verificado com sucesso',
        contact: emailOrPhone
      });

    } catch (error) {
      console.error('Verify reset OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      
      // Handle OTP service errors
      if (error instanceof Error) {
        return res.status(400).json({ 
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        message: 'Erro ao verificar código' 
      });
    }
  }

  /**
   * Step 3: Reset password with verified OTP
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { emailOrPhone, password, confirmPassword } = resetPasswordSchema.parse(req.body);

      // Check if OTP was verified
      if (!OtpService.isVerified(emailOrPhone)) {
        return res.status(401).json({ 
          message: 'Código de verificação não foi validado' 
        });
      }

      // Check if it's email or phone
      const isEmail = emailOrPhone.includes('@');

      // Find user
      let user;
      if (isEmail) {
        user = await storage.getUserByEmail(emailOrPhone);
      } else {
        user = await storage.getUserByPhone(emailOrPhone);
      }

      if (!user) {
        return res.status(404).json({ 
          message: 'Utilizador não encontrado' 
        });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password
      await storage.updateUser(user.id, {
        passwordHash,
        updatedAt: new Date(),
      });

      // Clear OTP after successful password reset
      OtpService.clearOtp(emailOrPhone);

      res.json({
        message: 'Password redefinida com sucesso'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: 'Erro ao redefinir password' 
      });
    }
  }
}