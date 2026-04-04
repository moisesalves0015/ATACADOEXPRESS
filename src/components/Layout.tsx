import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, ClipboardList, BarChart3, Home, Bell } from 'lucide-react';
import { ShoppingBagOpen } from '@phosphor-icons/react';
import { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LayoutProps {
  user: UserProfile | null;
}

export default function Layout({ user }: LayoutProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('demo_user');
    await signOut(auth);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans transition-colors duration-500">
      {/* Premium Glass Header */}
      <header 
        className={cn(
          "sticky top-0 z-[100] w-full transition-all duration-300 px-6",
          scrolled 
            ? "py-3 bg-white/60 backdrop-blur-xl border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)]" 
            : "py-6 bg-transparent border-b border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo — Always Visible on Left */}
          <Link 
            to={isAdmin ? "/admin" : "/"} 
            className="group flex flex-col transition-all active:scale-95 translate-y-0.5"
          >
            <div className="flex items-baseline gap-0.5">
               <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none group-hover:text-pink-500 transition-colors">Atacado</span>
               <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mb-1 animate-pulse" />
            </div>
            <span 
              className="text-[10px] font-black uppercase tracking-[0.25em] -mt-1 ml-0.5" 
              style={{ color: '#F72585' }}
            >
              Express Boutique
            </span>
          </Link>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {/* User Profile Block — Moved to Right */}
            {user && (
              <div className="hidden sm:flex items-center gap-3 pr-4 mr-4 border-r border-gray-200/60">
                <div className="text-right flex flex-col">
                  <span className="text-[12px] font-bold text-gray-900 leading-tight truncate max-w-[120px]">{user.name}</span>
                  <span className="text-[10px] text-pink-500 font-black uppercase tracking-wider opacity-70">
                    {isAdmin ? 'Administrador' : 'Membro Premium'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-white shadow-lg shadow-gray-200/30 group cursor-pointer hover:scale-105 transition-all">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button className="hidden sm:flex p-2.5 bg-white/60 hover:bg-white rounded-xl shadow-sm border border-white/80 text-gray-400 hover:text-pink-500 transition-all relative">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full border-2 border-white" />
              </button>

              {!isAdmin && (
                <Link 
                  to="/cart" 
                  className="p-2.5 bg-white/60 hover:bg-white rounded-xl shadow-sm border border-white/80 text-gray-700 hover:text-pink-500 transition-all active:scale-95"
                >
                  <ShoppingBagOpen className="w-5 h-5" weight="light" />
                </Link>
              )}

              {user ? (
                <button 
                  onClick={handleLogout}
                  className="p-2.5 bg-white/60 hover:bg-red-50 rounded-xl shadow-sm border border-white/80 text-gray-400 hover:text-red-500 transition-all active:scale-95"
                  title="Sair da conta"
                >
                  <LogOut className="w-5 h-5" strokeWidth={1.5} />
                </button>
              ) : (
                <Link 
                  to="/login"
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition-all shadow-lg active:scale-95"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 pt-8 pb-32 md:pl-28 md:pb-12">
        <Outlet />
      </main>
    </div>
  );
}
