import React from 'react';
import { 
  ShieldAlert, 
  ArrowLeftRight, 
  CheckCircle, 
  Clock, 
  HelpCircle,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export default function ReturnPolicy() {
  return (
    <div className="bg-gray-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-pink-100 text-brand-pink rounded-full mb-2">
            <ArrowLeftRight className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight sm:text-5xl uppercase">
            Política de Trocas e Devoluções
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium">
            Entenda nossas regras de trocas exclusivas para o comércio atacadista (B2B).
          </p>
        </div>

        {/* B2B Disclaimer Notice */}
        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100/70 flex gap-4 items-start shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider mb-1">Aviso Importante: Canal de Atacado</h3>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Por se tratar de negociação comercial de atacado direcionada à revenda e lojistas, as trocas e devoluções são reguladas estritamente por regras de defeito de fabricação. Não realizamos trocas por insatisfação de modelos, cores, tamanhos ou peças que não foram vendidas em seu comércio.
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-50 text-brand-pink rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Defeitos de Fabricação</h3>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed font-medium">
              Garantimos a troca de peças que apresentem vícios ou defeitos ocultos de fabricação (como costuras abertas, tecidos danificados ou zíperes quebrados antes do uso). Todas as peças passam por triagem antes da liberação.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Prazo de Notificação</h3>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed font-medium">
              O comprador deve revisar minuciosamente as mercadorias recebidas e notificar qualquer defeito em até <strong>7 (sete) dias corridos</strong> a contar da data de entrega ou retirada do pacote no Brás.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Condições das Peças</h3>
            </div>
            <ul className="text-gray-500 text-xs leading-relaxed font-medium space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                As peças devem conter as etiquetas originais afixadas.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                Não devem conter indícios de lavagem, uso ou modificação.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                Devem acompanhar a embalagem original protetora.
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Procedimento de Envio</h3>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed font-medium">
              Para iniciar o processo, envie fotos ou vídeos nítidos evidenciando o defeito para a administradora do grupo no WhatsApp. A equipe emitirá as instruções para devolução do produto e crédito correspondente.
            </p>
          </div>

        </div>

        {/* Call to Action Support Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Ficou com alguma dúvida sobre trocas?</h3>
          <p className="text-xs text-gray-400 font-medium max-w-md mx-auto">
            Nossa equipe de suporte está pronta para auxiliar você em dias úteis no horário comercial das 08:00 às 18:00.
          </p>
          <div>
            <a 
              href="https://wa.me/5521980214244"
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-md shadow-emerald-50 hover:scale-105"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
