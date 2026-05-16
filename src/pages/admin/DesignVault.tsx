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
  Trash2,
  Bell,
  Send,
  ShoppingBag
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, Timestamp, getDocs } from 'firebase/firestore';
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
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'buttons', label: 'Botões', icon: MousePointer2 },
  { id: 'seals', label: 'Selos', icon: Award },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'favorites', label: 'Favoritos', icon: Heart },
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

  // Notification Test State
  const [notifData, setNotifData] = useState({
    title: '🛍️ Novo produto disponível!',
    body: 'Confira as novidades que acabaram de chegar na nossa loja premium.',
    imageUrl: '',
    url: '/'
  });
  const [isSendingNotif, setIsSendingNotif] = useState(false);

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

  const handleSendTestNotification = async () => {
    if (!notifData.title || !notifData.body) return;
    setIsSendingNotif(true);
    try {
      const tokensSnap = await getDocs(collection(db, 'users_push_tokens'));
      const tokens = tokensSnap.docs.map(doc => doc.id);

      if (tokens.length === 0) {
        alert("Nenhum dispositivo registrado para receber notificações.");
        return;
      }

      alert(`Simulando envio para ${tokens.length} dispositivos...\n\nNota: Para o envio real, utilize a Cloud Function fornecida ou uma API de backend configurada com as chaves do Firebase.`);
    } catch (error) {
      console.error("Erro ao testar notificação:", error);
    } finally {
      setIsSendingNotif(false);
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-pink-100 selection:text-pink-600 flex flex-col md:flex-row overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        multiple 
        accept="image/*,.svg"
      />

      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-200 flex flex-col z-20 relative overflow-hidden shadow-xl md:shadow-none">
        <div className="p-8 relative">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform duration-500">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900">Design Vault</h1>
              <p className="text-[10px] uppercase tracking-widest text-pink-500 font-bold">Workspace Pessoal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold px-4 mb-4">Workspace</div>
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
                    ? "bg-pink-50 text-pink-600 shadow-sm" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(247,37,133,0.5)]"
                  />
                )}
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-pink-600" : "text-inherit"
                )} />
                <span className="text-sm font-bold">{cat.label}</span>
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto"
                  >
                    <ChevronRight className="w-4 h-4 text-pink-300" />
                  </motion.div>
                )}
              </button>
            );
          })}

          <div className="pt-8 pb-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold px-4 mb-4">Pastas UI</div>
            <div className="space-y-1">
              {UI_FOLDERS.slice(0, 5).map((folder) => (
                <button 
                  key={folder.name}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all text-xs font-bold group"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-pink-500 transition-colors" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-6 mt-auto border-t border-gray-100">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 relative overflow-hidden group">
            <div className="relative">
              <p className="text-[10px] text-gray-400 mb-1">Status do Workspace</p>
              <h4 className="text-xs font-bold text-gray-900">Premium Ativado</h4>
              <div className="mt-3 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-50/50 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-50/50 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

        <header className="h-24 px-6 md:px-10 flex items-center justify-between border-b border-gray-100 backdrop-blur-xl bg-white/80 z-10 sticky top-0">
          <div className="flex items-center gap-8 min-w-0">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold tracking-tight capitalize text-gray-900 truncate">{activeTab}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-400 uppercase tracking-widest font-bold">Workspace</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 border border-pink-100 text-pink-500 uppercase tracking-widest font-bold">Premium Vault</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 w-80 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all duration-300">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Pesquisar meus assets..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-gray-900 placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all hidden sm:block">
              <Filter className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-100 mx-2 hidden md:block" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span className="hidden sm:inline">{isUploading ? 'Enviando...' : 'Upload'}</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-gradient-to-br from-pink-500 to-purple-600 text-white px-4 md:px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Asset</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar z-0">
          {activeTab === 'notifications' ? (
             <div className="max-w-3xl mx-auto space-y-10">
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl shadow-gray-100/50">
                   <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-50">
                      <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-sm">
                         <Bell className="w-7 h-7" />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-gray-900">Central de Testes Push</h3>
                         <p className="text-sm text-gray-400">Dispare notificações diretamente para os usuários do PWA.</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título da Notificação</label>
                            <input 
                               type="text"
                               value={notifData.title}
                               onChange={e => setNotifData({...notifData, title: e.target.value})}
                               className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-medium text-sm"
                               placeholder="Ex: 🛍️ Novo produto disponível!"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">URL da Imagem (Opcional)</label>
                            <input 
                               type="text"
                               value={notifData.imageUrl}
                               onChange={e => setNotifData({...notifData, imageUrl: e.target.value})}
                               className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-medium text-sm"
                               placeholder="https://sua-imagem.com/foto.jpg"
                            />
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mensagem (Corpo)</label>
                         <textarea 
                            rows={3}
                            value={notifData.body}
                            onChange={e => setNotifData({...notifData, body: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-medium text-sm resize-none"
                            placeholder="Descreva a novidade aqui..."
                         />
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Link de Ação (URL)</label>
                         <input 
                            type="text"
                            value={notifData.url}
                            onChange={e => setNotifData({...notifData, url: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all font-medium text-sm"
                            placeholder="Ex: /produtos ou /product/ID"
                         />
                      </div>

                      <div className="pt-4">
                         <button 
                            onClick={handleSendTestNotification}
                            disabled={isSendingNotif}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200 disabled:opacity-50"
                         >
                            {isSendingNotif ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            <span>{isSendingNotif ? 'Disparando...' : 'Enviar Notificação Push'}</span>
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                   <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Preview Nativo</h3>
                   <div className="max-w-xs mx-auto bg-gray-100 rounded-2xl p-4 shadow-inner">
                      <div className="bg-white/80 backdrop-blur-md rounded-xl p-3 shadow-sm border border-white">
                         <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center text-white shrink-0 overflow-hidden">
                               {notifData.imageUrl ? <img src={notifData.imageUrl} className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-xs font-bold text-gray-900 truncate">{notifData.title}</p>
                               <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{notifData.body}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          ) : (
             <>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {filteredAssets.length} Assets encontrados
                  </h3>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                    <button className="px-3 py-1.5 rounded-lg bg-white text-xs font-bold shadow-sm border border-gray-100">Grid</button>
                    <button className="px-3 py-1.5 rounded-lg text-gray-400 text-xs font-bold hover:text-gray-600">Lista</button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                      <p className="text-gray-400 font-medium">Carregando seu Vault...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAssets.map((asset, i) => (
                      <AssetCard key={asset.id} asset={asset} index={i} onDelete={() => handleDeleteAsset(asset)} />
                    ))}

                    {filteredAssets.length < 4 && [...Array(4 - filteredAssets.length)].map((_, i) => (
                      <AssetCardPlaceholder key={`ph-${i}`} index={i + filteredAssets.length} />
                    ))}
                  </div>
                )}

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-12 p-12 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white hover:border-pink-300 transition-all duration-500 shadow-sm"
                >
                  <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
                    <UploadCloud className="w-10 h-10 text-gray-300 group-hover:text-pink-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Solte seus novos assets aqui</h3>
                  <p className="text-gray-400 max-w-sm text-sm">Clique para selecionar ou arraste seus PNGs transparentes e componentes.</p>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="px-4 py-2 rounded-full bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">Firebase Storage</div>
                    <div className="px-4 py-2 rounded-full bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">Premium Cloud</div>
                  </div>
                </motion.div>
             </>
          )}
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
      <div className="p-4 rounded-3xl bg-white border border-gray-100 overflow-hidden relative transition-all duration-500 hover:shadow-xl hover:shadow-gray-100 hover:border-pink-100">
        <div className="absolute -inset-2 bg-gradient-to-br from-pink-500/0 via-pink-500/0 to-pink-500/5 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />

        <div className="aspect-square rounded-2xl bg-gray-50 relative overflow-hidden flex items-center justify-center mb-4 border border-gray-100">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]" />
          
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

          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
             {asset.url && (
               <a 
                 href={asset.url} 
                 target="_blank" 
                 rel="noreferrer"
                 className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
               >
                 <Eye className="w-5 h-5" />
               </a>
             )}
             <button 
               onClick={onDelete}
               className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-red-100"
             >
               <Trash2 className="w-5 h-5" />
             </button>
             <button className="w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-pink-100">
               <Star className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate pr-2" title={asset.name}>
                {asset.name}
              </h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">{asset.category}</p>
            </div>
            <button className="text-gray-300 hover:text-pink-500 transition-colors shrink-0">
              <Heart className={cn("w-4 h-4", asset.isFavorite && "fill-pink-500 text-pink-500")} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-600" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight">Vault Owner</span>
            </div>
            <span className="text-[9px] text-gray-300 font-bold uppercase">
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
    <div className="p-4 rounded-3xl bg-gray-50/50 border border-gray-100 flex flex-col gap-4 opacity-50">
      <div className="aspect-square rounded-2xl bg-white border border-dashed border-gray-200 flex items-center justify-center">
        <Component className="w-12 h-12 text-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
        <div className="h-2 w-1/2 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
};
