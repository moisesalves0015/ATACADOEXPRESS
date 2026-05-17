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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'products', id), (docObj) => {
      if (docObj.exists()) {
        const prod = { id: docObj.id, ...docObj.data() } as Product;
        setProduct(prod);
        const defaultQty = prod.allowQty1 ? 1 : (prod.allowQty2 ? 2 : 3);
        setQuantity(defaultQty);
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
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
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
  
  // Check how many of this product are already in the cart
  const inCartItem = items.find(i => i.productId === id);
  const inCartQty = inCartItem ? inCartItem.quantity : 0;

  const maxCanAdd = product.stockType === 'pronta_entrega' 
    ? product.availableQuantity - inCartQty 
    : 999;
  
  const canIncrease = quantity < maxCanAdd;

  const handleAddToCart = () => {
    if (!product || outOfStock || quantity > maxCanAdd) return;

    // Validate variations if required
    if (product.hasVariations && product.variationsRequired && product.variations) {
      const missing = product.variations.filter(v => !selectedVariations[v.name]);
      if (missing.length > 0) {
        alert(`Por favor, selecione as opções: ${missing.map(m => m.name).join(', ')}`);
        return;
      }
    }
    
    addToCart({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.unitPrice,
      imageUrl: product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl,
      stockType: product.stockType,
      variations: selectedVariations,
      allowQty1: product.allowQty1,
      allowQty2: product.allowQty2
    });
    
    alert('Adicionado à sacola!');
    const defaultQty = product.allowQty1 ? 1 : (product.allowQty2 ? 2 : 3);
    setQuantity(defaultQty);
    setSelectedVariations({});
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-4xl mx-auto space-y-6 pb-24 px-4 sm:px-0"
      >
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-900 border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" weight="bold" />
        </button>

        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="flex flex-col gap-4 p-4 md:p-6 bg-gray-50/30">
              <div 
                onClick={() => setIsLightboxOpen(true)}
                className="relative aspect-square w-full bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-zoom-in group"
              >
                {product.imageUrls?.length || product.imageUrl ? (
                  <img 
                    src={product.imageUrls?.length ? product.imageUrls[selectedImage] : product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Cube className="w-20 h-20" weight="light" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm",
                    product.stockType === 'pronta_entrega' ? 'bg-emerald-500 text-white' : 'bg-brand-blue text-white'
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

            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div className="space-y-8">
                <div>
                  <p className="text-brand-pink font-black text-[10px] tracking-widest uppercase mb-2 border-b-2 border-brand-pink w-fit pb-1">{product.category}</p>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{product.name}</h1>
                  <p className="text-4xl font-black text-brand-pink mt-6 tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
                  </p>
                </div>

                <div className="prose prose-sm">
                  <p className="whitespace-pre-line leading-relaxed text-gray-600 font-medium">{product.description || 'Nenhuma descrição fornecida.'}</p>
                </div>

                {product.hasVariations && product.variations && product.variations.length > 0 && (
                  <div className="space-y-6 pt-4 border-t border-gray-100">
                    {product.variations.map((v, vIdx) => (
                      <div key={vIdx} className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                          {v.name} {product.variationsRequired && <span className="text-red-500">*</span>}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {v.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => setSelectedVariations(prev => ({ ...prev, [v.name]: opt }))}
                              className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                                selectedVariations[v.name] === opt 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-brand-blue">
                      {product.stockType === 'pronta_entrega' ? <Bag className="w-5 h-5" weight="bold" /> : <SealCheck className="w-5 h-5" weight="bold" />}
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {product.stockType === 'pronta_entrega' ? 'Estoque Ativo' : 'Sistema de Meta'}
                      </h3>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">
                        {product.stockType === 'pronta_entrega' 
                          ? `${product.availableQuantity} un disponíveis.`
                          : `${product.currentGoalProgress || 0}/${product.requiredGoal} atingido. ${product.estimatedArrivalDate || ''}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</span>
                  <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button 
                      disabled={quantity <= (product.allowQty1 ? 1 : (product.allowQty2 ? 2 : 3)) || outOfStock}
                      onClick={() => setQuantity(q => q - 1)}
                      className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-all shadow-sm"
                    >
                      <MinusIcon className="w-4 h-4" weight="bold" />
                    </button>
                    <span className="w-8 text-center font-black text-lg">{quantity}</span>
                    <button 
                      disabled={!canIncrease || outOfStock}
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 disabled:bg-gray-200 transition-all shadow-lg"
                    >
                      <PlusIcon className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                </div>

                <button
                  disabled={outOfStock || quantity > maxCanAdd}
                  onClick={handleAddToCart}
                  className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-2xl shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-3"
                  style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)' }}
                >
                  {outOfStock ? 'PRODUTO ESGOTADO' : <><Bag className="w-5 h-5" weight="bold" /> ADICIONAR À SACOLA</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all z-[2001]"
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
          >
            <PlusIcon size={24} weight="bold" className="rotate-45" />
          </button>
          
          <img 
            src={product.imageUrls?.length ? product.imageUrls[selectedImage] : product.imageUrl} 
            alt={product.name} 
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="mt-6 text-center text-white">
            <p className="font-black text-sm uppercase tracking-[0.2em]">{product.name}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
              {selectedImage + 1} de {product.imageUrls?.length || 1}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
