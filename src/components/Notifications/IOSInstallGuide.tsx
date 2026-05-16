import React from 'react';
import { Export, PlusSquare, X, Monitor } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ isOpen, onClose }) => {
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
            <div className="relative p-8">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} weight="bold" />
              </button>

              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <Monitor size={32} className="text-blue-500" weight="duotone" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Instale no seu iPhone</h2>
                <p className="text-gray-500 text-sm">
                  Para ativar as notificações no iOS, adicione o app à sua tela de início.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-gray-900 shrink-0">1</div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      Toque no ícone Compartilhar <Export size={18} className="text-blue-500" />
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Localizado na barra inferior do Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-gray-900 shrink-0">2</div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      Role e toque em "Adicionar à Tela de Início" <PlusSquare size={18} className="text-blue-500" />
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Isso criará um atalho premium na sua home.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center font-bold text-gray-900 shrink-0">3</div>
                  <div className="text-sm">
                    <p className="font-bold text-gray-800">Abra o app pela Home</p>
                    <p className="text-gray-500 text-xs mt-1">Após abrir pela home, você poderá ativar as notificações.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg"
              >
                Entendi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
