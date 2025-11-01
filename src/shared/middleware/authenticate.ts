import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenError } from '../errors/forbidden.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
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
            throw new UnauthorizedError('Please sign in to access this resource');
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
            throw new UnauthorizedError('Invalid authentication token. Please sign in again');
        }

        // Handle different possible role field names
        const userRole = decoded.role || decoded.userRole || decoded.user_role;
        
        if (!userRole) {
            console.error('No role found in JWT payload. Available fields:', Object.keys(decoded));
            throw new UnauthorizedError('Invalid authentication token. Please sign in again');
        }

        // Normalize role to match Role enum (e.g., 'sponsor' -> 'SPONSOR')
        const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase() : userRole;

        // Ensure role is a valid Role enum value
        const validRoles = Object.values(Role);
        if (!validRoles.includes(normalizedRole)) {
            throw new UnauthorizedError('Invalid authentication token. Please sign in again');
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
            next(new UnauthorizedError('Invalid or expired token. Please sign in again'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError('Your session has expired. Please sign in again'));
        } else {
            next(error);
        }
    }
};