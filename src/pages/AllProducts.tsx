import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { Search, SlidersHorizontal, Package, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockTypeFilter, setStockTypeFilter] = useState(initialFilter);
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setStockTypeFilter(filter);
    }
  }, [searchParams]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || 
                           p.category?.toLowerCase() === categoryFilter.toLowerCase();
    
    let matchesStock = true;
    if (stockTypeFilter === 'pronta_entrega') {
      const type = p.stockType?.toLowerCase().replace(/[\s_-]/g, '') || '';
      matchesStock = type === 'prontarentrega' || type === 'prontaentrega';
    } else if (stockTypeFilter === 'encomenda') {
      const type = p.stockType?.toLowerCase().replace(/[\s_-]/g, '') || '';
      matchesStock = type === 'encomenda';
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const dbCategories = products.map(p => p.category);
  const defaultCategories = ['all', 'Vestidos', 'Blusas', 'Conjuntos', 'Acessórios', 'Bolsas', 'Calças', 'Saias', 'Casacos', 'Sapatos', 'Shorts'];
  const uniqueCategories = Array.from(new Set([...defaultCategories, ...dbCategories].map(c => c?.toLowerCase() || '')));
  const categories = uniqueCategories.filter(Boolean).map(c => {
    const found = defaultCategories.find(dc => dc.toLowerCase() === c.toLowerCase());
    return found || c.charAt(0).toUpperCase() + c.slice(1);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Nossos Produtos</h1>
          <p className="text-gray-500 font-medium">Explore nossa coleção completa</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/5 transition-all outline-none"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-pink'}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Category Filter */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 block">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat.toLowerCase())}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          categoryFilter === cat.toLowerCase() 
                          ? 'bg-brand-pink text-white shadow-lg shadow-brand-pink/20' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Type Filter */}
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 block">Tipo de Disponibilidade</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'pronta_entrega', label: 'Pronta Entrega' },
                      { id: 'encomenda', label: 'Sob Encomenda' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setStockTypeFilter(type.id)}
                        className={`flex-1 px-4 py-3 rounded-lg text-xs font-bold transition-all border ${
                          stockTypeFilter === type.id 
                          ? 'bg-gray-900 text-white border-gray-900' 
                          : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-50 flex justify-end">
                <button 
                  onClick={() => {
                    setCategoryFilter('all');
                    setStockTypeFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-gray-50 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </AnimatePresence>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">Nenhum produto encontrado</h3>
              <p className="text-gray-500">Tente ajustar seus filtros ou busca.</p>
              <button 
                onClick={() => {
                  setCategoryFilter('all');
                  setStockTypeFilter('all');
                  setSearchTerm('');
                }}
                className="mt-6 px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:border-brand-pink transition-all"
              >
                Limpar Tudo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
