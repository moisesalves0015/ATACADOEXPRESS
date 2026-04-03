import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Home, ClipboardList, LayoutDashboard, Package, BarChart3, Users } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface GlobalNavProps {
  user: UserProfile | null;
}

export default function GlobalNav({ user }: GlobalNavProps) {
  const location = useLocation();

  const isAdmin = user?.role === 'admin';

  const navLinks = isAdmin ? [
    { to: '/admin', label: 'Home', icon: LayoutDashboard },
    { to: '/admin/products', label: 'Produtos', icon: Package },
    { to: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
    { to: '/admin/clients', label: 'Clientes', icon: Users },
    { to: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
  ] : [
    { to: '/', label: 'Início', icon: Home },
    { to: '/my-orders', label: 'Pedidos', icon: ClipboardList },
    { to: '/cart', label: 'Carrinho', icon: ShoppingCart },
    { to: user ? '/profile' : '/login', label: 'Perfil', icon: User },
  ];

  // Track previous active index — mirrors the trackPrevious() JS logic from reference
  const activeIndex = navLinks.findIndex(link => location.pathname === link.to);
  const previousIndexRef = useRef<number>(activeIndex);
  const previousIndex = previousIndexRef.current;

  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== previousIndexRef.current) {
      previousIndexRef.current = activeIndex;
    }
  }, [activeIndex]);

  return (
    <nav
      className="nav-dock glass-liquid"
      data-previous={previousIndex}
      data-active={activeIndex}
    >
      {navLinks.map((link) => {
        const isActive = location.pathname === link.to;
        return (
          <Link
            key={link.to}
            to={link.to}
            className="nav-item"
            title={link.label}
          >
            {isActive && (
              <motion.div
                layoutId="global-nav-pill"
                className="nav-indicator"
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  mass: 1,
                }}
              />
            )}
            <link.icon
              className="nav-icon"
              strokeWidth={1.5}
            />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1 bg-gray-900/80 backdrop-blur-md text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 md:bottom-auto md:top-1/2 md:left-full md:-translate-y-1/2 md:ml-6">
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
