import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenError } from '../errors/forbidden.error';
import { Role } from '../enums/user-role.enum';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: Role;
                email: string;
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new ForbiddenError('Authentication required');
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT secret is not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // Debug: Log the decoded token to see its structure
        console.log('Decoded JWT payload:', decoded);

        // Check if required fields exist in the token
        if (!decoded.id || !decoded.email) {
            throw new ForbiddenError('Invalid token payload');
        }

        // Handle different possible role field names
        const userRole = decoded.role || decoded.userRole || decoded.user_role;
        
        if (!userRole) {
            console.error('No role found in JWT payload. Available fields:', Object.keys(decoded));
            throw new ForbiddenError('No role specified in token');
        }

        // Normalize role to match Role enum (e.g., 'sponsor' -> 'SPONSOR')
        const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;

        // Ensure role is a valid Role enum value
        const validRoles = Object.values(Role);
        if (!validRoles.includes(normalizedRole)) {
            throw new ForbiddenError(`Invalid role: ${userRole}`);
        }

        // Set the user information in the request
        req.user = {
            id: decoded.id,
            role: normalizedRole as Role,
            email: decoded.email
        };

        console.log('User authenticated:', { id: req.user.id, role: req.user.role, email: req.user.email });
        
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new ForbiddenError('Invalid token'));
        } else {
            next(error);
        }
    }
};