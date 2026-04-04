import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Package, Plus, Minus, ShoppingCart as ShoppingCartLucide, ShoppingBag, ShieldCheck } from 'lucide-react';
import { ArrowLeft, Cube, Plus as PlusIcon, Minus as MinusIcon, ShoppingBagOpen, Bag, SealCheck } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  // Check how many of this product are already in the cart
  const inCartItem = items.find(i => i.productId === id);
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'products', id), (docObj) => {
      if (docObj.exists()) {
        setProduct({ id: docObj.id, ...docObj.data() } as Product);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `products/${id}`);
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <Cube className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="light" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Produto não encontrado</h2>
        <p className="text-gray-500 mb-6">Este produto pode ter sido removido ou não está mais disponível.</p>
        <button onClick={() => navigate('/')} className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
          Voltar ao Catálogo
        </button>
      </div>
    );
  }

  const outOfStock = product.stockType === 'pronta_entrega' && product.availableQuantity <= 0;
  
  // Disable adding if hitting stock limits
  const maxCanAdd = product.stockType === 'pronta_entrega' 
    ? product.availableQuantity - inCartQty 
    : 999;
  
  const canIncrease = quantity < maxCanAdd;

  const handleAddToCart = () => {
    if (!product || outOfStock || quantity > maxCanAdd) return;
    
    addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.unitPrice,
      imageUrl: product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl,
      stockType: product.stockType,
    });
    
    // Optional: visual feedback
    setQuantity(1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-4xl mx-auto space-y-6 pb-24"
    >
      <button 
        onClick={() => navigate(-1)} 
        className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-900 border border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" weight="bold" />
      </button>

      <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Images */}
          <div className="flex flex-col gap-4 p-4 md:p-6 bg-gray-50/50">
            <div className="relative aspect-square w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {product.imageUrls?.length || product.imageUrl ? (
                <img 
                  src={product.imageUrls?.length ? product.imageUrls[selectedImage] : product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <Cube className="w-20 h-20" weight="light" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold uppercase shadow-sm",
                  product.stockType === 'pronta_entrega' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                )}>
                  {product.stockType === 'pronta_entrega' ? 'Pronta Entrega' : 'Previsão Meta'}
                </span>
              </div>
              {outOfStock && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-red-500 text-white font-bold px-6 py-2 rounded-full transform -rotate-12 shadow-lg">
                    ESGOTADO
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.imageUrls && product.imageUrls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                {product.imageUrls.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all shadow-sm",
                      selectedImage === idx ? "border-brand-pink opacity-100 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-8 md:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <p className="text-brand-pink font-bold text-sm tracking-wider uppercase mb-1">{product.category}</p>
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-4xl font-bold text-gray-900 mt-4">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
                </p>
              </div>

              <div className="prose prose-sm text-gray-500">
                <p className="whitespace-pre-line leading-relaxed">{product.description || 'Nenhuma descrição fornecida.'}</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-brand-blue">
                    {product.stockType === 'pronta_entrega' ? <Bag className="w-5 h-5" weight="light" /> : <SealCheck className="w-5 h-5" weight="light" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {product.stockType === 'pronta_entrega' ? 'Estoque Físico' : 'Sistema de Cotas/Meta'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {product.stockType === 'pronta_entrega' 
                        ? `Apenas ${product.availableQuantity} unidades disponíveis.`
                        : `Meta: ${product.currentGoalProgress || 0} de ${product.requiredGoal} unidades alcançadas. Chegada: ${product.estimatedArrivalDate || 'Em breve'}`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 space-y-6">
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">Quantidade</span>
                <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <button 
                    disabled={quantity <= 1 || outOfStock}
                    onClick={() => setQuantity(q => q - 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <MinusIcon className="w-4 h-4" weight="bold" />
                  </button>
                  <span className="w-6 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    disabled={!canIncrease || outOfStock}
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-10 h-10 rounded-xl bg-brand-pink text-white flex items-center justify-center hover:bg-pink-600 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all"
                  >
                    <PlusIcon className="w-4 h-4" weight="bold" />
                  </button>
                </div>
              </div>

              {inCartQty > 0 && (
                <p className="text-xs font-bold text-blue-600">
                  Você já tem {inCartQty} un no carrinho.
                </p>
              )}

              <button
                disabled={outOfStock || quantity > maxCanAdd}
                onClick={handleAddToCart}
                className="w-full py-5 rounded-xl font-bold text-white transition-all shadow-xl shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-3"
                style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)' }}
              >
                {outOfStock ? 'ESGOTADO' : <><ShoppingBagOpen className="w-5 h-5" weight="bold" /> ADICIONAR AO CARRINHO</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
