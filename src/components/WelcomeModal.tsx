import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    confetti: any;
  }
}

export default function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Carrega o script de confetes via CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
      script.async = true;
      script.onload = () => {
        const colors = ['#D6009A', '#9750dd', '#FFCBA4', '#ffffff'];
        
        // Disparar confetes de trás do banner (centro)
        const end = Date.now() + 3 * 1000;

        (function frame() {
          window.confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors,
            zIndex: 10005 // Na frente do backdrop (10000) e atrás do banner (10010)
          });
          window.confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors,
            zIndex: 10005
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <style>{`
            @property --angle {
              syntax: '<angle>';
              initial-value: 0deg;
              inherits: true;
            }

            @keyframes rotate {
              to {
                --angle: 360deg;
              }
            }

            .shiny-border-container {
              position: relative;
              padding: 4px; 
              background: transparent;
              border-radius: 1.5rem;
              animation: rotate 3s linear infinite;
              display: block; /* Mudar para block para respeitar a largura */
              width: 800px; /* Forçar largura no computador */
              max-width: 100%;
            }

            @media (max-width: 800px) {
              .shiny-border-container {
                width: 98vw; /* Forçar largura no celular */
              }
            }

            .shiny-border-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 0;
              border-radius: inherit;
              background: conic-gradient(
                from calc(-1 * var(--angle)) at 50% 50%,
                transparent 0%,
                rgba(255, 203, 164, 1) 15%, 
                transparent 30%
              );
            }

            .shiny-border-container::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: -1;
              border-radius: inherit;
              background: conic-gradient(
                from calc(-1 * var(--angle)) at 50% 50%,
                transparent 0%,
                rgba(255, 203, 164, 0.8) 15%,
                transparent 40%
              );
              filter: blur(35px); 
            }
            
            .inner-banner-content {
              display: block;
              position: relative;
              z-index: 1;
              background-color: hsla(0,0%,0%,1);
              background-image:
                radial-gradient(at 52% 20%, hsla(9,32%,73%,0.5) 0px, transparent 50%),
                radial-gradient(at 90% 9%, hsla(20,34%,70%,.9) 0px, transparent 50%),
                radial-gradient(at 0% 50%, hsla(14,2%,63%,.9) 0px, transparent 50%),
                radial-gradient(at 61% 55%, hsla(338,0%,62%,.45) 0px, transparent 50%),
                radial-gradient(at 0% 100%, hsla(22,0%,44%,.9) 0px, transparent 50%),
                radial-gradient(at 80% 100%, hsla(240,0%,21%,.65) 0px, transparent 50%),
                radial-gradient(at 2% 3%, hsla(19,43%,77%,.9) 0px, transparent 50%);
              border-radius: calc(1.5rem - 4px);
              border-color: hsla(338,0%,62%,.005);
              border-top-style: groove;
              border-right-style: groove;
              transition: color 0.9s, background-color 0.9s;
              isolation: isolate;
              overflow: hidden;
            }

            .inner-banner-content img {
               width: 100%;
               max-width: 800px;
               height: auto;
               display: block;
            }

            .inner-banner-content::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: conic-gradient(
                from calc(1 * var(--angle)) at 0% 110%,
                transparent 25%,
                rgba(128, 115, 110, .45) 45%,
                transparent 90%
              );
              mix-blend-mode: color-dodge;
            }
          `}</style>

          {/* Backdrop with Blur and Darkening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md z-[10000]"
          />

          {/* Banner Content with New Shiny Border */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            className="relative z-[10010]"
          >
            <div className="shiny-border-container shadow-2xl">
              <div className="inner-banner-content">
                <img 
                  src="/assets/bannes/fixos/bannerBemVinda.svg" 
                  alt="Bem-vinda" 
                  className="w-full h-auto block relative z-[1]"
                />
              </div>

              {/* Invisible Close Button overlaying the 'X' at top-right */}
              <button
                onClick={onClose}
                className="absolute top-0 right-0 w-[60px] h-[60px] bg-transparent cursor-pointer z-[20]"
                title="Fechar"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
