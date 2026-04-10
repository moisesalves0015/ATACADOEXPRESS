import { motion } from 'framer-motion';
import { WhatsappLogo, ArrowRight } from '@phosphor-icons/react';

export default function WhatsAppInvite() {
  return (
    <section>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-[2rem] sm:rounded-[3rem] p-6 s:p-8 sm:p-12 text-white group">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl sm:blur-3xl group-hover:bg-white/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl sm:blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 text-center lg:text-left">
          <div className="flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 rounded-full bg-white/20 backdrop-blur-md font-fashion text-[8px] sm:text-[9px] mb-4 sm:mb-6 border border-white/20">
              Comunidade Exclusiva
            </div>
            <h2 className="text-xl s:text-2xl sm:text-4xl font-black mb-3 sm:mb-4 leading-tight tracking-tight">
              Entre para o nosso <br className="hidden sm:block" /> Grupo VIP no WhatsApp
            </h2>
            <p className="text-white/80 text-xs sm:text-base font-medium max-w-sm sm:max-w-md line-clamp-2 sm:line-clamp-none">
              Receba novidades em primeira mão e promoções relâmpago exclusivas.
            </p>
          </div>

          <motion.a
            href="https://wa.me/your-number"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 sm:gap-4 px-6 sm:px-10 py-3.5 sm:py-5 bg-white text-[#128C7E] rounded-xl sm:rounded-[2rem] font-black text-sm sm:text-lg shadow-xl hover:shadow-2xl transition-all"
          >
            <WhatsappLogo size={24} weight="fill" className="sm:w-8 sm:h-8" />
            <span>Quero Entrar No Grupo</span>
            <ArrowRight size={18} weight="bold" className="sm:w-6 sm:h-6" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}
