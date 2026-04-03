import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Package, Search, Filter, Grid, Shirt, Crown, Gem, ShoppingBag, Palette } from 'lucide-react';
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
  const defaultCategories = ['all', 'Vestidos', 'Blusas', 'Conjuntos', 'Acessórios', 'Bolsas'];
  const categories = [...new Set([...defaultCategories, ...dbCategories])];

  const getCategoryConfig = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'all': return { label: 'Ver Tudo', Icon: Grid };
      case 'vestidos': return { label: 'Vestidos', Icon: Crown };
      case 'blusas': return { label: 'Blusas', Icon: Shirt };
      case 'conjuntos': return { label: 'Conjuntos', Icon: Package };
      case 'acessórios': return { label: 'Acessórios', Icon: Gem };
      case 'bolsas': return { label: 'Bolsas', Icon: ShoppingBag };
      default: return { label: categoryName, Icon: Palette };
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
        <h2 className="text-lg font-bold mb-4">Categorias</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {categories.map((category) => {
            const { label, Icon } = getCategoryConfig(category);
            const isActive = categoryFilter === category;
            
            return (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={cn(
                  "category-badge-card flex-shrink-0 flex items-center gap-2",
                  isActive 
                    ? "border-pink-500 text-pink-600 bg-pink-50/20 shadow-md" 
                    : "text-gray-600 hover:border-pink-200 hover:text-pink-600"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  {label}
                </span>
              </button>
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
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                  >
                    <ShoppingCart className="w-3 h-3 text-gray-600" />
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
