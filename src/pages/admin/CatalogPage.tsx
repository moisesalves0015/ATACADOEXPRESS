import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Printer, 
  ArrowLeft, 
  Image as ImageIcon,
  ShoppingCart,
  Download,
  WhatsappLogo,
  Gear,
  Eye,
  EyeSlash,
  ArrowsIn,
  ArrowsOut,
  Layout as LayoutIcon,
  Palette,
  FileText,
  Rows,
  SquaresFour,
  TextT,
  CaretRight,
  CaretDown,
  Truck,
  CreditCard,
  ShieldCheck,
  Monitor,
  QrCode,
  Tag,
  Info,
  CheckCircle,
  SelectionAll,
  Calendar,
  Clock,
  Files
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  availableQuantity: number;
  category: string;
  imageUrl: string;
  status: 'active' | 'inactive';
}

interface CatalogConfig {
  paperSize: 'a4' | 'a5' | 'letter';
  orientation: 'landscape' | 'portrait';
  productsPerPage: 1 | 2 | 4 | 6;
  margins: number;
  gap: number;
  primaryColor: string;
  fontFamily: string;
  showPrice: boolean;
  showStock: boolean;
  showDescription: boolean;
  showQrCode: boolean;
  showBadges: boolean;
  showIncentives: boolean;
  coverStyle: 'gradient' | 'minimal';
  pageNumbers: boolean;
}

// --- Constants ---
const PAGE_DIMENSIONS = {
  a4: { portrait: [793, 1122], landscape: [1122, 793] },
  a5: { portrait: [559, 793], landscape: [793, 559] },
  letter: { portrait: [816, 1056], landscape: [1056, 816] },
};

