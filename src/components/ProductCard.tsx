import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBagOpen, Info } from '@phosphor-icons/react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={cn(
        "group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100 flex flex-col h-full",
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
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <ShoppingBagOpen className="w-12 h-12 weight-thin" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isMeta ? (
            <div className="px-3 py-1 bg-brand-yellow/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-gray-900 border border-white/20">
              Sob Encomenda
            </div>
          ) : (
            <div className="px-3 py-1 bg-green-500/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
              Pronta Entrega
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={handleAddToCart}
          className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 text-brand-pink hover:bg-brand-pink hover:text-white transition-all duration-300 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <ShoppingBagOpen size={20} weight="bold" />
        </button>
      </div>

      {/* Info Container */}
      <div className="p-3 sm:p-5 flex flex-col flex-1 justify-between gap-1 sm:gap-2">
        <div>
          <div className="font-fashion text-[7px] sm:text-[8px] text-gray-400 truncate">
            {product.category}
          </div>
          <h3 className="text-xs sm:text-sm font-bold leading-tight text-gray-900 truncate group-hover:text-brand-pink transition-colors -mt-0.5">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black tracking-tight text-gray-900 leading-none">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
            </span>
            {isMeta && product.requiredGoal && (
              <span className="font-fashion text-[7px] sm:text-[8px] text-brand-pink truncate mt-0.5">
                {product.currentGoalProgress || 0}/{product.requiredGoal}
              </span>
            )}
          </div>
          
          <div className="text-gray-200 group-hover:text-brand-pink transition-colors hidden sm:block">
            <Info size={18} weight="bold" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
