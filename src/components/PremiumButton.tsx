import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  ArrowRight, 
  Plus, 
  Menu, 
  LayoutGrid, 
  ShoppingBag, 
  Heart,
  ChevronDown,
  ChevronsRight,
  PlusCircle,
  Eye,
  Star
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'pink' | 'white' | 'black' | 'gold' | 'soft-pink';

interface PremiumButtonProps {
  variant: ButtonVariant;
  text?: string;
  icon?: 'chevron' | 'arrow' | 'plus' | 'menu' | 'grid' | 'bag' | 'chevrons' | 'down' | 'double-arrow';
  iconPosition?: 'left' | 'right' | 'both';
  hasGlow?: boolean;
  isGlass?: boolean;
  className?: string;
  onClick?: () => void;
}

const VARIANTS = {
  pink: "bg-gradient-to-r from-[#ff2d8d] to-[#fd1d1d] text-white border-white/20 shadow-[0_0_25px_rgba(255,45,141,0.4)]",
  white: "bg-white text-[#ff2d8d] border-[#ff2d8d]/10 shadow-[0_4px_15px_rgba(255,45,141,0.05)]",
  'soft-pink': "bg-[#fff0f5] text-[#ff2d8d] border-[#ff2d8d]/20 shadow-[0_4px_12px_rgba(255,45,141,0.1)]",
  black: "bg-[#111111] text-white border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
  gold: "bg-gradient-to-br from-[#f9e27d] via-[#d4af37] to-[#b8860b] text-white border-white/20 shadow-[0_0_20px_rgba(212,175,55,0.3)]",
};

const ICONS = {
  chevron: ChevronRight,
  arrow: ArrowRight,
  plus: Plus,
  menu: Menu,
  grid: LayoutGrid,
  bag: ShoppingBag,
  chevrons: ChevronsRight,
  down: ChevronDown,
  'double-arrow': ChevronsRight,
};

export const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  variant, 
  text = "VER TODOS", 
  icon = 'chevron',
  iconPosition = 'right',
  hasGlow = true,
  isGlass = false,
  className,
  onClick
}) => {
  const Icon = ICONS[icon];

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-4 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-[0.15em] transition-all border",
        VARIANTS[variant],
        isGlass && "backdrop-blur-md bg-opacity-80",
        className
      )}
    >
      {/* Inner Shine Effect */}
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />
      
      {iconPosition === 'left' && <Icon className="w-4 h-4" />}
      {iconPosition === 'both' && <Icon className="w-4 h-4" />}
      
      <span>{text}</span>
      
      {(iconPosition === 'right' || iconPosition === 'both') && (
        <div className={cn(
          "flex items-center justify-center rounded-full transition-all",
          variant === 'pink' ? "text-white" : "text-inherit"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      )}

      {/* External Glow Layer */}
      {hasGlow && (
        <div className={cn(
          "absolute -inset-1 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity",
          variant === 'pink' ? "bg-[#ff2d8d]" : "bg-white/20"
        )} />
      )}
    </motion.button>
  );
};
