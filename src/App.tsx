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
    // Check for redirect result on mount
    getRedirectResult(auth).catch((err) => {
      console.error("Auth redirect error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Dominio no autorizado. Asegúrate de añadir este dominio en la consola de Firebase: ${window.location.hostname}`);
      } else {
        setError(err.message);
      }
    });

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
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

