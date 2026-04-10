import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandPointing, ShoppingBagOpen, X, SkipForward } from '@phosphor-icons/react';

interface SwipeTutorialProps {
  onClose: () => void;
}

export default function SwipeTutorial({ onClose }: SwipeTutorialProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative max-w-sm w-full bg-gray-900/95 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col items-center overflow-hidden"
      >
        {/* Modal Background Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-brand-pink/20 rounded-full blur-[60px]" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-brand-blue/20 rounded-full blur-[60px]" />
        </div>

        {/* Close Icon */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors z-50"
        >
          <X size={20} weight="bold" />
        </button>

        {/* Header */}
        <div className="text-center mb-10 relative z-10">
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Match<span className="text-brand-pink">Express</span></h2>
        </div>

        {/* The Orbit Container */}
        <div className="relative w-full aspect-square flex items-center justify-center mb-6">
          
          {/* Action Bubbles */}
          <AnimatePresence>
            {/* Left: Pass */}
            <motion.div 
              animate={{ x: -90, y: 0, opacity: 1, scale: 1 }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute w-14 h-14 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex flex-col items-center justify-center shadow-2xl"
            >
              <X size={20} weight="bold" className="text-red-400" />
              <span className="text-[7px] font-black text-white/40 uppercase mt-1">Pular</span>
            </motion.div>

            {/* Right: Buy */}
            <motion.div 
              animate={{ x: 90, y: 0, opacity: 1, scale: 1 }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="absolute w-16 h-16 bg-brand-pink/10 backdrop-blur-xl rounded-full border border-brand-pink/20 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(247,37,133,0.1)]"
            >
              <ShoppingBagOpen size={24} weight="fill" className="text-brand-pink" />
              <span className="text-[7px] font-black text-white/80 uppercase mt-1 tracking-widest">Sacola</span>
            </motion.div>

            {/* Down: Info */}
            <motion.div 
              animate={{ x: 0, y: 100, opacity: 1, scale: 1 }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="absolute px-5 py-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-2 shadow-xl"
            >
              <span className="text-[9px] font-black text-white/80 uppercase tracking-widest leading-none">Explore o Look</span>
            </motion.div>
          </AnimatePresence>

          {/* Central Hand Animation */}
          <div className="relative z-20">
             <motion.div 
               animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white/20 rounded-full"
             />
             
             <motion.div
               animate={{ 
                 x: [-40, 40, -40, 0, 0, 0],
                 y: [0, 0, 0, 0, 40, 0],
                 rotate: [0, 5, -5, 0, 0, 0]
               }}
               transition={{ 
                 duration: 4, 
                 repeat: Infinity,
                 ease: "easeInOut"
               }}
               className="text-white/60 drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
             >
               <HandPointing size={56} weight="thin" />
             </motion.div>
          </div>
        </div>

        {/* Start Button */}
        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={onClose}
          className="mt-12 w-full flex items-center justify-center gap-3 py-4 bg-white text-gray-900 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-brand-pink hover:text-white transition-all active:scale-95 group relative z-10"
        >
          <span>Aproveitar</span>
          <SkipForward size={16} weight="fill" className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
