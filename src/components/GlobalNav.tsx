import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Home, ClipboardList, LayoutDashboard, Package, BarChart3, Users } from 'lucide-react';
import { HouseLine, Receipt, ShoppingBagOpen, UserCircle, Graph, Cube, UsersThree, ChartBar } from '@phosphor-icons/react';
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
    { to: '/admin', label: 'Home', icon: Graph },
    { to: '/admin/products', label: 'Produtos', icon: Cube },
    { to: '/admin/orders', label: 'Pedidos', icon: Receipt },
    { to: '/admin/clients', label: 'Clientes', icon: UsersThree },
    { to: '/admin/reports', label: 'Relatórios', icon: ChartBar },
  ] : [
    { to: '/', label: 'Início', icon: HouseLine },
    { to: '/my-orders', label: 'Pedidos', icon: Receipt },
    { to: '/cart', label: 'Carrinho', icon: ShoppingBagOpen },
    { to: user ? '/profile' : '/login', label: 'Perfil', icon: UserCircle },
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
              weight="light"
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
