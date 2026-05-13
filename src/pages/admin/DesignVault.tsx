import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  MousePointer2, 
  Award, 
  CreditCard, 
  Image as ImageIcon, 
  Share2, 
  Heart, 
  PlusCircle, 
  Library, 
  UploadCloud, 
  Search, 
  Filter, 
  Tag, 
  ChevronRight,
  MoreVertical,
  Layers,
  Component,
  Smartphone,
  Eye,
  Download,
  Star,
  Loader2,
  Trash2
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PremiumButton, ButtonVariant } from '../../components/PremiumButton';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DesignAsset {
  id: string;
  name: string;
  url?: string;
  category: string;
  createdAt: Timestamp | Date;
  size?: number;
  type?: string;
  tags?: string[];
  isFavorite?: boolean;
  isComponent?: boolean;
  componentProps?: any;
}

const CATEGORIES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'buttons', label: 'Botões', icon: MousePointer2 },
  { id: 'seals', label: 'Selos', icon: Award },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
  { id: 'new', label: 'Novos Assets', icon: PlusCircle },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'uploads', label: 'Uploads', icon: UploadCloud },
];

const UI_FOLDERS = [
  { name: 'UI-KIT', path: '/UI-KIT' },
  { name: 'BOTOES', path: '/BOTOES' },
  { name: 'SELOS', path: '/SELOS' },
  { name: 'BANNERS', path: '/BANNERS' },
  { name: 'CARDS', path: '/CARDS' },
  { name: 'ICONS', path: '/ICONS' },
  { name: 'MODAIS', path: '/MODAIS' },
  { name: 'TEMPLATES', path: '/TEMPLATES' },
  { name: 'SOCIAL', path: '/SOCIAL' },
  { name: 'FAVORITOS', path: '/FAVORITOS' },
];

// Predefined Premium Buttons Library
const PREMIUM_BUTTONS_DATA: DesignAsset[] = [...Array(50)].map((_, i) => {
  const columns: ButtonVariant[] = ['pink', 'white', 'black', 'gold', 'soft-pink'];
  const variant = columns[i % 5];
  
  const getIcon = (index: number): any => {
    if (index < 10) return 'chevron';
    if (index < 15) return 'menu';
    if (index < 20) return 'plus';
    if (index < 25) return 'arrow';
    if (index < 30) return 'grid';
    if (index < 35) return 'down';
    if (index < 40) return 'chevrons';
    if (index < 45) return 'bag';
    return 'double-arrow';
  };

  const getIconPos = (index: number): 'left' | 'right' | 'both' => {
    if (index < 10) return 'right';
    if (index >= 10 && index < 15) return 'left';
    return 'right';
  };

  return {
    id: `premium-btn-${i + 1}`,
    name: `Botão Premium ${String(i + 1).padStart(2, '0')}`,
    category: 'buttons',
    createdAt: new Date(),
    isComponent: true,
    componentProps: {
      variant,
      icon: getIcon(i),
      iconPosition: getIconPos(i)
    },
    tags: ['premium', 'ui-kit', variant]
  };
});

