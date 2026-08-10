import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import prisma from '../lib/prisma';
import { Role } from '@prisma/client';

// ─── Firebase Admin Initialization ──────────────────────────────────────────
let firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized || admin.apps.length > 0) return;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (base64) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(base64, 'base64').toString('utf8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    } catch (err) {
      console.error('❌ Failed to parse Firebase service account:', err);
    }
  } else {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_BASE64 not set — Firebase token verification disabled');
  }
}

initFirebase();

// ─── Extend Express Request ──────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        uid: string;
        email: string;
        name: string;
        role: Role;
        credits: number;
        photoURL?: string | null;
      };
    }
  }
}

// ─── Verify Firebase Token and Attach DB User ────────────────────────────────
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    let uid: string;
    let email: string;

    // Verify with Firebase Admin if initialized
    if (admin.apps.length > 0) {
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email || '';
    } else {
      // Development fallback: decode JWT without verification
      // ⚠️  Never use this in production
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8')
      );
      uid = payload.user_id || payload.uid || payload.sub;
      email = payload.email || '';
    }

    if (!uid) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    // Fetch user from DB
    const dbUser = await prisma.user.findFirst({
      where: { uid, isDeleted: false },
    });

    if (!dbUser) {
      res.status(401).json({ success: false, message: 'User not found. Please register first.' });
      return;
    }

    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      credits: dbUser.credits,
      photoURL: dbUser.photoURL,
    };

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    res.status(401).json({ success: false, message });
  }
}

// ─── Role Guards ─────────────────────────────────────────────────────────────
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireCreator = requireRole('creator', 'admin');
export const requireSupporter = requireRole('supporter', 'admin');
