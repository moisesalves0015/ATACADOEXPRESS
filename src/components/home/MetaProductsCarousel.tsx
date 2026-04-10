import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../types';
import ProductCard from '../ProductCard';
import { Sparkle, Info } from '@phosphor-icons/react';

interface MetaProductsCarouselProps {
  products: Product[];
  loading: boolean;
}

export default function MetaProductsCarousel({ products, loading }: MetaProductsCarouselProps) {
  const metaProducts = products.filter(p => {
    const type = p.stockType?.toLowerCase().replace(/[\s_-]/g, '') || '';
    return type === 'previsometa' || type === 'previsaometa';
  });

  if (loading) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="p-2 sm:p-3 bg-brand-pink/10 rounded-xl sm:rounded-2xl text-brand-pink">
          <Sparkle size={20} weight="fill" className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-none truncate">Produtos em Meta</h2>
          <p className="text-gray-400 text-[9px] sm:text-sm font-bold mt-1 uppercase tracking-widest truncate">Incentive a bater a meta e garanta o seu!</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {metaProducts.length > 0 ? (
          <div className="flex items-stretch gap-6 overflow-x-auto no-scrollbar pb-8 px-4 -mx-4">
            {metaProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                className="w-[280px] flex-shrink-0"
              />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/50 rounded-[2rem] p-8 sm:p-12 text-center border-2 border-dashed border-gray-100"
          >
            <div className="inline-flex p-3 bg-white rounded-full text-gray-300 mb-4 shadow-sm border border-gray-50">
              <Info size={24} color="#F72585" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Sem metas ativas no momento</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xs mx-auto font-medium">
              Fique de olho! Novas metas de produção são abertas periodicamente.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
