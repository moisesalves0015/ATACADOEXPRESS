import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Package } from 'lucide-react';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalValue, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
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
          <div key={item.productId} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
              <Package className="w-8 h-8" />
            </div>
            
            <div className="flex-grow">
              <h3 className="font-bold text-gray-900">{item.productName}</h3>
              <p className="text-blue-600 font-bold text-sm">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="p-1 hover:bg-white rounded-md transition-colors text-gray-500"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-gray-700">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="p-1 hover:bg-white rounded-md transition-colors text-gray-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="text-right min-w-[100px]">
              <p className="font-black text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)}
              </p>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="text-red-400 hover:text-red-600 p-1 transition-colors mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100 sticky top-24">
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
              <span>Frete</span>
              <span className="text-green-600 font-bold">Grátis</span>
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-black text-blue-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
              </span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
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
