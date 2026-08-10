import jwt from "jsonwebtoken";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

const SECRET = process.env.SESSION_SECRET;
const EXPIRES_IN = "30d";

export interface TokenPayload {
  userId: number;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as TokenPayload & { iat: number; exp: number };
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}
