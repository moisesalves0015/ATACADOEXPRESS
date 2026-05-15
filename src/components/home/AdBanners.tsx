import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function AdBanners() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const banners = [
    { id: 1, img: "/assets/bannes/fixos/softLuxury.svg" },
    { id: 2, img: "/assets/bannes/fixos/revenda.svg" },
  ];

  // Duplicate for seamless loop if needed, but for 2 banners 
  // we'll just use a smooth slide back and forth or a continuous loop.
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      <section className="relative overflow-hidden w-full rounded-md shadow-sm">
        <motion.div
          animate={{ x: `-${currentIndex * 100}%` }}
          transition={{ 
            duration: 1.2, 
            ease: [0.4, 0, 0.2, 1] 
          }}
          className="flex"
        >
          {banners.map((banner, index) => (
            <div key={`${banner.id}-${index}`} className="w-full flex-shrink-0">
              <img 
                src={banner.img} 
                alt="Banner" 
                className="w-full h-auto block"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </motion.div>
      </section>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              index === currentIndex ? "w-8 bg-brand-pink" : "w-2 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

