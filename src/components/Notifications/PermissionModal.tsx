import React from 'react';
import { Bell, X, ShieldCheck, Lightning } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, onClose, onAccept }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="relative p-8 text-center">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} weight="bold" />
              </button>

              <div className="mx-auto w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mb-6">
                <Bell size={40} weight="duotone" className="text-pink-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                Fique por dentro das novidades!
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Deseja receber notificações sobre novos produtos e promoções exclusivas diretamente no seu dispositivo?
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-xl">
                  <Lightning size={24} weight="fill" className="text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Alertas Instantâneos</p>
                    <p className="text-xs text-gray-500">Seja o primeiro a ver os novos estoques.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-left p-3 bg-gray-50 rounded-xl">
                  <ShieldCheck size={24} weight="fill" className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Privacidade Garantida</p>
                    <p className="text-xs text-gray-500">Sem spam, apenas o que você realmente quer ver.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onAccept}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Ativar Notificações
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  Agora não
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
