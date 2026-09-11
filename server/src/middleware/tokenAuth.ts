import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/token';

/**
 * Middleware that inspects incoming Authorization: Bearer <token> headers.
 * If a valid signed token is provided, it populates req.session with the authenticated
 * credentials so all downstream routes (repos, world, user, settings) work transparently.
 */
export function tokenAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        if (!req.session) {
          req.session = {} as any;
        }
        req.session.accessToken = payload.accessToken;
        req.session.user = payload.user;
        req.session.privateAccess = payload.privateAccess;
        if (payload.gatekeeper) {
          req.session.gatekeeper = payload.gatekeeper;
        }
      }
    }
  }
  next();
}
