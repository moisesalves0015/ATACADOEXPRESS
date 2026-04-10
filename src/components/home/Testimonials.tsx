import { motion } from 'framer-motion';
import { Quotes, Star } from '@phosphor-icons/react';

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: "Maria Silva",
      role: "Revendedora em SP",
      text: "As peças são de uma qualidade surreal. Minhas clientes amam e as metas de produção são ótimas para garantir exclusividade.",
      rating: 5
    },
    {
      id: 2,
      name: "Ana Costa",
      role: "Lojista em BH",
      text: "O atendimento via WhatsApp é muito rápido. Faço meus pedidos pelo catálogo e chega tudo certinho no prazo.",
      rating: 5
    },
    {
      id: 3,
      name: "Juliana Santos",
      role: "Microempreendedora",
      text: "Melhor preço de atacado que encontrei. O sistema de metas é inovador e ajuda muito no planejamento do estoque.",
      rating: 5
    }
  ];

  return (
    <section>
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">O que dizem nossas parceiras</h2>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] sm:text-xs px-4">Unindo qualidade e confiança em todo o Brasil</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {testimonials.map((t) => (
          <motion.div
            key={t.id}
            whileHover={{ y: -8 }}
            className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between"
          >
            <div>
              <div className="flex gap-1 mb-4 sm:mb-6 text-brand-yellow">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} weight="fill" size={14} className="sm:w-4 sm:h-4" />
                ))}
              </div>
              <p className="text-gray-600 text-sm sm:text-base font-medium leading-relaxed italic mb-6 sm:mb-8 line-clamp-3 sm:line-clamp-none">
                "{t.text}"
              </p>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                <Quotes size={20} weight="fill" className="sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-gray-900 leading-none mb-1 truncate">{t.name}</h4>
                <span className="text-[9px] sm:text-xs text-brand-pink font-bold uppercase tracking-widest truncate block">{t.role}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
