import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, handleFirestoreError } from '@/src/lib/firebase';
import { 
  doc, onSnapshot, updateDoc, setDoc, getDoc, 
  collection, query, getDocs, writeBatch 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User, Copy, Play, ArrowRight, Trophy, Clock, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Session, Participant, Deck, GameStatus } from '@/src/types';
import { Card } from './Card';
import { Chat } from './Chat';
import { shuffle, cn } from '@/src/lib/utils';
import { OFFICIAL_DECK } from '@/src/constants';

export function GameSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [me, setMe] = useState<Participant | null>(null);
  const [hostDeck, setHostDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const hasJoined = React.useRef(false);

  // Sync session and participants
  useEffect(() => {
    if (!sessionId) return;
    
    setLoading(true);
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (!docSnap.exists()) {
        navigate('/');
        return;
      }
      setSession({ id: docSnap.id, ...docSnap.data() } as Session);
    });

    const participantsRef = collection(db, 'sessions', sessionId, 'participants');
    const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
      const parts = snapshot.docs.map(d => d.data() as Participant);
      setParticipants(parts);
      const foundMe = parts.find(p => p.userId === auth.currentUser?.uid);
      setMe(foundMe || null);
      setLoading(false); // Only stop loading after participants arrive too
    });

    return () => {
      unsubSession();
      unsubParticipants();
    };
  }, [sessionId, navigate]);

  // Join session if not already in
  useEffect(() => {
    const join = async () => {
      if (!sessionId || !auth.currentUser || loading || hasJoined.current) return;
      
      const pRef = doc(db, 'sessions', sessionId, 'participants', auth.currentUser.uid);
      
      // If we are already in the participants list, we don't need to join
      const alreadyInList = participants.some(p => p.userId === auth.currentUser?.uid);
      if (alreadyInList) {
        hasJoined.current = true;
        return;
      }

      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) {
        await setDoc(pRef, {
          userId: auth.currentUser.uid,
          displayName: auth.currentUser.displayName || 'Anónimo',
          score: 0,
          hand: [],
          selectedCard: null,
          isReady: false,
          hasVoted: false,
          votedFor: null
        });
      }
      hasJoined.current = true;
    };
    join();
  }, [sessionId, auth.currentUser?.uid, loading, participants]);

  // Timer logic
  useEffect(() => {
    if (!session?.timerEnd) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((session.timerEnd! - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && session.status === 'playing' && auth.currentUser?.uid === session.hostId) {
        // Auto-end phase if host
        endChoosingPhase();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.timerEnd, session?.status, session?.hostId]);

  // Fetch host deck for the host to handle logic
  useEffect(() => {
    const fetchDeck = async () => {
      if (session?.hostId === auth.currentUser?.uid && session.deckId) {
        if (session.deckId === 'official') {
          setHostDeck(OFFICIAL_DECK as any as Deck);
        } else {
          const deckSnap = await getDoc(doc(db, 'decks', session.deckId));
          if (deckSnap.exists()) {
            setHostDeck(deckSnap.data() as Deck);
          }
        }
      }
    };
    fetchDeck();
  }, [session?.hostId, session?.deckId]);

  const startGame = async () => {
    if (!sessionId || !hostDeck || !session) return;
    
    const batch = writeBatch(db);
    const shuffledBlack = shuffle(hostDeck.blackCards);
    const firstBlack = shuffledBlack[0];

    // Deal 10 cards to each participant
    participants.forEach(p => {
      const pRef = doc(db, 'sessions', sessionId, 'participants', p.userId);
      const hand = shuffle(hostDeck.whiteCards).slice(0, 10);
      batch.update(pRef, { hand, isReady: false, selectedCard: null });
    });

    batch.update(doc(db, 'sessions', sessionId), {
      status: 'playing',
      currentBlackCard: firstBlack,
      round: 1,
      timerEnd: Date.now() + 20000 // 20 seconds
    });

    await batch.commit();
  };

  const selectCard = async (cardText: string) => {
    if (!sessionId || !me || session?.status !== 'playing' || me.isReady) return;

    const pRef = doc(db, 'sessions', sessionId, 'participants', me.userId);
    const newHand = me.hand.filter(c => c !== cardText);
    await updateDoc(pRef, {
      selectedCard: cardText,
      hand: newHand,
      isReady: true
    });

    // Check if everyone is ready
    const allReady = participants.every(p => 
      p.userId === auth.currentUser?.uid ? true : p.isReady
    ) && participants.length > 1; // Need at least 2 players

    if (allReady && session?.hostId === auth.currentUser?.uid) {
      endChoosingPhase();
    }
  };

  const endChoosingPhase = async () => {
    if (!sessionId) return;
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'voting',
      timerEnd: null
    });
  };

  const voteFor = async (targetUserId: string) => {
    if (!sessionId || !me || session?.status !== 'voting' || me.hasVoted || targetUserId === me.userId) return;

    const pRef = doc(db, 'sessions', sessionId, 'participants', me.userId);
    await updateDoc(pRef, {
      hasVoted: true,
      votedFor: targetUserId
    });
  };

  const nextRound = async () => {
    if (!sessionId || !session || !hostDeck) return;

    // Calculate score based on votes
    const votes: Record<string, number> = {};
    participants.forEach(p => {
      if (p.votedFor) {
        votes[p.votedFor] = (votes[p.votedFor] || 0) + 1;
      }
    });

    let winnerId = '';
    let maxVotes = -1;
    Object.entries(votes).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = id;
      }
    });

    const batch = writeBatch(db);
    participants.forEach(p => {
      const pRef = doc(db, 'sessions', sessionId, 'participants', p.userId);
      const isWinner = p.userId === winnerId;
      
      // Top up hand to 10
      const currentHand = p.hand;
      const cardsNeeded = 10 - currentHand.length;
      const newFromDeck = shuffle(hostDeck.whiteCards).slice(0, cardsNeeded);
      
      batch.update(pRef, {
        score: p.score + (isWinner ? 1 : 0),
        hand: [...currentHand, ...newFromDeck],
        isReady: false,
        hasVoted: false,
        votedFor: null,
        selectedCard: null
      });

      if (isWinner) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });

    const nextBlack = hostDeck.blackCards[Math.floor(Math.random() * hostDeck.blackCards.length)];

    batch.update(doc(db, 'sessions', sessionId), {
      status: 'playing',
      currentBlackCard: nextBlack,
      round: session.round + 1,
      timerEnd: Date.now() + 20000
    });

    await batch.commit();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="animate-spin text-white" size={48} />
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-brand-black overflow-hidden font-sans">
      {/* Aside Sidebar */}
      <aside className="w-72 border-r border-white/10 flex flex-col bg-black p-6 shrink-0 z-30">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">CAOS<span className="text-brand-accent">!</span></h1>
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 group active:scale-95 transition-all cursor-pointer"
               onClick={() => {
                 navigator.clipboard.writeText(sessionId || '');
                 alert('¡ID de sesión copiado!');
               }}>
            <p className="text-[9px] font-mono font-black uppercase tracking-[0.2em] opacity-30 mb-2">ID DE SESIÓN</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-mono font-black tracking-widest text-brand-accent">{sessionId}</span>
              <Copy size={16} className="opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-[8px] font-mono opacity-20 mt-2 uppercase tracking-tighter">Click para copiar código</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-4">Jugadores ({participants.length}/8)</p>
            <ul className="space-y-4">
              {participants.map((p) => (
                <li key={p.userId} className="flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    {p.isReady && <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse shadow-[0_0_8px_#FF007A]" />}
                    <span className={cn(
                      "text-sm font-bold transition-all",
                      p.userId === me?.userId ? "text-brand-accent" : "text-white/60 group-hover:text-white"
                    )}>
                      {p.userId === me?.userId ? 'Tú' : `@${p.displayName.toLowerCase().replace(/\s/g, '_')}`}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded opacity-60">
                    {p.score.toString().padStart(2, '0')} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto h-72">
            <Chat sessionId={sessionId!} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-brand-gray relative overflow-hidden">
        {/* Top Header */}
        <div className="flex justify-between items-center p-8 z-20">
          <div className="glass px-6 py-2 rounded-full hidden sm:flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-black">Partida Activa</span>
          </div>

          <div className="flex items-center gap-8 ml-auto">
            <button 
              onClick={() => navigate('/')}
              className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-40 hover:opacity-100 hover:text-brand-accent transition-all flex items-center gap-2"
            >
              Abanddonar Sala
            </button>
            {session?.status === 'playing' && (
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase opacity-40 leading-none mb-1">Tiempo restante</p>
                <p className={cn(
                  "text-4xl font-black tabular-nums transition-colors",
                  timeLeft <= 5 ? "text-brand-accent" : "text-white"
                )}>{timeLeft}s</p>
              </div>
            )}
            
            <div className="flex gap-2">
              {session?.status === 'waiting' && session?.hostId === auth.currentUser?.uid && (
                <button 
                  onClick={startGame}
                  disabled={participants.length < 2}
                  className="bg-white text-black px-6 py-3 rounded-lg font-black text-xs uppercase hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50"
                >
                  EMPEZAR
                </button>
              )}
              {session?.status === 'voting' && session?.hostId === auth.currentUser?.uid && (
                <button 
                  onClick={nextRound}
                  className="bg-brand-accent text-white px-6 py-3 rounded-lg font-black text-xs uppercase hover:bg-white hover:text-black transition-all shadow-xl shadow-brand-accent/20"
                >
                  SIGUIENTE RONDA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar pb-32">
          <AnimatePresence mode="wait">
            {session?.status === 'waiting' && (
              <motion.div 
                key="waiting" 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-4"
              >
                <h2 className="text-6xl font-black italic tracking-tighter opacity-10 uppercase">CAOS!</h2>
                <h3 className="text-3xl font-black uppercase tracking-tight">Esperando al anfitrión...</h3>
                <p className="font-mono text-[10px] uppercase tracking-widest opacity-30">Se requieren 2 jugadores mínimos</p>
              </motion.div>
            )}

            {(session?.status === 'playing' || session?.status === 'voting') && (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl flex flex-col items-center gap-12">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full">
                  {/* Black Card */}
                  <Card type="black" text={session.currentBlackCard || ''} className="w-72 h-96 text-2xl p-8 shrink-0" />

                  {/* Played Cards Area */}
                  <div className="flex-1 flex flex-col gap-6 w-full lg:w-auto">
                    {session.status === 'playing' ? (
                      <div className="glass p-6 rounded-2xl border-white/5 text-center">
                        <p className="text-xs font-mono uppercase tracking-[0.2em] opacity-40 mb-2 italic">A la espera de respuestas...</p>
                        <div className="flex justify-center gap-2">
                           {participants.map((p, i) => (
                             <div key={i} className={cn(
                               "w-8 h-1 rounded-full transition-all duration-500",
                               p.isReady ? "bg-brand-accent" : "bg-white/10"
                             )} />
                           ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {participants.filter(p => p.selectedCard).map(p => (
                          <div key={p.userId} className="flex flex-col items-center gap-3">
                            <Card 
                              type="white" 
                              text={p.selectedCard!} 
                              onClick={() => voteFor(p.userId)}
                              disabled={me?.hasVoted || p.userId === me?.userId}
                              selected={me?.votedFor === p.userId}
                              className="w-40 h-56 text-sm"
                            />
                            <div className="flex gap-1 h-1">
                              {participants.filter(voter => voter.votedFor === p.userId).map((voter, i) => (
                                 <div key={i} className="w-1 h-3 bg-brand-accent rounded-full" />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hand Section */}
        {session?.status === 'playing' && me && (
          <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-white/5 bg-gradient-to-t from-brand-black to-transparent z-10">
            <div className="flex justify-between items-end mb-4 px-2">
              <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">TU MANO ({me.hand.length})</h3>
              {me.isReady && <span className="text-[10px] font-mono text-brand-accent font-black uppercase tracking-widest animate-pulse">CARTA SELECCIONADA</span>}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 custom-scrollbar">
              {me.hand.map((card, i) => (
                <Card 
                  key={i} 
                  type="white" 
                  text={card} 
                  onClick={() => selectCard(card)} 
                  disabled={me.isReady}
                  className="w-40 h-52 shrink-0 p-4"
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
