// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

export const verifyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ success: false, message: 'Token tidak valid' });
      return;
    }

    req.userId = user.id;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada autentikasi' });
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.userId = user.id;
      }
    }
    next();
  } catch {
    next();
  }
};