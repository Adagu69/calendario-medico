import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { LoginRequest, AuthResponse, ApiResponse } from '../types';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password }: LoginRequest = req.body;

      if (!identifier || !password) {
        res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos' });
        return;
      }
      
      const user = await UserModel.findByIdentifier(identifier);

      if (!user) {
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        return;
      }
      
      const isValidPassword = await UserModel.validatePassword(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        return;
      }
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({ success: false, error: 'Configuración del servidor incompleta' });
        return;
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          section_id: user.section_id,
          section_name: user.section_name
        },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );
      
      const { password: _, ...userWithoutPassword } = user;
      
      const authResponse: AuthResponse = {
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
      
      res.status(200).json({ success: true, data: authResponse, message: 'Login exitoso' });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body;
      
      const existingUser = await UserModel.findByIdentifier(userData.email);
      if (existingUser) {
        res.status(409).json({ success: false, error: 'El usuario o email ya existe' });
        return;
      }
      
      const newUser = await UserModel.create(userData);
      
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({ success: true, data: userWithoutPassword, message: 'Usuario creado exitosamente' });
      
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        return;
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({ success: true, data: userWithoutPassword });
      
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
  
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        return;
      }
      
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.status(500).json({ success: false, error: 'Configuración del servidor incompleta' });
        return;
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          section_id: user.section_id,
          section_name: user.section_name
        },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions
      );
      
      res.status(200).json({ success: true, data: { token, expiresIn: process.env.JWT_EXPIRES_IN || '24h' }, message: 'Token renovado exitosamente' });
      
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}