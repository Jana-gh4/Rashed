import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt";

/**
 * requireAuth — checks Authorization: Bearer <JWT> header.
 * Falls back to session cookie for backward compatibility.
 * Sets req.session.userId so downstream handlers work unchanged.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Try JWT from Authorization header (primary — works in all iframe/proxy contexts)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.session.userId = payload.userId;
      next();
      return;
    }
  }

  // 2. Fall back to session cookie
  if (req.session?.userId) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export async function loadUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.session.userId = payload.userId;
    }
  }
  next();
}
