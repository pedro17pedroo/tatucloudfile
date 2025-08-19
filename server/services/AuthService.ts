import { storage } from '../storage';
import bcrypt from 'bcrypt';
import type { User } from '@shared/schema';

export interface RegisterData {
  firstName: string;
  lastName: string;
  emailOrPhone: string;
  password: string;
}

export class AuthService {
  static async register(data: RegisterData): Promise<User> {
    const { firstName, lastName, emailOrPhone, password } = data;

    // Check if it's email or phone
    const isEmail = emailOrPhone.includes('@');
    const isPhone = /^\+?[\d\s\-\(\)]+$/.test(emailOrPhone);

    if (!isEmail && !isPhone) {
      throw new Error('Formato de email ou telefone inválido');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userData = {
      firstName,
      lastName,
      email: isEmail ? emailOrPhone : null,
      phone: isPhone ? emailOrPhone : null,
      passwordHash,
      planId: 'basic'
    };

    return await storage.createUser(userData);
  }

  static async login(emailOrPhone: string, password: string): Promise<User> {
    // Find user by email or phone
    const user = await storage.getUserByEmailOrPhone(emailOrPhone);
    
    if (!user || !user.passwordHash) {
      throw new Error('Credenciais inválidas');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    return user;
  }

  static async getUserById(id: string): Promise<User | undefined> {
    return await storage.getUser(id);
  }
}