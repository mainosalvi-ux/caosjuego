import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { ChatMessage } from '@/src/types';
import { cn } from '@/src/lib/utils';

export function Chat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'sessions', sessionId, 'chat'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
    });
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'sessions', sessionId, 'chat'), {
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Anónimo',
        text: input.trim(),
        createdAt: serverTimestamp()
      });
      setInput('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full glass rounded-xl overflow-hidden">
      <div className="p-3 border-b border-white/10 bg-white/5 font-mono font-bold text-[10px] uppercase tracking-widest opacity-40">
        Chat de la Sesión
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col">
            <span className={cn(
              "text-[9px] font-mono font-bold uppercase mb-1",
              m.userId === auth.currentUser?.uid ? "text-brand-accent" : "opacity-40"
            )}>
              {m.userId === auth.currentUser?.uid ? 'Tú' : m.displayName}
            </span>
            <p className="text-xs bg-white/5 p-3 rounded-lg inline-block self-start max-w-[90%] whitespace-pre-wrap leading-relaxed">
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-black flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribir chat..."
          className="flex-1 bg-transparent rounded-lg px-2 py-1 text-xs outline-none transition-all"
        />
        <button className="text-white p-2 hover:text-brand-accent transition-all">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
