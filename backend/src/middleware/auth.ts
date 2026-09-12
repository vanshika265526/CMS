import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User.js';
import Session from '../models/Session.js';

interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  console.log(`[AUTH] Checking header: "${req.headers.authorization}"`);
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      req.token = token;
      console.log(`[AUTH] Token extracted: ${token.substring(0, 10)}...`);
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      console.log(`[AUTH] Token decoded successfully. ID: ${decoded.id}`);

      const normalizedTokenRole = String(decoded.role || '').toUpperCase();
      const isPersistentAdminSession = ['COLLEGE_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(normalizedTokenRole);
      const activeSessionQuery: any = {
        jwt_token: token,
        is_active: true,
      };
      if (!isPersistentAdminSession) {
        activeSessionQuery.expires_at = { $gt: new Date() };
      }

      const activeSession = await Session.findOne(activeSessionQuery);
      if (!activeSession) {
        return res.status(401).json({ message: 'Session expired or invalidated' });
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      const normalizedRole = String(req.user.role || '').toUpperCase();
      const allowedDuringFirstLogin = [
        '/api/auth/change-password',
        '/api/auth/profile',
        '/api/auth/logout',
        '/api/settings/public',
      ];
      if (
        normalizedRole === 'COLLEGE_ADMIN' &&
        req.user.isFirstLogin &&
        !allowedDuringFirstLogin.some((path) => req.originalUrl.startsWith(path))
      ) {
        return res.status(403).json({
          success: false,
          message: 'First login password change required',
          code: 'FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED'
        });
      }

      activeSession.last_activity = new Date();
      await activeSession.save();
      return next();
    } catch (error: any) {
      console.error('[AUTH ERROR] Token verification failure:', error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.warn('[AUTH] Access denied: No token provided in headers');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role?.toString().trim().toUpperCase();
    const requiredRoles = roles.map(r => r.trim().toUpperCase());
    
    console.log(`[AUTH] Path: ${req.method} ${req.originalUrl}`);
    console.log(`[AUTH] Required: ${JSON.stringify(requiredRoles)}, User: "${userRole}"`);
    
    if (req.user && requiredRoles.includes(userRole)) {
      next();
    } else {
      console.warn(`[AUTH] Forbidden: "${userRole}" matches none of ${JSON.stringify(requiredRoles)}`);
      res.status(403).json({ 
        success: false, 
        message: `Role ${userRole} is not authorized. Required: ${requiredRoles.join(", ")}` 
      });
    }
  };
};
