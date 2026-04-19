import React, { useState } from 'react';
import { db, auth, handleFirestoreError } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './Card';

interface DeckEditorProps {
  onSaved: () => void;
  onCancel: () => void;
}

export const DeckEditor: React.FC<DeckEditorProps> = ({ onSaved, onCancel }) => {
  const [title, setTitle] = useState('');
  const [whiteCards, setWhiteCards] = useState<string[]>(['']);
  const [blackCards, setBlackCards] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const addWhite = () => setWhiteCards([...whiteCards, '']);
  const addBlack = () => setBlackCards([...blackCards, '']);

  const updateWhite = (index: number, val: string) => {
    const next = [...whiteCards];
    next[index] = val;
    setWhiteCards(next);
  };

  const updateBlack = (index: number, val: string) => {
    const next = [...blackCards];
    next[index] = val;
    setBlackCards(next);
  };

  const removeWhite = (index: number) => setWhiteCards(whiteCards.filter((_, i) => i !== index));
  const removeBlack = (index: number) => setBlackCards(blackCards.filter((_, i) => i !== index));

  const saveDeck = async () => {
    if (!title.trim()) return alert('Ponle un nombre al mazo!');
    const filteredWhite = whiteCards.filter(c => c.trim());
    const filteredBlack = blackCards.filter(c => c.trim());
    if (filteredWhite.length < 10 || filteredBlack.length < 5) {
      return alert('El mazo debe tener al menos 10 blancas y 5 negras.');
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'decks'), {
        title,
        creatorId: auth.currentUser?.uid,
        whiteCards: filteredWhite,
        blackCards: filteredBlack,
        createdAt: serverTimestamp()
      });
      onSaved();
    } catch (err) {
      handleFirestoreError(err, 'create', '/decks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-4xl mx-auto p-12 glass rounded-3xl card-shadow overflow-hidden"
    >
      <div className="flex justify-between items-center mb-12">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase">Crear Mazo<span className="text-brand-accent">+</span></h2>
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors opacity-40 hover:opacity-100">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-12">
        <div className="glass p-6 rounded-2xl border-brand-accent/20 bg-brand-accent/5">
           <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-brand-accent">Instrucciones</p>
           <p className="text-xs opacity-60 mt-2">Agrega cartas negras (preguntas/situaciones) y blancas (respuestas). No hace falta emparejarlas, el juego las mezclará al azar.</p>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-black uppercase tracking-[0.3em] mb-4 opacity-30">Título del Mazo</label>
          <input 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            placeholder="PROCESAR NOMBRE..."
            className="w-full bg-brand-black border border-white/10 rounded-xl px-6 py-4 focus:border-brand-accent outline-none transition-all text-2xl font-black tracking-tighter uppercase"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Black Cards Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-2">
              <h3 className="text-[10px] font-mono font-black uppercase tracking-widest opacity-30">Cartas Negras</h3>
              <button 
                onClick={addBlack}
                className="text-[9px] font-mono font-black border border-white/20 px-3 py-1 rounded-full hover:bg-white hover:text-black transition-all"
              >
                + AÑADIR
              </button>
            </div>
            <div className="space-y-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {blackCards.map((text, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-2 group"
                  >
                    <textarea 
                      value={text}
                      onChange={e => updateBlack(i, e.target.value)}
                      placeholder="ESCRIBE SITUACIÓN..."
                      className="flex-1 bg-black border border-white/5 rounded-xl p-4 text-sm font-bold focus:border-brand-accent outline-none resize-none h-24 transition-all"
                    />
                    <button onClick={() => removeBlack(i)} className="text-white/20 hover:text-brand-accent p-1 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* White Cards Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-white/10 pb-2">
              <h3 className="text-[10px] font-mono font-black uppercase tracking-widest opacity-30">Cartas Blancas</h3>
              <button 
                onClick={addWhite}
                className="text-[9px] font-mono font-black border border-white/20 px-3 py-1 rounded-full hover:bg-white hover:text-black transition-all"
              >
                + AÑADIR
              </button>
            </div>
            <div className="space-y-3 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {whiteCards.map((text, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex gap-2 group"
                  >
                    <input 
                      type="text"
                      value={text}
                      onChange={e => updateWhite(i, e.target.value)}
                      placeholder="RESPUESTA..."
                      className="flex-1 bg-white text-black rounded-xl p-4 text-sm font-black outline-none border-2 border-transparent focus:border-brand-accent transition-all"
                    />
                    <button onClick={() => removeWhite(i)} className="text-white/20 hover:text-brand-accent p-1 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/10 flex justify-end">
          <button 
            disabled={saving}
            onClick={saveDeck}
            className="bg-white text-black font-black px-12 py-5 rounded-2xl flex items-center gap-3 hover:bg-brand-accent hover:text-white transition-all active:scale-95 text-xs uppercase tracking-[0.2em] shadow-2xl disabled:opacity-50"
          >
            {saving ? <Plus className="animate-spin" /> : <Save size={20} />}
            FINALIZAR MAZO
          </button>
        </div>
      </div>
    </motion.div>
  );
}
