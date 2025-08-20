import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { storage } from '../storage';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Apelido é obrigatório'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova password deve ter pelo menos 6 caracteres'),
});

export class ProfileController {
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const profileData = updateProfileSchema.parse(req.body);
      
      // Create update object with only provided fields
      const updateData: any = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        updatedAt: new Date(),
      };

      // Only update email if provided
      if (profileData.email) {
        const existingUser = await storage.getUserByEmail(profileData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: 'Este email já está em uso por outra conta' });
        }
        updateData.email = profileData.email;
      }

      // Only update phone if provided
      if (profileData.phone) {
        const existingUser = await storage.getUserByPhone(profileData.phone);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: 'Este telefone já está em uso por outra conta' });
        }
        updateData.phone = profileData.phone;
      }

      // Update user profile
      const updatedUser = await storage.updateUser(userId, updateData);

      res.json({
        message: 'Perfil atualizado com sucesso',
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          planId: updatedUser.planId,
          isAdmin: updatedUser.isAdmin
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Não autorizado' });
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Get current user
      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: 'Utilizador não encontrado' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Password atual incorreta' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(userId, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      res.json({
        message: 'Password alterada com sucesso'
      });
    } catch (error) {
      console.error('Change password error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      res.status(500).json({ message: 'Erro ao alterar password' });
    }
  }
}