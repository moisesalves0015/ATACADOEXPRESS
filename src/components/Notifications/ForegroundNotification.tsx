import React, { useEffect } from 'react';
import { ShoppingBag, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ForegroundNotificationProps {
  payload: any;
  onClose: () => void;
}

export const ForegroundNotification: React.FC<ForegroundNotificationProps> = ({ payload, onClose }) => {
  useEffect(() => {
    if (!payload) return;
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [payload, onClose]);

  if (!payload || !payload.notification) return null;
  const { notification, data } = payload;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, x: '-50%' }}
        animate={{ opacity: 1, y: 20, x: '-50%' }}
        exit={{ opacity: 0, y: -100, x: '-50%' }}
        className="fixed top-0 left-1/2 z-[10000] w-[90%] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
            {notification.image || data?.image ? (
              <img 
                src={notification.image || data?.image} 
                alt="Product" 
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <ShoppingBag size={24} weight="fill" className="text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {notification.title || "🛍️ Novo Produto!"}
            </p>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
              {notification.body || "Confira as novidades que acabaram de chegar na loja."}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {data?.url && (
          <a 
            href={data.url}
            onClick={onClose}
            className="block py-2 text-center bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors border-t border-gray-100"
          >
            Ver Produto agora
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
