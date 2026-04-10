import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../components/Layout';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { Search, SlidersHorizontal, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Hero from '../components/home/Hero';
import CategorySection from '../components/home/CategorySection';
import AdBanners from '../components/home/AdBanners';
import MetaProductsCarousel from '../components/home/MetaProductsCarousel';
import WhatsAppInvite from '../components/home/WhatsAppInvite';
import Testimonials from '../components/home/Testimonials';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const { searchTerm, setSearchTerm } = useOutletContext<LayoutContextType>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

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
    const matchesCategory = categoryFilter === 'all' || 
                           p.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const dbCategories = products.map(p => p.category);
  const defaultCategories = ['all', 'Vestidos', 'Blusas', 'Conjuntos', 'Acessórios', 'Bolsas', 'Calças', 'Saias', 'Casacos', 'Sapatos', 'Shorts'];
  // Create a unique list of categories, ignoring case
  const uniqueCategories = Array.from(new Set([...defaultCategories, ...dbCategories].map(c => c.toLowerCase())));
  
  // Map back to capitalized labels for display consistency
  const categories = uniqueCategories.map(c => {
    const found = defaultCategories.find(dc => dc.toLowerCase() === c.toLowerCase());
    return found || c.charAt(0).toUpperCase() + c.slice(1);
  });

  // Separate regular products (pronta_entrega) from meta products for the main feed
  const displayProducts = filteredProducts.filter(p => {
    const type = p.stockType?.toLowerCase().replace(/[\s_-]/g, '') || '';
    return type === 'prontarentrega' || type === 'prontaentrega';
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-24">
      {/* Hero Section */}
      <Hero />

      {/* Category Navigation & Search */}
      <section className="space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="w-full">
            <CategorySection 
              categories={categories} 
              activeCategory={categoryFilter} 
              onCategoryChange={setCategoryFilter} 
            />
          </div>
          
          {/* Refined Search Bar - Mobile Only */}
          <div className="relative group w-full lg:hidden flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-pink transition-colors" />
            <input
              type="text"
              placeholder="O que você procura hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-bold shadow-sm focus:border-pink-500/20 focus:ring-0 transition-all outline-none"
            />
          </div>
        </div>
      </section>

      {/* Add Banners with more top spacing to separate from navigation */}
      <div className="pt-4 sm:pt-8">
        <AdBanners />
      </div>

      {/* Meta Products Carousel */}
      <div className="pt-2 sm:pt-4">
        <MetaProductsCarousel products={products} loading={loading} />
      </div>

      {/* Main Product Feed */}
      <section>
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-none truncate">Pronta Entrega</h2>
            <p className="text-gray-400 text-[10px] sm:text-sm font-bold mt-1 uppercase tracking-widest truncate">Envio imediato</p>
          </div>
          <button className="flex-shrink-0 text-[10px] sm:text-xs text-brand-pink font-black uppercase tracking-widest hover:underline hover:text-brand-pink/80 transition-all">
            Ver todos
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-50 rounded-[1.5rem] sm:rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-4 sm:gap-y-6">
            <AnimatePresence>
              {displayProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {displayProducts.length === 0 && !loading && (
          <div className="text-center py-16 sm:py-24 bg-gray-50 rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="inline-flex p-3 sm:p-4 bg-white rounded-full text-gray-300 mb-4 shadow-sm">
              <Package size={32} weight="thin" className="sm:w-10 sm:h-10" />
            </div>
            <p className="text-gray-400 text-sm sm:text-base font-bold px-4">Nenhum produto disponível nesta categoria.</p>
          </div>
        )}
      </section>

      {/* WhatsApp Community */}
      <WhatsAppInvite />

      {/* Testimonials */}
      <Testimonials />
    </div>
  );
}
