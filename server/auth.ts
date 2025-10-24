import type { Request, Response, NextFunction } from "express";

// Extend Express Session to include user
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthRequest extends Request {
  userId?: string;
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  (req as AuthRequest).userId = req.session.userId;
  next();
}

// Optional auth middleware - doesn't block if not authenticated
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    (req as AuthRequest).userId = req.session.userId;
  }
  next();
}
