import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

export function AdminLogin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        navigate('/admin');
      }
    });
    return unsub;
  }, [navigate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error(error);
      alert('Login failed');
    }
  };

  if (loading) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-center">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Admin Login</h1>
        <p className="text-sm text-slate-500 font-semibold mb-8">Sign in with your admin account to manage question papers.</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-600 hover:text-indigo-600 py-4 px-4 rounded-2xl font-bold transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
