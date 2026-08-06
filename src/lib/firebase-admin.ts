import * as dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

dotenv.config();

function initializeFirebaseAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) {
    return;
  }

  if (clientEmail && privateKey) {
    initializeApp({
      credential: { clientEmail, privateKey } as any,
      projectId,
    });
    return;
  }

  initializeApp({ projectId });
}

initializeFirebaseAdmin();

export const adminAuth = getAuth();
