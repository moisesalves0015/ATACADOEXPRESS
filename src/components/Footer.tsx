import { WhatsappLogo, InstagramLogo, FacebookLogo, MapPin, Envelope, Phone } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Section */}
        <div className="space-y-6">
          <Link to="/" className="group flex flex-col transition-all">
            <div className="flex items-baseline gap-0.5">
               <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none group-hover:text-pink-500 transition-colors">Atacado</span>
               <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mb-1 animate-pulse" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] -mt-1 ml-0.5 text-brand-pink">
              Express Boutique
            </span>
          </Link>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs font-medium">
            Sua boutique de atacado com as melhores tendências e qualidade garantida para o seu negócio.
          </p>
          <div className="flex gap-4">
            <a href="#" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 transition-all">
              <InstagramLogo size={24} weight="fill" />
            </a>
            <a href="#" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 transition-all">
              <FacebookLogo size={24} weight="fill" />
            </a>
            <a href="#" className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 transition-all">
              <WhatsappLogo size={24} weight="fill" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display font-black text-gray-900 uppercase tracking-widest text-xs mb-8">Navegação</h4>
          <ul className="space-y-4">
            <li><Link to="/" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Página Inicial</Link></li>
            <li><Link to="/" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Catálogo de Produtos</Link></li>
            <li><Link to="/cart" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Meu Carrinho</Link></li>
            <li><Link to="/login" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Minha Conta</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-display font-black text-gray-900 uppercase tracking-widest text-xs mb-8">Ajuda & Suporte</h4>
          <ul className="space-y-4">
            <li><a href="#" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Política de Trocas</a></li>
            <li><a href="#" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Termos de Uso</a></li>
            <li><a href="#" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Dúvidas Frequentes</a></li>
            <li><a href="#" className="text-gray-500 hover:text-brand-pink text-sm font-bold transition-colors">Seja um Revendedor</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="font-display font-black text-gray-900 uppercase tracking-widest text-xs mb-8">Fale Conosco</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MapPin size={20} className="text-brand-pink flex-shrink-0" weight="bold" />
              <span className="text-gray-500 text-sm font-bold leading-snug">Rua da Moda, 123 - Brás, São Paulo - SP</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={20} className="text-brand-pink flex-shrink-0" weight="bold" />
              <span className="text-gray-500 text-sm font-bold leading-snug">(11) 99999-9999</span>
            </li>
            <li className="flex items-center gap-3">
              <Envelope size={20} className="text-brand-pink flex-shrink-0" weight="bold" />
              <span className="text-gray-500 text-sm font-bold leading-snug">contato@expressboutique.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
          © 2026 Atacado Express Boutique. Todos os direitos reservados.
        </p>
        
        {/* Payment Methods */}
        <div className="flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <img src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" alt="Visa" className="h-4 sm:h-5 object-contain" />
          <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo-7.png" alt="Mastercard" className="h-6 sm:h-8 object-contain" />
          <img src="https://logodownload.org/wp-content/uploads/2020/02/pix-logo-1.png" alt="Pix" className="h-5 sm:h-6 object-contain" />
        </div>
      </div>
    </footer>
  );
}
