import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Package } from 'lucide-react';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalValue, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Parece que você ainda não adicionou nenhum produto. Explore nosso catálogo e encontre as melhores ofertas!
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          Explorar Catálogo <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-blue-600" /> Seu Carrinho
        </h1>
        
        {items.map((item) => (
          <div key={item.productId} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 flex-shrink-0 border border-gray-100 overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8" />
              )}
            </div>
            
            <div className="flex flex-col justify-between flex-grow min-w-0">
              {/* Header: Title + Delete Button */}
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate pr-2">{item.productName}</h3>
                  <p className="text-pink-600 font-semibold text-xs mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-gray-300 hover:text-red-500 p-2 -mr-2 -mt-2 transition-colors flex-shrink-0"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Footer: Controls + Total */}
              <div className="flex justify-between items-end mt-2">
                <div className="flex items-center bg-gray-50/80 border border-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-500"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <p className="font-bold text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xl shadow-gray-100 sticky top-24">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h2>
          
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-gray-500">
              <span>Total de itens</span>
              <span className="font-medium text-gray-900">{totalItems}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Separação</span>
              <span className="font-bold text-gray-900">R$ 15,00</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue + 15)}
              </span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            Finalizar Compra <ArrowRight className="w-5 h-5" />
          </Link>
          
          <p className="mt-4 text-center text-xs text-gray-400">
            Ao finalizar, você concorda com nossos termos de venda e políticas de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
