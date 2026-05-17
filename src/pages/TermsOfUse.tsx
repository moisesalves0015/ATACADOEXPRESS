import React from 'react';
import { 
  FileText, 
  UserCheck, 
  CreditCard, 
  Truck, 
  Scale, 
  ShieldCheck 
} from 'lucide-react';

export default function TermsOfUse() {
  const terms = [
    {
      title: "1. Elegibilidade e Cadastro",
      description: "Nossos serviços destinam-se exclusivamente a pessoas físicas ou jurídicas que adquiram mercadorias com finalidade de revenda comercial (B2B). Reservamo-nos o direito de suspender cadastros com dados inconsistentes ou fraudulentos.",
      icon: UserCheck,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "2. Formação de Lotes e Reserva",
      description: "A inclusão do cliente em listas de lotes no grupo representa intenção de compra. O fechamento e faturamento do lote ocorrem somente ao atingir o mínimo estipulado pelo fabricante (normalmente 50 peças).",
      icon: Scale,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "3. Pagamentos e Cancelamentos",
      description: "Os pagamentos devem ser efetuados via PIX ou meios autorizados nas primeiras 5 horas úteis após a chamada no grupo. A inadimplência injustificada acarretará exclusão da lista e restrição em lotes futuros.",
      icon: CreditCard,
      color: "text-amber-600",
      bg: "bg-amber-50"
    },
    {
      title: "4. Taxa de Assessoria e Triagem",
      description: "Será acrescida a taxa de separação de R$ 15,00 por lote/modelo faturado. Essa taxa remunera os serviços de logística interna, recepção no Brás, verificação de qualidade física e embalagem protetora individual.",
      icon: ShieldCheck,
      color: "text-pink-600",
      bg: "bg-pink-50"
    },
    {
      title: "5. Logística e Transporte",
      description: "O frete/carreto e a contratação do serviço de transporte (correios, excursão ou transportadoras parceiras) são de inteira responsabilidade e custeados separadamente pelo comprador. Não nos responsabilizamos por extravios gerados pelas transportadoras.",
      icon: Truck,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="bg-gray-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-pink-100 text-brand-pink rounded-full mb-2">
            <FileText className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight sm:text-5xl uppercase">
            Termos de Uso comercial
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium">
            Leia atentamente as condições e termos comerciais que regem nossa parceria.
          </p>
        </div>

        {/* Content list */}
        <div className="space-y-6">
          {terms.map((term, idx) => {
            const Icon = term.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 hover:shadow-md transition-all duration-300"
              >
                <div className={`p-4 rounded-2xl ${term.bg} ${term.color} shrink-0 w-fit h-fit`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">
                    {term.title}
                  </h3>
                  <p className="text-gray-500 text-xs leading-relaxed font-medium">
                    {term.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Summary Notice */}
        <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
          Última atualização: 17 de Maio de 2026 · Saldo da Kricia Ltda.
        </div>

      </div>
    </div>
  );
}
