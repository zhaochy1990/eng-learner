import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

// Load RSA public key at startup
let publicKey: string;

const keyContent = process.env.JWT_PUBLIC_KEY;
if (keyContent) {
  publicKey = keyContent.replace(/\\n/g, '\n');
} else {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || '../auth/sources/dev/authentication/keys/public.pem';
  const resolved = path.resolve(keyPath);
  publicKey = fs.readFileSync(resolved, 'utf-8');
}

const JWT_ISSUER = process.env.JWT_ISSUER || 'auth-service';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: JWT_ISSUER,
    }) as jwt.JwtPayload;

    req.userId = decoded.sub;
    req.userRole = (decoded as Record<string, unknown>).role as string | undefined;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
