import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkle, X, ShoppingBagOpen, ShoppingCart, ArrowLeft, Info, CaretDown } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import SwipeableCard from '../components/discovery/SwipeableCard';
import SwipeTutorial from '../components/discovery/SwipeTutorial';
import { useCart } from '../context/CartContext';

export default function MatchDiscovery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      // Shuffle the products for a "Discovery" feel
      setProducts(productsData.sort(() => Math.random() - 0.5));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSwipeAt = (direction: 'left' | 'right', product: Product) => {
    if (direction === 'right') {
      addToCart({
        productId: product.id,
        productName: product.name,
        quantity: 3,
        unitPrice: product.unitPrice,
        imageUrl: product.imageUrl || (product.imageUrls?.[0]),
        stockType: product.stockType
      });
    }
    
    // Reset scroll when moving to next card
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentIndex(prev => prev + 1);
  };

  const currentProduct = products[currentIndex];

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-pink/20 border-t-brand-pink rounded-full animate-spin" />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Preparando seu feed...</p>
        </div>
      </div>
    );
  }

  const currentProducts = products.slice(currentIndex, currentIndex + 2).reverse();

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col pt-4 relative">
      <AnimatePresence mode="wait">
        {showTutorial && (
          <SwipeTutorial onClose={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-4">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={24} weight="bold" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-black text-gray-900 leading-none">Match Express</h1>
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-brand-pink/10 text-brand-pink rounded-xl">
          <Sparkle size={24} weight="fill" className="animate-pulse" />
        </div>
      </div>

      {currentIndex < products.length ? (
        <>
          {/* Card Container - Fixed Height for swipe area */}
          <div className="relative h-[65vh] px-4 mb-2">
            <AnimatePresence>
              {currentProducts.map((product, index) => {
                const isTop = index === currentProducts.length - 1;
                return (
                  <SwipeableCard
                    key={product.id}
                    product={product}
                    onSwipe={(dir) => handleSwipeAt(dir, product)}
                    isTop={isTop}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {/* Scroll Hint */}
          <div className="flex flex-col items-center gap-1 text-gray-300 mt-12 mb-20 animate-bounce">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Role para Detalhes</span>
            <CaretDown size={16} weight="bold" className="opacity-30" />
          </div>

          {/* Details Section - Only surges on scroll */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="px-6 pb-60"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/40">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 flex items-center justify-center bg-brand-pink/5 rounded-2xl text-brand-pink">
                   <Info size={32} weight="fill" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-black text-2xl uppercase tracking-tighter">Sobre este Look</h3>
                  <p className="text-brand-pink font-bold text-[10px] uppercase tracking-[0.2em] opacity-60">Atacado Express Boutique</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-8">
                {currentProduct.description || "Este item premium faz parte da nossa nova coleção boutique. Peça versátil e com acabamento de alta qualidade."}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/50">
                  <span className="text-gray-400 text-[8px] font-black uppercase tracking-widest block mb-1">Categoria</span>
                  <span className="text-gray-900 font-bold text-sm tracking-tight">{currentProduct.category}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/50">
                  <span className="text-gray-400 text-[8px] font-black uppercase tracking-widest block mb-1">Estoque</span>
                  <span className="text-gray-900 font-bold text-sm tracking-tight">
                    {currentProduct.stockType === "pronta_entrega" ? "Disponível" : "Pré-venda"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons - Sticky at Bottom */}
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
            <button 
              onClick={() => handleSwipeAt('left', currentProduct)}
              className="w-16 h-16 flex items-center justify-center bg-white shadow-2xl rounded-full text-gray-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-all border border-gray-100"
            >
              <X size={28} weight="bold" />
            </button>
            <button 
              onClick={() => handleSwipeAt('right', currentProduct)}
              className="w-16 h-16 flex items-center justify-center bg-brand-pink text-white shadow-[0_10px_30px_rgba(247,37,133,0.3)] rounded-full hover:scale-110 active:scale-95 transition-all"
            >
              <ShoppingBagOpen size={28} weight="fill" />
            </button>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-gray-200 mx-4"
        >
          <div className="p-6 bg-white shadow-xl rounded-3xl mb-6">
            <ShoppingCart size={48} weight="duotone" className="text-brand-pink" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">Você viu tudo!</h2>
          <p className="text-gray-400 font-medium mb-8">
            Já mostramos todas as novidades disponíveis por aqui. Que tal dar uma olhada no seu carrinho?
          </p>
          <Link to="/cart" className="btn-action-premium w-full !rounded-2xl">
            Ver Meu Carrinho
          </Link>
          <Link to="/" className="mt-4 text-gray-400 font-bold text-sm uppercase tracking-widest hover:text-gray-600 transition-colors">
            Voltar ao Catálogo
          </Link>
        </motion.div>
      )}
    </div>
  );
}
