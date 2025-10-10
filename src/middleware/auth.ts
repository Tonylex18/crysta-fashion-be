import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../database/models/User';
import { Role } from '../shared/enums/user-role.enum';


export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: (decoded.userId || user.id)?.toString(),
      email: user.email,
      role: ((decoded as any).role as Role) || Role.USER,
    } as any;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
