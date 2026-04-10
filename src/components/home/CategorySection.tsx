import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useRef } from 'react';

interface CategorySectionProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategorySection({ categories, activeCategory, onCategoryChange }: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCategoryConfig = (categoryName: string) => {
    const assetsPath = '/assets/categories/';
    switch (categoryName.toLowerCase()) {
      case 'all': return { label: 'Tudo', img: `${assetsPath}all.png` };
      case 'vestidos': return { label: 'Vestidos', img: `${assetsPath}vestidos.png` };
      case 'blusas': return { label: 'Blusas', img: `${assetsPath}blusas.png` };
      case 'conjuntos': return { label: 'Conjuntos', img: `${assetsPath}conjuntos.png` };
      case 'acessórios': return { label: 'Acessórios', img: `${assetsPath}acessorios.png` };
      case 'bolsas': return { label: 'Bolsas', img: `${assetsPath}bolsas.png` };
      case 'calças': return { label: 'Calças', img: `${assetsPath}calcas.png` };
      case 'saias': return { label: 'Saias', img: `${assetsPath}saias.png` };
      case 'casacos': return { label: 'Casacos', img: `${assetsPath}casacos.png` };
      case 'sapatos': return { label: 'Sapatos', img: `${assetsPath}sapatos.png` };
      case 'shorts': return { label: 'Shorts', img: `${assetsPath}shorts.png` };
      default: return { label: categoryName, img: `${assetsPath}all.png` };
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const scrollTo = direction === 'left' 
        ? scrollRef.current.scrollLeft - scrollAmount 
        : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/section w-full max-w-full">
      {/* Lateral Scroll Buttons - More compact and closer */}
      <button 
        onClick={() => scroll('left')}
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 rounded-full text-gray-400 hover:text-brand-pink transition-all opacity-0 group-hover/section:opacity-100 hover:scale-110 active:scale-95"
        aria-label="Scroll left"
      >
        <CaretLeft size={16} weight="bold" />
      </button>
      
      <button 
        onClick={() => scroll('right')}
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 rounded-full text-gray-400 hover:text-brand-pink transition-all opacity-0 group-hover/section:opacity-100 hover:scale-110 active:scale-95"
        aria-label="Scroll right"
      >
        <CaretRight size={16} weight="bold" />
      </button>

      {/* Scrollable Container - Full bleed on mobile, contained on desktop */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar scroll-smooth -mx-6 md:mx-0"
      >
        <div className="grid grid-rows-2 grid-flow-col auto-cols-max md:flex md:items-center gap-x-2 sm:gap-x-4 gap-y-2 sm:gap-y-4 py-2 px-6 md:px-1">
          {categories.map((category) => {
            const { label, img } = getCategoryConfig(category);
            const isActive = activeCategory === category;
            
            return (
              <motion.button
                key={category}
                onClick={() => onCategoryChange(category)}
                className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer transition-all min-w-[70px] sm:min-w-[80px]"
                whileTap={{ scale: 0.95 }}
              >
                {/* Floating Icon without background */}
                <motion.div 
                  animate={isActive ? { y: -4, rotate: 5, scale: 1.1 } : { y: 0, rotate: 0, scale: 1 }}
                  whileHover={{ y: -6, rotate: -3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center relative drop-shadow-md group-hover:drop-shadow-xl transition-all duration-300"
                >
                  <img 
                    src={img} 
                    alt={label} 
                    className="w-full h-full object-contain" 
                  />
                </motion.div>

                {/* Title with color transition */}
                <span 
                  className={cn(
                    "text-[8px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 w-full truncate text-center px-1",
                    isActive ? "text-brand-pink" : "text-gray-400 group-hover:text-gray-600"
                  )}
                >
                  {label}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="activeCategoryIndicator"
                    className="w-4 sm:w-10 h-0.5 sm:h-1 bg-brand-pink rounded-full -mt-0.5"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
