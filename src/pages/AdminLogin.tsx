import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleAuthProvider, firebaseConfig, describeAuthorizedDomains } from '../lib/firebase';
import { apiFetch } from '../lib/api';
import { signInWithPopup, onAuthStateChanged, User, signOut } from 'firebase/auth';

import { Button } from '../components/ui/Button';

export function AdminLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const t = await u.getIdToken();
          const res = await apiFetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${t}` }
          });
          const data = await res.json();
          if (res.ok && data.user?.isAdmin) {
            setUser(u);
            navigate('/admin');
          } else {
            await signOut(auth);
            const backendError = data.error || data.message || 'Admin privileges required';
            setErrorMsg(`Access denied for ${u.email}: ${backendError}`);
          }
        } catch (e: any) {
          await signOut(auth);
          setErrorMsg(`Failed to verify admin status: ${e.message}`);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        setErrorMsg(`${window.location.hostname} is not an authorized domain for Firebase Auth.`);
        try {
          const { keyProjectId, authorizedDomains } = await describeAuthorizedDomains();
          if (keyProjectId && keyProjectId !== firebaseConfig.projectId) {
            setErrorMsg(
              `Firebase config mismatch: this build's API key belongs to project "${keyProjectId}", not "${firebaseConfig.projectId}". Add the domain to "${keyProjectId}", or use the API key from "${firebaseConfig.projectId}".`
            );
          } else {
            setErrorMsg(
              `${window.location.hostname} is not authorized for project "${firebaseConfig.projectId}". Authorized: ${authorizedDomains.join(', ')}`
            );
          }
        } catch {
          // Leave the generic message in place if the lookup itself fails.
        }
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setErrorMsg('Login was cancelled. Please try again.');
      } else {
        setErrorMsg(`Login failed: ${error.message || 'Unknown error'}`);
      }
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-center">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Admin Login</h1>
        <p className="text-sm text-slate-500 font-semibold mb-8">Sign in with your admin account to manage question papers.</p>
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-sm">
            {errorMsg}
          </div>
        )}
        
        <Button 
          variant="secondary"
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
