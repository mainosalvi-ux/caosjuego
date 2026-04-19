import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { GameSession } from './components/GameSession';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App mounted, checking auth state...");
    
    // Check for redirect result on mount
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          console.log("Redirect result success:", result.user.email);
        } else {
          console.log("No redirect result found (normal mount)");
        }
      })
      .catch((err) => {
        console.error("Auth redirect error:", err);
        if (err.code === 'auth/unauthorized-domain') {
          setError(`Dominio no autorizado. Añade este dominio en Firebase: ${window.location.hostname}`);
        } else {
          setError(`Error de autenticación: ${err.message}`);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed. User:", u ? u.email : "Logged out");
      setUser(u);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={48} />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-4">
          <div className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-4 animate-in slide-in-from-top duration-300">
            <AlertCircle className="shrink-0" size={24} />
            <div className="flex-1">
              <p className="font-black text-xs uppercase tracking-widest mb-1">Error de Autenticación</p>
              <p className="text-xs opacity-90">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-3 text-[10px] font-black uppercase tracking-widest underline opacity-60 hover:opacity-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={user ? <Dashboard /> : <Login />} 
          />
          <Route 
            path="/game/:sessionId" 
            element={user ? <GameSession /> : <Navigate to="/" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

