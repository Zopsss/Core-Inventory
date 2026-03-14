import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/authUtils.js";
import type { JwtPayload } from "../types/authTypes.js";

// Extend Express Request to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Try to get token from cookie first, then Authorization header
  const cookieToken = req.cookies?.["token"] as string | undefined;
  const authHeader = req.headers["authorization"];
  const bearerToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  const token = cookieToken ?? bearerToken;

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
