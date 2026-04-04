import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Package, Search, Filter, Grid, Shirt, Crown, Gem, ShoppingBag, Palette } from 'lucide-react';
import { SquaresFour, Dress, TShirt, Suitcase, Watch, Handbag, Sparkle, ShoppingBagOpen } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'products'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const dbCategories = products.map(p => p.category);
  const defaultCategories = ['all', 'Vestidos', 'Blusas', 'Conjuntos', 'Acessórios', 'Bolsas', 'Calças', 'Saias', 'Casacos', 'Sapatos', 'Shorts'];
  const categories = [...new Set([...defaultCategories, ...dbCategories])];

  const getCategoryConfig = (categoryName: string) => {
    const assetsPath = '/assets/categories/';
    switch (categoryName.toLowerCase()) {
      case 'all': return { label: 'Ver Tudo', img: `${assetsPath}all.png` };
      case 'vestidos': return { label: 'Vestidos', img: `${assetsPath}vestidos.png` };
      case 'blusas': return { label: 'Blusas', img: `${assetsPath}blusas.png` };
      case 'conjuntos': return { label: 'Conjuntos', img: `${assetsPath}conjuntos.png` };
      case 'acessórios': return { label: 'Acessórios', img: `${assetsPath}acessorios.png` };
      case 'bolsas': return { label: 'Bolsas', img: `${assetsPath}bolsas.png` };
      case 'calças': return { label: 'Calças', img: `${assetsPath}calcas.png` };
      case 'saias': return { label: 'Saias', img: `${assetsPath}saias.png` };
      case 'casacos': return { label: 'Casacos', img: `${assetsPath}casacos.png` };
      case 'sapatos': return { label: 'Sapatos', img: `${assetsPath}sapatos.png` };
      case 'shorts': return { label: 'Shorts', img: `${assetsPath}shorts.png` };
      default: return { label: categoryName, img: `${assetsPath}all.png` };
    }
  };


  return (
    <div className="space-y-10 pb-24">
      {/* Search Bar */}
      <div className="search-bar-rounded group">
        <Search className="w-5 h-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium"
        />
        <Filter className="w-5 h-5 text-gray-400 cursor-pointer hover:text-brand-blue" />
      </div>

      {/* Popular Brand */}
      <section>
        <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
          Categorias <div className="h-px bg-gray-100 flex-1 mt-1" />
        </h2>
        <div className="grid grid-rows-2 grid-flow-col gap-y-10 gap-x-12 overflow-x-auto no-scrollbar pb-10 px-4">
          {categories.map((category) => {
            const { label, img } = getCategoryConfig(category);
            const isActive = categoryFilter === category;
            
            return (
              <motion.button
                key={category}
                onClick={() => setCategoryFilter(category)}
                title={label}
                initial={{ y: 0 }}
                animate={isActive ? { y: -8, scale: 1.15 } : { y: 0, scale: 1 }}
                whileHover={{ y: -12, scale: 1.25 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "flex flex-col items-center justify-center transition-all relative group h-32",
                  isActive 
                    ? "z-10" 
                    : ""
                )}
              >
                {/* Floating Item */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 drop-shadow-[0_20px_20px_rgba(0,0,0,0.15)] group-hover:drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] transition-all duration-500 transform group-hover:-translate-y-4">
                  <img 
                    src={img} 
                    alt={label} 
                    className="w-full h-full object-contain" 
                  />
                </div>
                
                {/* Visual Label (Back again because grid needs context) */}
                <span className={cn(
                  "mt-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  isActive ? "text-pink-500" : "text-gray-400 group-hover:text-gray-600"
                )}>
                  {label}
                </span>

                {isActive && (
                  <motion.div 
                    layoutId="activeCategoryDot"
                    className="absolute -bottom-2 w-10 h-1 bg-pink-500 rounded-full" 
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Suggest for you */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Destaques para você</h2>
          <button className="text-xs text-brand-blue font-bold hover:underline">Ver tudo</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="product-card-rounded">
                <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-gray-100 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-100 rounded-full animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="product-card-rounded group cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-gray-50">
                  {product.imageUrls?.length || product.imageUrl ? (
                    <img
                      src={product.imageUrls?.length ? product.imageUrls[0] : product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Package className="w-10 h-10 stroke-[1px]" />
                    </div>
                  )}
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add to favorites logic
                      const p = product;
                      addToCart({
                        productId: p.id,
                        productName: p.name,
                        quantity: 1,
                        unitPrice: p.unitPrice,
                        imageUrl: (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls[0] : p.imageUrl,
                        stockType: p.stockType
                      });
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                  >
                    <ShoppingBagOpen className="w-3" weight="bold" />
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm font-bold text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.unitPrice)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-20">
          <p className="text-sm text-gray-400">Nenhum produto encontrado nesta busca.</p>
        </div>
      )}
    </div>
  );
}
