import React from 'react';
import { 
  ShoppingBag, 
  Tag, 
  Users, 
  CreditCard, 
  PackageCheck, 
  Coins, 
  CalendarDays, 
  Truck, 
  Sparkles, 
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Postagem dos Modelos",
      description: "Todos os dias são postados no grupo os modelos disponíveis enviados pelos fornecedores. Cada postagem informa a foto do produto, valor, grade disponível e a quantidade mínima exigida pelo fornecedor.",
      icon: Sparkles,
      color: "from-pink-500 to-rose-500",
      bgLight: "bg-pink-50"
    },
    {
      number: "2",
      title: "Reserva das Peças",
      description: "Se você tiver interesse em algum modelo, basta informar no grupo a quantidade desejada e tamanho/cores (quando disponível). A administradora organizará a lista de pedidos.",
      icon: ShoppingBag,
      color: "from-blue-500 to-indigo-500",
      bgLight: "bg-blue-50"
    },
    {
      number: "3",
      title: "Fechamento do Lote",
      description: "Cada fornecedor exige uma quantidade mínima (geralmente 50 peças por modelo) para liberar a produção ou venda. Quando o lote atingir a quantidade mínima, o pagamento será solicitado aos participantes da lista.",
      icon: Users,
      color: "from-purple-500 to-indigo-500",
      bgLight: "bg-purple-50"
    },
    {
      number: "4",
      title: "Pagamento Imediato",
      description: "O pagamento deve ser realizado no mesmo dia da solicitação. Após a confirmação, o valor é repassado ao fornecedor e o pedido é liberado para separação.",
      icon: CreditCard,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50"
    },
    {
      number: "5",
      title: "Separação das Mercadorias",
      description: "O fornecedor entrega os produtos em uma assessoria parceira no Brás. Essa assessoria recebe os lotes, faz a separação individual e organiza as mercadorias conforme a lista do grupo.",
      icon: PackageCheck,
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50"
    },
    {
      number: "6",
      title: "Taxa de Separação",
      description: "Cobramos R$ 15,00 por modelo/lista para o serviço de separação e organização. Se você entrou em 1 lista a taxa é R$ 15,00, se entrou em 3 listas é R$ 45,00 (independente da quantidade de peças).",
      icon: Coins,
      color: "from-cyan-500 to-blue-500",
      bgLight: "bg-cyan-50"
    },
    {
      number: "7",
      title: "Prazo de Separação",
      description: "O prazo médio de separação é de 1 a 4 dias úteis após o pagamento. Podem ocorrer pequenos atrasos devido à alta demanda, atrasos do próprio fornecedor ou volume de pedidos.",
      icon: CalendarDays,
      color: "from-rose-500 to-red-500",
      bgLight: "bg-rose-50"
    },
    {
      number: "8",
      title: "Retirada ou Envio",
      description: "Quando a separação for concluída, um código será enviado no grupo. Com ele, você poderá retirar pessoalmente ou solicitar o envio por transportadora, correios ou excursão (frete pago separadamente).",
      icon: Truck,
      color: "from-violet-500 to-purple-500",
      bgLight: "bg-violet-50"
    }
  ];

  return (
    <div className="bg-gray-50/50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Page Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-pink-100 text-brand-pink rounded-full mb-2">
            <HelpCircle className="w-8 h-8 animate-bounce" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight sm:text-5xl uppercase">
            Como Funciona o Nosso Sistema
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
            Entenda como funciona a nossa assessoria de compras e divisão de lotes no atacado direto dos fornecedores do Brás (SP).
          </p>
        </div>

        {/* Division of Batches Section */}
        <div className="space-y-8">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
              <span className="bg-pink-500 text-white w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md">1</span>
              Divisão de Lotes
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-semibold uppercase tracking-wider">
              Facilitamos o acesso de lojistas a mercadorias direto do fabricante
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div 
                  key={idx} 
                  className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`p-3 rounded-2xl ${step.bgLight} text-gray-900`}>
                        <Icon className="w-6 h-6 text-gray-800" />
                      </div>
                      <span className="text-3xl font-black text-gray-100 group-hover:text-gray-200 transition-colors">
                        {step.number}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-gray-500 text-xs leading-relaxed font-medium">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ready Stock Section */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                Compra Imediata
              </span>
              <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
                Pronta Entrega
              </h2>
              <p className="text-white/80 text-sm leading-relaxed max-w-2xl font-medium">
                Também postamos diariamente peças disponíveis para envio ou retirada imediata. Essas mercadorias são compostas por saldos excedentes, sobras de lotes fechados e estoques remanescentes de alta rotatividade.
              </p>
            </div>
            <div className="flex justify-start lg:justify-end">
              <Link 
                to="/" 
                className="bg-white text-pink-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-xl hover:scale-105 inline-flex items-center gap-2"
              >
                Ver Catálogo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Important Info Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
            <AlertCircle className="w-7 h-7 text-amber-500 shrink-0" />
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Informações Importantes</h2>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Fique atento às nossas regras comerciais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Atacado Exclusivo</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">Trabalhamos exclusivamente com o modelo de venda no atacado para lojistas e revendedores.</p>
              </div>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Mínimos Exigidos</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">A liberação da mercadoria depende da quantidade mínima estipulada pelo fabricante parceiro.</p>
              </div>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Garantia na Lista</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">O seu pagamento efetuado no prazo garante de forma definitiva sua inclusão e reserva na lista do modelo.</p>
              </div>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Taxa de Separação</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">A taxa de assessoria e separação de R$ 15,00 é cobrada por modelo/lista, indiferente das quantidades.</p>
              </div>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Prazo de Envio</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">A assessoria efetua a separação e liberação em até 4 dias úteis após a compensação dos pagamentos.</p>
              </div>
            </div>
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-pink-500 mt-2 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-gray-900 text-sm uppercase">Frete e Carreto</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">O valor correspondente ao transporte contratado (transportadoras, correios) é por conta do comprador.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
