import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Product } from '../../types';
import { Heart, X, Sparkle } from '@phosphor-icons/react';

interface SwipeableCardProps {
  product: Product;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({ product, onSwipe, isTop }) => {
  const [exitX, setExitX] = React.useState<number>(0);
  const x = useMotionValue(0);
  
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // Feedback overlays
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-150, -50], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      setExitX(500);
      onSwipe('right');
    } else if (info.offset.x < -100) {
      setExitX(-500);
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05 }}
      exit={{ x: exitX, opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full w-full bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100">
        {/* Image */}
        <img 
          src={product.imageUrl || (product.imageUrls?.[0])} 
          alt={product.name} 
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Overlays for Feedback */}
        <motion.div 
          style={{ opacity: likeOpacity }}
          className="absolute top-16 left-10 border-4 border-green-500 rounded-2xl px-6 py-2 rotate-[-15deg] pointer-events-none z-30"
        >
          <span className="text-green-500 text-4xl font-black uppercase">QUERO</span>
        </motion.div>

        <motion.div 
          style={{ opacity: dislikeOpacity }}
          className="absolute top-16 right-10 border-4 border-red-500 rounded-2xl px-6 py-2 rotate-[15deg] pointer-events-none z-30"
        >
          <span className="text-red-500 text-3xl font-black uppercase">NÃO</span>
        </motion.div>

        {/* Main Info Footer (Static) */}
        <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none z-20">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-brand-pink/20 backdrop-blur-md rounded-md text-brand-pink text-[9px] font-fashion uppercase tracking-widest border border-brand-pink/30">
              {product.category}
            </span>
            {product.stockType === 'previsao_meta' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-brand-blue/20 backdrop-blur-md rounded-md text-brand-blue text-[9px] font-fashion uppercase tracking-widest border border-brand-blue/30">
                <Sparkle size={10} weight="fill" />
                Meta
              </span>
            )}
          </div>
          
          <h2 className="text-3xl font-black text-white mb-1 tracking-tight leading-none truncate pr-16">
            {product.name}
          </h2>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
            </span>
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
              No Atacado
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeableCard;
