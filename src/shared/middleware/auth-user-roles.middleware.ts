import { Request, Response, NextFunction } from 'express';
import { Role } from '../enums/user-role.enum';
import { ForbiddenError } from '../errors/forbidden.error';

export const authorizeRoles = (allowedRoles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Debug: Log the entire user object
            console.log('User object in authorizeRoles:', req.user);
            console.log('Allowed roles:', allowedRoles);

            // Check if user exists on request
            if (!req.user) {
                console.error('No user found on request object');
                throw new ForbiddenError('User not authenticated');
            }

            // Get the user role from the authenticated request
            const userRole = req.user.role;

            if (!userRole) {
                console.error('No role found on user object. User object:', req.user);
                throw new ForbiddenError('No role specified');
            }

            console.log('User role:', userRole);

            // Check if the user's role is included in the allowed roles
            const isAllowed = allowedRoles.includes(userRole);

            if (!isAllowed) {
                console.error(`User role '${userRole}' not in allowed roles:`, allowedRoles);
                throw new ForbiddenError('You do not have permission to access this resource');
            }

            console.log('User authorized successfully');
            next();
        } catch (error) {
            next(error);
        }
    };
};