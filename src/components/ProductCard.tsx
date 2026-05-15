import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBagOpen, Info } from '@phosphor-icons/react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const isMeta = product.stockType === 'previsao_meta';
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.unitPrice,
      imageUrl: (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : product.imageUrl,
      stockType: product.stockType
    });
  };

  // Deterministic random addition between R$ 3 and R$ 6 based on product ID
  const randomExtra = 3 + (product.id.charCodeAt(0) % 4);
  const originalPrice = product.unitPrice + randomExtra;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={cn(
        "group bg-white rounded-md sm:rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 flex flex-col h-full",
        className
      )}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        {product.imageUrls?.length || product.imageUrl ? (
          <img
            src={product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingBagOpen className="w-12 h-12 weight-thin" />
          </div>
        )}

        {/* Badges */}
        {isMeta && (
          <div className="absolute top-1 sm:top-3 left-1 sm:left-3 hidden sm:flex flex-col gap-1 sm:gap-2">
            <div className="px-1.5 py-0.5 sm:px-3 sm:py-1 bg-brand-yellow/90 backdrop-blur-md rounded-full text-[6px] sm:text-[10px] font-black uppercase tracking-wider text-gray-900 border border-white/20">
              Sob Encomenda
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button 
          onClick={handleAddToCart}
          className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 text-brand-pink hover:bg-brand-pink hover:text-white transition-all duration-300 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <ShoppingBagOpen size={20} weight="bold" />
        </button>
      </div>

      {/* Info Container */}
      <div className="p-1.5 sm:p-5 flex flex-col flex-1 justify-between gap-0.5 sm:gap-2">
        <div>
          <h3 className="text-[9px] sm:text-base font-bold leading-tight text-gray-900 truncate group-hover:text-brand-pink transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-0.5 sm:gap-1 whitespace-nowrap">
            <span className="text-[14px] sm:text-2xl font-black tracking-tighter text-brand-pink leading-none">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
            </span>
            <span className="text-[9px] sm:text-[14px] text-gray-400 line-through leading-none font-bold opacity-60">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
            </span>
          </div>
          
          {isMeta && product.requiredGoal && (
            <span className="font-fashion text-[6px] sm:text-[10px] text-brand-pink font-bold uppercase tracking-widest">
              Progresso: {product.currentGoalProgress || 0}/{product.requiredGoal}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
