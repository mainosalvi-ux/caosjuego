import React, { useState, useEffect } from 'react';
import { db, auth, signOut, handleFirestoreError } from '@/src/lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Play, Book, LogOut, ChevronRight, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Deck } from '@/src/types';
import { DeckEditor } from './DeckEditor';
import { OFFICIAL_DECK } from '@/src/constants';

export function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDecks = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'decks'), where('creatorId', '==', auth.currentUser.uid));
      const snap = await getDocs(q);
      const userDecks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Deck));
      setDecks([OFFICIAL_DECK as any as Deck, ...userDecks]);
    } catch (err) {
      console.error(err);
      setDecks([OFFICIAL_DECK as any as Deck]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    navigate(`/game/${joinId.trim().toUpperCase()}`);
  };

  const generateShortId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evitamos I, O, 0, 1 por legibilidad
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const hostGame = async (deckId: string) => {
    if (!auth.currentUser) return;
    try {
      const shortId = generateShortId();
      await setDoc(doc(db, 'sessions', shortId), {
        hostId: auth.currentUser.uid,
        deckId: deckId,
        status: 'waiting',
        currentBlackCard: null,
        round: 0,
        createdAt: serverTimestamp()
      });
      navigate(`/game/${shortId}`);
    } catch (err) {
      handleFirestoreError(err, 'create', '/sessions');
    }
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-16 px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">CAOS<span className="text-brand-accent">!</span></h1>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-40">Jugador</p>
              <p className="text-sm font-bold truncate max-w-[150px]">@{auth.currentUser?.displayName?.toLowerCase().replace(/\s/g, '_') || 'usuario'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-brand-accent transition-all flex items-center gap-2"
          >
            <LogOut size={14} /> Desconectar
          </button>
        </header>

        <AnimatePresence mode="wait">
          {showEditor ? (
            <DeckEditor 
              onSaved={() => {
                setShowEditor(false);
                fetchDecks();
              }}
              onCancel={() => setShowEditor(false)}
            />
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16"
            >
              {/* Hero Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 glass p-12 rounded-3xl group overflow-hidden relative border-white/5">
                   <div className="z-10 relative">
                      <h2 className="text-6xl font-black tracking-tighter leading-none mb-6 group-hover:italic transition-all duration-500">CREA TU<br/><span className="text-brand-accent">PROPIO CAOS</span></h2>
                      <p className="opacity-40 text-xs font-mono uppercase tracking-widest leading-loose max-w-sm">Personaliza tus propias cartas negras y blancas para jugar de la forma más irreverente posible.</p>
                   </div>
                   <button 
                    onClick={() => setShowEditor(true)}
                    className="z-10 relative mt-10 bg-white text-black font-black px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-brand-accent hover:text-white transition-all text-xs uppercase tracking-widest active:scale-95 shadow-2xl"
                   >
                     <Plus size={18} /> NUEVO MAZO
                   </button>
                </div>

                <div className="glass p-8 rounded-3xl flex flex-col justify-center border-white/5 space-y-6">
                  <h3 className="text-xs font-mono font-black uppercase tracking-[0.3em] opacity-30 text-center">Unirse a Sesión</h3>
                  <form onSubmit={joinGame} className="space-y-4">
                    <input 
                      type="text"
                      placeholder="ID DE SESIÓN (ID)"
                      value={joinId}
                      onChange={(e) => setJoinId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-sm uppercase tracking-widest focus:border-brand-accent transition-all outline-none"
                    />
                    <button 
                      type="submit"
                      className="w-full bg-brand-accent text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all active:scale-95"
                    >
                      UNIRSE
                    </button>
                  </form>
                  <p className="text-[9px] opacity-20 font-mono text-center uppercase tracking-widest select-none pt-4">Mazo • Invite • Votar • Reír • Repetir</p>
                </div>
              </div>

              {/* Decks Section */}
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-white/10 pb-4">
                  <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.4em] opacity-30">Tus Mazos Registrados</h3>
                  <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest italic">{decks.length} DECK(S)</span>
                </div>
                
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-48 glass rounded-2xl animate-pulse" />)}
                  </div>
                ) : decks.length === 0 ? (
                  <div className="p-20 text-center glass rounded-3xl opacity-20">
                    <p className="text-xs font-mono uppercase tracking-[0.3em]">Mazo no encontrado. Procesa uno nuevo.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map((deck) => (
                      <motion.div 
                        layoutId={deck.id}
                        key={deck.id}
                        className="glass p-8 rounded-2xl border border-white/5 hover:border-brand-accent/50 transition-all group flex flex-col justify-between card-shadow"
                      >
                        <div>
                          <p className="text-[9px] font-mono uppercase text-brand-accent font-black tracking-widest mb-4">Mazo Personalizado</p>
                          <h4 className="text-3xl font-black tracking-tighter truncate mb-2 uppercase">{deck.title}</h4>
                          <div className="flex gap-4 text-[9px] font-mono font-bold opacity-30 uppercase tracking-widest mt-4">
                            <span>{deck.whiteCards.length} W</span>
                            <span>{deck.blackCards.length} B</span>
                          </div>
                        </div>

                        <div className="mt-12">
                          <button 
                            onClick={() => hostGame(deck.id!)}
                            className="w-full bg-white/5 hover:bg-white text-white hover:text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                          >
                            <Play size={14} className="fill-current" /> HOSTEAR SESIÓN
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