const PALETTES = [
  { name: 'Pink', color: '#ec4899' },
  { name: 'Blue', color: '#1d4ed8' },
  { name: 'Dark', color: '#0f172a' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Gold', color: '#b8860b' },
];

const FONTS = [
  { name: 'Modern', family: "'Inter', sans-serif" },
  { name: 'Elegant', family: "'Outfit', sans-serif" },
  { name: 'Serif', family: "'Playfair Display', serif" },
];

export default function CatalogPage() {
  const navigate = useNavigate();
  const catalogRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // --- UI State ---
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [zoom, setZoom] = useState(0.6);
  const [activeTab, setActiveTab] = useState<'layout' | 'design' | 'content'>('layout');

  // --- Catalog Config ---
  const [config, setConfig] = useState<CatalogConfig>({
    paperSize: 'a4',
    orientation: 'landscape',
    productsPerPage: 1,
    margins: 40,
    gap: 20,
    primaryColor: '#ec4899',
    fontFamily: "'Inter', sans-serif",
    showPrice: true,
    showStock: true,
    showDescription: true,
    showQrCode: false,
    showBadges: true,
    showIncentives: true,
    coverStyle: 'gradient',
    pageNumbers: true,
  });

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods.filter(p => p.status === 'active'));
      setLoading(false);
    });
    return () => unsubProducts();
  }, []);

  const pages = [];
  for (let i = 0; i < products.length; i += config.productsPerPage) {
    pages.push(products.slice(i, i + config.productsPerPage));
  }

  const handleDownloadPDF = async () => {
    if (!catalogRef.current) return;
    setGenerating(true);
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const styleBackups = styleElements.map(el => ({ el, parent: el.parentNode, next: el.nextSibling }));
    styleElements.forEach(el => el.remove());

    try {
      const opt = {
        margin: 0,
        filename: `CATALOGO_${format(new Date(), 'ddMMyy')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: dims[0], windowWidth: dims[0] },
        jsPDF: { unit: 'mm', format: config.paperSize, orientation: config.orientation, compress: true },
        pagebreak: { mode: ['css', 'legacy'] },
        enableLinks: true
      };
      await new Promise(r => setTimeout(r, 800));
      await html2pdf().from(catalogRef.current).set(opt).save();
    } catch (err) {
      console.error(err);
    } finally {
      styleBackups.forEach(({ el, parent, next }) => { parent?.insertBefore(el, next); });
      setGenerating(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return '';
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=800&h=800&fit=cover&output=jpg`;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 min-h-screen bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
    </div>
  );

  const dims = PAGE_DIMENSIONS[config.paperSize][config.orientation];
  const globalFont = config.fontFamily;

  return (
    <div className="space-y-8 pb-10 bg-[#F8F9FB] min-h-screen">
      {/* --- Professional Header (Dashboard Style) --- */}
      <div className="px-8 pt-8 pb-8 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Gerador de <span className="text-gray-400 font-normal">Catálogo</span>
              </h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">Personalize o layout, design e conteúdo do seu catálogo PDF.</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 text-[10px] font-black text-gray-400 flex items-center gap-3 uppercase tracking-widest">
               <Clock className="w-3.5 h-3.5" />
               {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
             </div>
             <button
                onClick={handleDownloadPDF}
                disabled={generating}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={18} weight="bold" />}
                Exportar PDF
              </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 space-y-8">
        


        {/* --- Config Toolbar (Refined Tabs Style) --- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gray-100 rounded-lg flex items-center">
                {(['layout', 'design', 'content'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    {tab === 'layout' && <LayoutIcon className="inline mr-1" />}
                    {tab === 'design' && <Palette className="inline mr-1" />}
                    {tab === 'content' && <Rows className="inline mr-1" />}
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setIsPreviewVisible(!isPreviewVisible)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                isPreviewVisible ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {isPreviewVisible ? <><EyeSlash size={16}/> Ocultar Preview</> : <><Eye size={16}/> Ver Preview</>}
            </button>
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'layout' && (
                <motion.div key="layout" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14}/> Tamanho do Papel</label>
                    <select value={config.paperSize} onChange={e => setConfig({...config, paperSize: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:bg-white focus:border-gray-900 transition-all outline-none">
                      <option value="a4">A4 (Padrão)</option>
                      <option value="a5">A5 (Compacto)</option>
                      <option value="letter">Letter (EUA)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Monitor size={14}/> Orientação</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setConfig({...config, orientation: 'portrait'})} className={cn("py-2.5 text-[10px] font-bold uppercase rounded-xl border transition-all", config.orientation === 'portrait' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>Retrato</button>
                      <button onClick={() => setConfig({...config, orientation: 'landscape'})} className={cn("py-2.5 text-[10px] font-bold uppercase rounded-xl border transition-all", config.orientation === 'landscape' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>Paisagem</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><SquaresFour size={14}/> Itens por Página</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 4, 6].map(n => (
                        <button key={n} onClick={() => setConfig({...config, productsPerPage: n as any})} className={cn("py-2.5 text-[10px] font-bold rounded-xl border transition-all", config.productsPerPage === n ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margens</label>
                      <span className="text-[10px] font-bold text-gray-900">{config.margins}px</span>
                    </div>
                    <input type="range" min="10" max="80" value={config.margins} onChange={e => setConfig({...config, margins: parseInt(e.target.value)})} className="w-full accent-gray-900" />
                  </div>
                </motion.div>
              )}

              {activeTab === 'design' && (
                <motion.div key="design" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Identidade Visual</label>
                    <div className="flex gap-4">
                      {PALETTES.map(p => (
                        <button key={p.color} onClick={() => setConfig({...config, primaryColor: p.color})} className={cn("w-10 h-10 rounded-full border-4 transition-all", config.primaryColor === p.color ? "border-white ring-2 ring-gray-900 shadow-md scale-110" : "border-transparent opacity-60 hover:opacity-100")} style={{ backgroundColor: p.color }} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tipografia</label>
                    <div className="flex gap-2">
                      {FONTS.map(f => (
                        <button key={f.family} onClick={() => setConfig({...config, fontFamily: f.family})} className={cn("px-5 py-2.5 text-[10px] font-bold uppercase rounded-xl border transition-all", config.fontFamily === f.family ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")} style={{ fontFamily: f.family }}>{f.name}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Estilo da Capa</label>
                    <div className="flex gap-2">
                      {['gradient', 'minimal'].map(s => (
                        <button key={s} onClick={() => setConfig({...config, coverStyle: s as any})} className={cn("flex-1 py-2.5 text-[10px] font-bold uppercase rounded-xl border transition-all", config.coverStyle === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300")}>{s}</button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'content' && (
                <motion.div key="content" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-7 gap-4">
                  {[
                    { key: 'showPrice', label: 'Preço' },
                    { key: 'showStock', label: 'Estoque' },
                    { key: 'showDescription', label: 'Descrição' },
                    { key: 'showIncentives', label: 'Incentivos' },
                    { key: 'showBadges', label: 'Selos' },
                    { key: 'showQrCode', label: 'QR Code' },
                    { key: 'pageNumbers', label: 'Números' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setConfig({...config, [item.key]: !config[item.key as keyof CatalogConfig]})}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all",
                        config[item.key as keyof CatalogConfig] ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-gray-200"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border", config[item.key as keyof CatalogConfig] ? "bg-white/20 border-white/40" : "bg-white border-gray-200")}>
                        {config[item.key as keyof CatalogConfig] && <CheckCircle size={14} weight="bold" />}
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-center">{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* --- Canvas Preview Area --- */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Eye size={16} /> Visualização do Canvas
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-xl items-center">
               <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ArrowsIn size={14}/></button>
               <span className="text-[10px] font-black text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ArrowsOut size={14}/></button>
            </div>
          </div>

          <div className="bg-gray-200/50 rounded-xl p-10 flex justify-center overflow-auto min-h-[600px] custom-scrollbar border border-gray-200">
            <AnimatePresence>
              {isPreviewVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, scale: zoom }}
                  exit={{ opacity: 0 }}
                  className="origin-top"
                  style={{ width: `${dims[0]}px` }}
                >
                  <div ref={catalogRef} className="bg-white shadow-[0_40px_100px_rgba(0,0,0,0.12)] rounded-sm">
                    {/* --- COVER PAGE --- */}
                    {(() => {
                      const coverTitleSize = dims[0] < 600 ? '60px' : (dims[0] < 850 ? '80px' : '100px');
                      const coverSubtitleSize = dims[0] < 600 ? '16px' : (dims[0] < 850 ? '22px' : '28px');
                      const coverDateSize = dims[0] < 600 ? '24px' : '36px';

                      return (
                        <section style={{
                          width: `${dims[0]}px`, height: `${dims[1]}px`,
                          backgroundColor: config.coverStyle === 'minimal' ? 'white' : '#0f172a',
                          color: config.coverStyle === 'minimal' ? '#0f172a' : 'white',
                          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                          position: 'relative', overflow: 'hidden', pageBreakAfter: 'always', fontFamily: globalFont
                        }}>
                          {config.coverStyle === 'gradient' && (
                            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 0% 0%, ${config.primaryColor}22, transparent), radial-gradient(circle at 100% 100%, #7209b722, transparent)` }} />
                          )}
                          <div style={{ backgroundColor: config.primaryColor, padding: '10px 30px', borderRadius: '100px', fontSize: dims[0] < 600 ? '12px' : '16px', fontWeight: '900', letterSpacing: '6px', marginBottom: '40px', textTransform: 'uppercase', color: 'white' }}>Oficial Catálogo</div>
                          <h1 style={{ fontSize: coverTitleSize, fontWeight: '900', letterSpacing: '-4px', margin: 0, textTransform: 'uppercase', textAlign: 'center', lineHeight: 0.85 }}>ATACADO SALDO<br /><span style={{ color: config.primaryColor }}>DA KRICIA</span></h1>
                          <div style={{ width: '220px', height: '6px', backgroundColor: config.primaryColor, margin: '60px 0' }} />
                          <p style={{ fontSize: coverSubtitleSize, opacity: 0.5, fontWeight: '300', letterSpacing: '14px', textTransform: 'uppercase', textAlign: 'center' }}>Gestão de Inventário</p>
                          <p style={{ marginTop: '80px', fontSize: coverDateSize, fontWeight: '900', color: config.coverStyle === 'minimal' ? '#64748b' : '#94a3b8' }}>{format(new Date(), "dd 'de' MMMM 'de' yyyy • HH:mm", { locale: ptBR })}</p>
                        </section>
                      );
                    })()}

                    {/* --- DYNAMIC PRODUCT PAGES --- */}
                    {pages.map((pageProducts, pageIdx) => {
                      // 1. Calculate Grid based on Orientation and Quantity
                      let cols = 1;
                      let rows = 1;
                      
                      if (config.productsPerPage === 2) {
                        cols = config.orientation === 'landscape' ? 2 : 1;
                        rows = config.orientation === 'landscape' ? 1 : 2;
                      } else if (config.productsPerPage === 4) {
                        cols = 2;
                        rows = 2;
                      } else if (config.productsPerPage === 6) {
                        cols = config.orientation === 'landscape' ? 3 : 2;
                        rows = config.orientation === 'landscape' ? 2 : 3;
                      }

                      // 2. Determine Layout Mode for Smart Scaling
                      const mode = config.productsPerPage === 1 ? 'premium' : (config.productsPerPage === 2 ? 'balanced' : 'compact');
                      
                      // Base typography scales depending on mode
                      const titleSize = mode === 'premium' ? '46px' : (mode === 'balanced' ? '24px' : '14px');
                      const priceSize = mode === 'premium' ? '56px' : (mode === 'balanced' ? '28px' : '16px');
                      const descSize = mode === 'premium' ? '16px' : (mode === 'balanced' ? '12px' : '9px');
                      const badgeSize = mode === 'premium' ? '12px' : (mode === 'balanced' ? '10px' : '8px');
                      const padding = mode === 'premium' ? '40px' : (mode === 'balanced' ? '25px' : '12px');
                      const buttonHeight = mode === 'premium' ? '48px' : (mode === 'balanced' ? '36px' : '28px');
                      const buttonIconSize = mode === 'premium' ? 20 : (mode === 'balanced' ? 16 : 12);
                      const stockLabelSize = mode === 'premium' ? '12px' : (mode === 'compact' ? '7px' : '8px');
                      const stockValueSize = mode === 'premium' ? '28px' : (mode === 'compact' ? '11px' : '14px');
                      const incentiveFontSize = mode === 'premium' ? '11px' : '7px';
                      const incentiveIconSize = mode === 'premium' ? 16 : 10;
                      const incentivePadding = mode === 'premium' ? '8px 14px' : '4px 6px';
                      
                      // Image proportion (adaptive)
                      const isHorizontalPremium = mode === 'premium' && config.orientation === 'landscape';
                      const imageFlexHeight = mode === 'compact' ? '40%' : '50%'; // Give more room for text in compact mode

                      return (
                        <section key={pageIdx} style={{
                          width: `${dims[0]}px`, height: `${dims[1]}px`,
                          backgroundColor: 'white', padding: `${config.margins}px`, position: 'relative',
                          pageBreakAfter: pageIdx === pages.length - 1 ? 'auto' : 'always', 
                          display: 'flex', flexDirection: 'column', boxSizing: 'border-box', fontFamily: globalFont,
                          overflow: 'hidden' // Safe Zone Protection
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid #0f172a`, paddingBottom: '10px', marginBottom: `${config.gap}px`, flexShrink: 0 }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>Saldo de Estoque</h2>
                            {config.pageNumbers && <div style={{ fontSize: '12px', fontWeight: '900', color: '#cbd5e1' }}>{pageIdx + 1} / {pages.length}</div>}
                          </div>

                          {/* Dynamic Grid Area */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${cols}, 1fr)`, 
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                            gap: `${config.gap}px`, 
                            flex: 1, // Takes all remaining usable area
                            overflow: 'hidden' 
                          }}>
                            {pageProducts.map((product) => (
                              <div key={product.id} style={{
                                border: '1px solid #f1f5f9', borderRadius: mode === 'compact' ? '12px' : '24px', 
                                padding: padding, display: 'flex', 
                                gap: mode === 'compact' ? '10px' : '30px', 
                                backgroundColor: '#ffffff', boxSizing: 'border-box',
                                flexDirection: isHorizontalPremium ? 'row' : 'column',
                                height: '100%', width: '100%', overflow: 'hidden' // Strict containment
                              }}>
                                
                                {/* Image Area - Relative Size */}
                                <div style={{ 
                                  width: isHorizontalPremium ? '45%' : '100%', 
                                  height: isHorizontalPremium ? '100%' : imageFlexHeight, 
                                  borderRadius: '8px', backgroundColor: '#f8fafc', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' 
                                }}>
                                  {product.imageUrl ? (
                                    <img src={getImageUrl(product.imageUrl)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={mode === 'premium' ? 80 : 40} /></div>
                                  )}
                                </div>

                                {/* Content Area - Flex 1 */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    {config.showBadges && (
                                      <div style={{ marginBottom: mode === 'compact' ? '4px' : '10px', display: 'flex', gap: '6px' }}>
                                        <span style={{ fontSize: badgeSize, fontWeight: '900', backgroundColor: config.primaryColor, color: 'white', padding: mode === 'compact' ? '2px 6px' : '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>Destaque</span>
                                      </div>
                                    )}
                                    <h3 style={{ fontSize: titleSize, fontWeight: '900', color: '#0f172a', margin: 0, textTransform: 'uppercase', lineHeight: 1.1, display: '-webkit-box', WebkitLineClamp: mode === 'compact' ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</h3>
                                    
                                    {config.showPrice && (
                                      <p style={{ fontSize: priceSize, fontWeight: '900', color: config.primaryColor, margin: mode === 'compact' ? '4px 0 0' : '8px 0 0', lineHeight: 1 }}>R$ {(product.unitPrice || 0).toFixed(2)}</p>
                                    )}
                                    
                                    {config.showDescription && (
                                      <p style={{ 
                                        fontSize: descSize, color: '#64748b', lineHeight: 1.3, margin: mode === 'compact' ? '6px 0 0' : '12px 0 0',
                                        display: '-webkit-box', WebkitLineClamp: mode === 'premium' ? 6 : (mode === 'balanced' ? 3 : 2), WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                                      }}>{product.description}</p>
                                    )}
                                  </div>

                                  {/* Action Footer - Pushed to bottom */}
                                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: mode === 'compact' ? '6px' : '15px', flexShrink: 0 }}>
                                    
                                    {/* Incentivos de Compra */}
                                    {config.showIncentives && (
                                      <div style={{ display: 'flex', gap: mode === 'compact' ? '4px' : '8px', flexWrap: 'wrap' }}>
                                        <div style={{ backgroundColor: '#f1f5f9', padding: incentivePadding, borderRadius: '6px', fontSize: incentiveFontSize, fontWeight: '900', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                                          <Truck size={incentiveIconSize} /> Envio Imediato
                                        </div>
                                        <div style={{ backgroundColor: '#f1f5f9', padding: incentivePadding, borderRadius: '6px', fontSize: incentiveFontSize, fontWeight: '900', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                                          <CreditCard size={incentiveIconSize} /> Até 3x S/ Juros
                                        </div>
                                        {mode !== 'compact' && (
                                          <div style={{ backgroundColor: '#f1f5f9', padding: incentivePadding, borderRadius: '6px', fontSize: incentiveFontSize, fontWeight: '900', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                                            <ShieldCheck size={incentiveIconSize} /> Qualidade A+
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: mode === 'compact' ? '6px' : '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      {config.showStock && (
                                        <div style={{ marginRight: mode === 'premium' ? '30px' : '10px' }}>
                                          <p style={{ fontSize: stockLabelSize, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Estoque</p>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: stockValueSize, fontWeight: '900', color: (product.availableQuantity || 0) > 0 ? '#059669' : '#dc2626', lineHeight: 1 }}>{product.availableQuantity || 0} un</span>
                                          </div>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: mode === 'premium' ? '12px' : '6px', flex: mode === 'premium' ? 1 : 'none', width: mode === 'compact' ? '100%' : 'auto' }}>
                                        <a 
                                          href={`https://wa.me/5521980214244?text=${encodeURIComponent(`Olá, tenho interesse no produto ${product.name}\n\nVeja aqui: https://atacadoexpress.vercel.app/product/${product.id}`)}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ textDecoration: 'none', flex: mode === 'premium' ? 1 : 'none', height: buttonHeight, padding: mode === 'compact' ? '0 8px' : '0 16px', backgroundColor: '#25D366', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: badgeSize, fontWeight: '900', gap: '6px' }}
                                        >
                                          <WhatsappLogo size={buttonIconSize} weight="bold" /> <span style={{ display: cols > 2 && mode === 'compact' ? 'none' : 'block' }}>WhatsApp</span>
                                        </a>
                                        <a 
                                          href={`https://atacadoexpress.vercel.app/product/${product.id}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ textDecoration: 'none', width: buttonHeight, height: buttonHeight, backgroundColor: '#0f172a', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                          <ShoppingCart size={buttonIconSize} weight="bold" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div style={{ marginTop: `${config.gap}px`, paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', flexShrink: 0 }}>
                            <span>Atacado Saldo da Kricia — (21) 98021-4244</span>
                            <span>Catálogo Oficial</span>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { body { background: white !important; } }
      `}</style>
    </div>
  );
}
