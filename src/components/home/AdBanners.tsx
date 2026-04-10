import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function AdBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners = [
    {
      id: 1,
      title: "Ofertas da Semana",
      subtitle: "Até 40% OFF",
      img: "https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=2071&auto=format&fit=crop",
      color: "bg-brand-blue/20"
    },
    {
      id: 2,
      title: "Pronta Entrega",
      subtitle: "Envio Imediato",
      img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
      color: "bg-brand-pink/20"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative h-32 sm:h-56 w-full overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] group cursor-pointer bg-gray-100">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <img 
            src={banners[currentIndex].img} 
            alt={banners[currentIndex].title} 
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-center px-8 sm:px-16">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-fashion text-[8px] sm:text-xs text-brand-pink mb-1 sm:mb-2"
            >
              {banners[currentIndex].subtitle}
            </motion.span>
            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white text-xl sm:text-4xl font-black tracking-tight"
            >
              {banners[currentIndex].title}
            </motion.h3>
            
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-3 sm:mt-6 w-12 sm:w-20 h-1 bg-brand-pink rounded-full origin-left" 
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              index === currentIndex ? "w-8 bg-brand-pink" : "w-1.5 bg-white/50 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
