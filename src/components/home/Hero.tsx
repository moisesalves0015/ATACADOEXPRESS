import { motion } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';

export default function Hero() {
  return (
    <section className="relative h-[280px] md:h-[380px] w-full overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-gray-900 group">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop" 
          alt="Fashion Hero" 
          className="w-full h-full object-cover opacity-50 transition-transform duration-10000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center sm:justify-end p-5 s:p-8 sm:p-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <h1 className="text-2xl s:text-3xl sm:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight tracking-tight">
            Estilo que <span className="text-brand-pink">Inspira</span>, <br className="hidden sm:block" /> Qualidade que se Sente.
          </h1>
          <p className="text-gray-300 text-xs sm:text-base mb-6 sm:mb-8 max-w-md leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
            Descubra as últimas tendências do atacado boutique com preços exclusivos.
          </p>
          
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button className="btn-action-premium !px-5 !sm:px-6 !py-2.5 !sm:py-3 !text-xs !sm:text-sm group/btn">
              Explorar Catálogo
              <ArrowRight weight="bold" className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <button className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-white text-xs sm:text-sm transition-all bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20">
              Ver Ofertas
            </button>
          </div>
        </motion.div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-brand-pink/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-10 w-48 h-48 bg-brand-blue/5 rounded-full blur-3xl animate-pulse delay-700" />
    </section>
  );
}
