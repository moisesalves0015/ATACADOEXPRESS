import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  finishLoading: () => void;
}

export default function SplashScreen({ finishLoading }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mantém a tela por pelo menos 2 segundos para a animação ser vista
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Pequeno delay para a animação de saída completar antes de desmontar no App.tsx
      setTimeout(finishLoading, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [finishLoading]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.9, 1.1, 1],
              opacity: 1 
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="flex flex-col items-center"
          >
            {/* Logo Recreated from Layout.tsx style */}
            <div className="flex items-baseline gap-1">
               <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">Atacado</span>
               <div className="w-3 h-3 rounded-full bg-brand-pink mb-2 animate-pulse" />
            </div>
            <span 
              className="text-xs font-black uppercase tracking-[0.4em] mt-1 ml-1 text-brand-pink"
            >
              Saldo da Kricia
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
