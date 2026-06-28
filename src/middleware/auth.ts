import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: any;
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
    
    const adminEmails = ['aaminkhansohel@gmail.com', 'aamin.khan25@mmit.edu.in'];
    const email = decodedToken.email || '';
    const isAdmin = adminEmails.includes(email.toLowerCase());

    let dbUserArr;
    try {
      dbUserArr = await db.insert(users)
        .values({
          uid: decodedToken.uid,
          email: email,
          isAdmin: isAdmin,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email: email, isAdmin: isAdmin }
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
            isAdmin: isAdmin,
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: { email: email, isAdmin: isAdmin }
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
