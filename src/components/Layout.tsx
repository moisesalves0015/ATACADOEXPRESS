import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, ClipboardList, BarChart3, Home } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion } from 'motion/react';

interface LayoutProps {
  user: UserProfile | null;
}

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    localStorage.removeItem('demo_user');
    await signOut(auth);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin';

  const navLinks = isAdmin ? [
    { to: '/admin', label: 'Home', icon: LayoutDashboard },
    { to: '/admin/products', label: 'Produtos', icon: Package },
    { to: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
    { to: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
  ] : [
    { to: '/', label: 'Início', icon: Home },
    { to: '/my-orders', label: 'Pedidos', icon: ClipboardList },
    { to: '/cart', label: 'Carrinho', icon: ShoppingCart },
    { to: user ? '/profile' : '/login', label: 'Perfil', icon: User },
  ];

  // Track previous active index — mirrors the trackPrevious() JS logic
  const activeIndex = navLinks.findIndex(link => location.pathname === link.to);
  const previousIndexRef = useRef<number>(activeIndex);
  const previousIndex = previousIndexRef.current;

  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== previousIndexRef.current) {
      previousIndexRef.current = activeIndex;
    }
  }, [activeIndex]);


  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Header */}
      <header className="bg-transparent sticky top-0 z-50 px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-xl shadow-gray-200/50">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">{user.name}</span>
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Membro Premium</span>
              </div>
            </div>
          ) : (
            <Link to="/" className="flex flex-col">
              <span className="text-2xl font-black text-gray-900 tracking-tighter">Atacado</span>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] -mt-1.5 ml-0.5" style={{ color: '#F72585' }}>Express</span>
            </Link>
          )}

          <div className="flex items-center gap-3">
            {!isAdmin && (
              <Link to="/cart" className="p-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
              </Link>
            )}
            {user && (
              <button 
                onClick={handleLogout}
                className="p-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white hover:text-red-500 hover:scale-105 transition-all"
              >
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content — padding accounts for GlobalNav */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 pt-4 pb-36 md:pl-32 md:pb-6">
        <Outlet />
      </main>
    </div>
  );
}
