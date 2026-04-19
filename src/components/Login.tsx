import React from 'react';
import { signIn } from '@/src/lib/firebase';
import { motion } from 'motion/react';

export function Login() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-12 rounded-[2.5rem] card-shadow text-center flex flex-col items-center"
      >
        <div className="mb-12">
          <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">CAOS<span className="text-brand-accent">!</span></h1>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-30 mt-2">Hasta Donde Puedas</p>
        </div>
        
        <p className="text-lg font-medium opacity-60 mb-12 max-w-[280px]">
          El juego de cartas que tus padres no deberían saber que juegas.
        </p>

        <button 
          onClick={signIn}
          className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-accent hover:text-white transition-all text-sm uppercase tracking-widest active:scale-95 shadow-xl shadow-black/50 overflow-hidden relative group"
        >
          <span className="relative z-10">ENTRAR CON GOOGLE</span>
        </button>

        <p className="mt-8 text-[9px] font-mono font-bold opacity-20 uppercase tracking-[0.2em]">
          Multiplayer Real-time • Mazos Custom
        </p>
      </motion.div>
    </div>
  );
}
