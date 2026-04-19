import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import React from 'react';

interface CardProps {
  text: string;
  type: 'white' | 'black';
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ text, type, onClick, selected, disabled, className }) => {
  return (
    <motion.div
      whileHover={!disabled && onClick ? { y: -5, scale: 1.02 } : {}}
      whileTap={!disabled && onClick ? { scale: 0.98 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative rounded-xl p-6 transition-all duration-300 w-40 h-60 flex flex-col justify-between cursor-pointer card-shadow",
        type === 'black' 
          ? "bg-brand-black text-brand-white border-2 border-white/20" 
          : "bg-brand-white text-brand-black border-2 border-black/5",
        selected && "ring-4 ring-brand-accent scale-105 z-10 border-brand-accent",
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
    >
      <div className="font-sans font-black text-lg leading-tight">
        {text}
      </div>
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-mono font-bold tracking-widest opacity-30 uppercase">
          HDP
        </span>
        <div className={cn(
          "w-6 h-6 rounded-sm opacity-20 border-2",
          type === 'black' ? "border-white bg-transparent" : "border-black bg-transparent"
        )} />
      </div>
    </motion.div>
  );
}
