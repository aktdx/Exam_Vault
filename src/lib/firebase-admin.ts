import * as dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app/credential';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

dotenv.config();

function normalizePrivateKey(value?: string) {
  if (!value) return undefined;

  return value
    .replace(/\\n/g, '\n')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function initializeFirebaseAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId) {
    console.warn('Firebase Admin not initialized: missing project ID');
    return;
  }

  if (clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      return;
    } catch (error) {
      console.warn('Firebase Admin service account initialization failed, falling back to project ID initialization:', error);
    }
  }

  initializeApp({ projectId });
}

initializeFirebaseAdmin();

export const adminAuth = getAuth();
