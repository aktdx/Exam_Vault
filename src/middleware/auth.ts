import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, InferSelectModel } from 'drizzle-orm';

export type User = InferSelectModel<typeof users>;

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: User;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    const superAdmin = 'aaminkhansohel@gmail.com';
    const email = decodedToken.email || '';
    const isSuperAdmin = email.toLowerCase() === superAdmin;

    let dbUserArr;
    try {
      dbUserArr = await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: email,
          isAdmin: isSuperAdmin,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: isSuperAdmin ? { email: email, isAdmin: true } : { email: email }
        })
        .returning();
    } catch (e: any) {
      if (e.message?.includes('Connection terminated') || e.message?.includes('connection timeout')) {
        // Retry once on connection termination
        console.log('Retrying user upsert due to connection termination...');
        dbUserArr = await db.insert(users)
          .values({
            uid: decodedToken.uid,
            email: email,
            isAdmin: isSuperAdmin,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: isSuperAdmin ? { email: email, isAdmin: true } : { email: email }
          })
          .returning();
      } else {
        throw e;
      }
    }
      
    req.dbUser = dbUserArr[0];
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || !req.dbUser.isAdmin) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};
