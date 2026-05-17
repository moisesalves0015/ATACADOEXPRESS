import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Building, 
  Save, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle,
  UserCircle,
  FileText,
  MapPinned
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setUser(data);
            setName(data.name || '');
            setPhone(data.phone || '');
            setWhatsapp(data.whatsapp || '');
            setAddress(data.address || '');
            setCity(data.city || '');
            setState(data.state || '');
            setCpf(data.cpf || '');
            setCnpj(data.cnpj || '');
            setCompanyName(data.companyName || '');
            setTradingName(data.tradingName || '');
            setAvatarUrl((data as any).avatarUrl || '');
            
            // Check if address matches the default Brás address
            if (data.address === 'Feirinha da Madrugada, 1º Andar' && data.city === 'Brás' && data.state === 'SP') {
              setUseDefaultAddress(true);
            }
          }
        } catch (error) {
          console.error("Error loading profile:", error);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleToggleDefaultAddress = (checked: boolean) => {
    setUseDefaultAddress(checked);
    if (checked) {
      setAddress('Feirinha da Madrugada, 1º Andar');
      setCity('Brás');
      setState('SP');
    } else {
      setAddress('');
      setCity('');
      setState('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSaving(true);
    setMessage(null);

    try {
      const profileUpdates = {
        name,
        phone,
        whatsapp,
        address,
        city,
        state,
        cpf,
        cnpj,
        companyName,
        tradingName,
        avatarUrl
      };

      await updateDoc(doc(db, 'users', currentUser.uid), profileUpdates);
      
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'Ocorreu um erro ao atualizar o perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('demo_user');
    await signOut(auth);
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const computedAvatar = avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'Kricia'}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Profile Header Banner */}
      <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm mb-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-pink-500/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl shadow-gray-200/50 relative">
            <img 
              src={computedAvatar} 
              alt={name} 
              className="w-full h-full object-cover bg-gray-50"
            />
          </div>
        </div>

        <div className="text-center md:text-left space-y-2">
          <span className="px-3 py-1 bg-pink-50 text-pink-600 border border-pink-100 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
            {user?.role === 'admin' ? 'Administrador' : 'Membro Premium'}
          </span>
          <h1 className="text-2xl font-black text-gray-900 leading-none mt-1">{name || 'Cliente'}</h1>
          <p className="text-xs text-gray-400 font-semibold">{user?.email}</p>
        </div>

        <div className="md:ml-auto shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {message && (
        <div className={cn(
          "mb-8 rounded-2xl p-4 flex items-start gap-3 shadow-sm border",
          message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-xs font-bold">{message.text}</span>
        </div>
      )}

      {/* Profile Editor Form */}
      <form onSubmit={handleSave} className="space-y-8">
        
        {/* 1. Personal / Profile Info */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-4">
            <UserCircle className="w-4 h-4 text-pink-500" /> Meus Dados Básicos
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                  placeholder="Nome do lojista"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Foto do Perfil (URL da Imagem)</label>
              <input 
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="https://sua-imagem.jpg (opcional)"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone de Contato</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp da Empresa</label>
              <input 
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="Apenas números com DDD"
              />
            </div>
          </div>
        </div>

        {/* 2. Documents & PJ Info */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-4">
            <FileText className="w-4 h-4 text-blue-500" /> Identificação Comercial (PJ / PF)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CPF do Titular</label>
              <input 
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CNPJ da Empresa</label>
              <input 
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Razão Social</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                  placeholder="Nome comercial completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Fantasia da Loja</label>
              <input 
                type="text"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="Nome da sua loja"
              />
            </div>
          </div>
        </div>

        {/* 3. Address details */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <MapPinned className="w-4 h-4 text-emerald-500" /> Endereço de Entrega / Retirada
            </h3>
            
            {/* Quick Fill default Brás Address */}
            <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 border border-emerald-100/50 rounded-xl px-3 py-1.5 hover:bg-emerald-100/60 transition-colors">
              <input 
                type="checkbox" 
                checked={useDefaultAddress}
                onChange={(e) => handleToggleDefaultAddress(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Retirar no Brás (São Paulo)</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Endereço Principal</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                  placeholder="Rua, número, complemento, bairro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cidade</label>
              <input 
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="Ex: São Paulo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado (UF)</label>
              <input 
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                maxLength={2}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold uppercase focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/5 outline-none transition-all"
                placeholder="Ex: SP"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-pink-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl hover:scale-105 disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </button>
        </div>

      </form>
    </div>
  );
}