export default function DesignVault() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Assets from Firebase
  useEffect(() => {
    const q = query(collection(db, 'design_assets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DesignAsset[];
      
      // Merge with predefined library
      setAssets([...PREMIUM_BUTTONS_DATA, ...assetsData]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `design-vault/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        await addDoc(collection(db, 'design_assets'), {
          name: file.name,
          url: downloadUrl,
          category: activeTab,
          createdAt: Timestamp.now(),
          size: file.size,
          type: file.type,
          tags: [activeTab, 'premium'],
          isFavorite: false,
          storagePath: storageRef.fullPath
        });
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar arquivos.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = async (asset: DesignAsset & { storagePath?: string }) => {
    if (asset.isComponent) {
       alert("Componentes da biblioteca não podem ser excluídos.");
       return;
    }
    if (!window.confirm("Deseja excluir este asset?")) return;

    try {
      await deleteDoc(doc(db, 'design_assets', asset.id));
      if (asset.storagePath) {
        const storageRef = ref(storage, asset.storagePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (activeTab === 'dashboard' || activeTab === 'library' || asset.category === activeTab)
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#ff2d8d]/30 selection:text-[#ff2d8d] flex overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        multiple 
        accept="image/*,.svg"
      />

      {/* SIDEBAR */}
      <aside className="w-72 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col z-20 relative overflow-hidden">
        {/* Glow effect for sidebar */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ff2d8d]/10 blur-[100px] rounded-full" />
        <div className="absolute top-1/2 -right-12 w-24 h-48 bg-[#ff2d8d]/5 blur-[60px] rounded-full" />

        <div className="p-8 relative">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff2d8d] to-[#7209b7] flex items-center justify-center shadow-[0_0_20px_rgba(255,45,141,0.4)] group-hover:scale-110 transition-transform duration-500">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white/90">Design Vault</h1>
              <p className="text-[10px] uppercase tracking-widest text-[#ff2d8d] font-bold">Workspace Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold px-4 mb-4">Workspace</div>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="absolute inset-0 bg-[#ff2d8d]/10 opacity-40 blur-xl"
                  />
                )}
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-[#ff2d8d] rounded-full shadow-[0_0_10px_#ff2d8d]"
                  />
                )}
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-[#ff2d8d]" : "text-inherit"
                )} />
                <span className="text-sm font-medium">{cat.label}</span>
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto"
                  >
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </motion.div>
                )}
              </button>
            );
          })}

          <div className="pt-8 pb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold px-4 mb-4">Pastas UI</div>
            <div className="space-y-1">
              {UI_FOLDERS.slice(0, 5).map((folder) => (
                <button 
                  key={folder.name}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all text-xs font-medium group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#ff2d8d] transition-colors" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#ff2d8d]/10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div className="relative">
              <p className="text-[10px] text-white/40 mb-1">Status do Workspace</p>
              <h4 className="text-xs font-bold text-white/90">Premium Ativado</h4>
              <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-gradient-to-r from-[#ff2d8d] to-[#7209b7]"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0a]">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ff2d8d]/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#7209b7]/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* HEADER */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/20 z-10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold tracking-tight capitalize">{activeTab}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase tracking-widest font-bold">Design Vault</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff2d8d]/10 border border-[#ff2d8d]/20 text-[#ff2d8d] uppercase tracking-widest font-bold">Personal Vault</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-80 focus-within:ring-2 focus-within:ring-[#ff2d8d]/30 transition-all duration-300">
              <Search className="w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Pesquisar meus assets..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-white placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <Tag className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)] disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>{isUploading ? 'Enviando...' : 'Upload'}</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-gradient-to-br from-[#ff2d8d] to-[#7209b7] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(255,45,141,0.3)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Asset</span>
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 p-10 overflow-y-auto no-scrollbar z-0">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">
              {filteredAssets.length} Assets encontrados
            </h3>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              <button className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold shadow-sm">Grid</button>
              <button className="px-3 py-1.5 rounded-lg text-white/30 text-xs font-bold hover:text-white/60">Lista</button>
            </div>
          </div>

          {/* Grid of Components */}
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-[#ff2d8d] animate-spin mb-4" />
                <p className="text-white/40 font-medium">Carregando seu Vault...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAssets.map((asset, i) => (
                <AssetCard key={asset.id} asset={asset} index={i} onDelete={() => handleDeleteAsset(asset)} />
              ))}

              {/* Placeholder Cards if few assets */}
              {filteredAssets.length < 4 && [...Array(4 - filteredAssets.length)].map((_, i) => (
                <AssetCardPlaceholder key={`ph-${i}`} index={i + filteredAssets.length} />
              ))}
            </div>
          )}

          {/* Upload Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="mt-12 p-12 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white/[0.04] hover:border-[#ff2d8d]/30 transition-all duration-500"
          >
            <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#ff2d8d]/10 transition-all duration-500">
              <UploadCloud className="w-10 h-10 text-white/20 group-hover:text-[#ff2d8d] transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-white/80 mb-2">Solte seus novos assets aqui</h3>
            <p className="text-white/40 max-w-sm text-sm">Clique para selecionar ou arraste seus PNGs transparentes e componentes.</p>
            <div className="mt-8 flex items-center gap-4">
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/30">Firebase Storage</div>
              <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/30">Premium Cloud</div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

const AssetCard = ({ asset, index, onDelete }: { asset: DesignAsset; index: number; onDelete: () => void; key?: React.Key }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group relative"
    >
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md overflow-hidden relative transition-all duration-500 hover:bg-white/[0.06] hover:border-white/10 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        {/* Glow Hover */}
        <div className="absolute -inset-2 bg-gradient-to-br from-[#ff2d8d]/0 via-[#ff2d8d]/0 to-[#ff2d8d]/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />

        {/* Thumbnail Area */}
        <div className="aspect-square rounded-xl bg-[#0d0d0d] relative overflow-hidden flex items-center justify-center mb-4 border border-white/5">
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          {asset.isComponent ? (
            <div className="scale-75">
               <PremiumButton {...asset.componentProps} />
            </div>
          ) : (
            <img 
              src={asset.url} 
              alt={asset.name} 
              className="relative z-10 w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Quick Actions Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
             {asset.url && (
               <a 
                 href={asset.url} 
                 target="_blank" 
                 rel="noreferrer"
                 className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
               >
                 <Eye className="w-5 h-5" />
               </a>
             )}
             <button 
               onClick={onDelete}
               className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(239,68,68,0.5)]"
             >
               <Trash2 className="w-5 h-5" />
             </button>
             <button className="w-10 h-10 rounded-full bg-[#ff2d8d] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,45,141,0.5)]">
               <Star className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Info Area */}
        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white/90 truncate pr-2" title={asset.name}>
                {asset.name}
              </h3>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">{asset.category}</p>
            </div>
            <button className="text-white/20 hover:text-[#ff2d8d] transition-colors shrink-0">
              <Heart className={cn("w-4 h-4", asset.isFavorite && "fill-[#ff2d8d] text-[#ff2d8d]")} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#ff2d8d] to-[#7209b7]" />
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-tight">Vault Owner</span>
            </div>
            <span className="text-[9px] text-white/20 font-bold uppercase">
              {asset.createdAt instanceof Timestamp 
                ? asset.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : new Date(asset.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AssetCardPlaceholder = ({ index, key }: { index: number; key?: React.Key }) => {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex flex-col gap-4 opacity-50 grayscale">
      <div className="aspect-square rounded-xl bg-white/[0.02] border border-dashed border-white/5 flex items-center justify-center">
        <Component className="w-12 h-12 text-white/5" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-white/5 rounded-full" />
        <div className="h-2 w-1/2 bg-white/5 rounded-full" />
      </div>
    </div>
  );
};
