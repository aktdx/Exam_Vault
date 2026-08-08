import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import appletConfig from '../../firebase-applet-config.json';

// Prefer the VITE_FIREBASE_* vars (set in Vercel). firebase-applet-config.json
// is only a local-dev fallback. Never mix fields from the two sources: the SDK
// validates the current origin against the authorized-domain list belonging to
// the apiKey's project, so an apiKey from a different project than the
// projectId/authDomain fails with auth/unauthorized-domain no matter what is
// listed in the console for the project you think you are using.
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfig = envConfig.apiKey ? envConfig : appletConfig;

if (!envConfig.apiKey) {
  console.warn(
    '[firebase] VITE_FIREBASE_API_KEY is not set — falling back to firebase-applet-config.json.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig?.projectId && firebaseConfig?.apiKey);
}

/**
 * Asks Identity Toolkit which project this apiKey actually belongs to, and which
 * origins it allows. Used to explain auth/unauthorized-domain, whose most common
 * cause is an apiKey left over from a different project — in that case the
 * console you are editing is not the one the SDK is checking against.
 */
export async function describeAuthorizedDomains() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects?key=${firebaseConfig.apiKey}`
  );
  if (!res.ok) throw new Error(`Identity Toolkit returned ${res.status}`);
  const data = await res.json();
  return {
    authorizedDomains: (data.authorizedDomains ?? []) as string[],
    // Default domains are always <projectId>.firebaseapp.com / .web.app, so the
    // list reveals the apiKey's real project even though the response only
    // carries the numeric project id.
    keyProjectId: (data.authorizedDomains as string[] | undefined)
      ?.find(d => d.endsWith('.firebaseapp.com'))
      ?.replace('.firebaseapp.com', ''),
  };
}
