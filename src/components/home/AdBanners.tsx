import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function AdBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners = [
    {
      id: 1,
      img: "/assets/bannes/fixos/softLuxury.svg"
    },
    {
      id: 2,
      img: "/assets/bannes/fixos/revenda.svg"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      <section className="relative overflow-hidden w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={banners[currentIndex].id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full"
          >
            <img 
              src={banners[currentIndex].img} 
              alt="Banner Promocional" 
              className="w-full h-auto object-contain"
            />
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Navigation Dots - Outside and below */}
      <div className="flex justify-center gap-2 mt-1">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              index === currentIndex ? "w-8 bg-brand-pink" : "w-2 bg-gray-200 hover:bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

