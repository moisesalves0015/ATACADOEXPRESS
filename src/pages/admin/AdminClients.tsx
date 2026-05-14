import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, setDoc, doc, updateDoc, where, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseConfig, auth } from '../../firebase';
import { UserProfile, UserRole } from '../../types';
import { Users, Plus, Search, X, Mail, User, UserCircle, Lock, AlertCircle, Phone, MessageCircle, Edit2, KeyRound, Filter, ChevronDown, ChevronUp, MapPin, CreditCard, Eye, ShoppingBag, TrendingUp, BarChart2, Download } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { logSystemAction } from '../../lib/logger';
// Need secondary firebase app imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

type FilterType = 'todos' | 'admin' | 'client' | 'supplier' | 'seller';

interface FormSectionProps {
  id: string;
  title: string;
  icon: any;
  expandedSections: string[];
  toggleSection: (id: string) => void;
  children: React.ReactNode;
  colorClass?: string;
}

const FormSection = ({ id, title, icon: Icon, expandedSections, toggleSection, children, colorClass = "text-gray-400" }: FormSectionProps) => {
  const isExpanded = expandedSections.includes(id);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">{title}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isExpanded && (
        <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default function AdminClients() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterType>('todos');
  const navigate = useNavigate();

  const [expandedSections, setExpandedSections] = useState<string[]>(['personal']);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Registration form
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    password: '',
    role: 'client' as UserRole,
    cnpj: '',
    companyName: '',
    tradingName: '',
    commissionDefault: 0,
    commissionType: 'percentage' as 'percentage' | 'fixed',
    monthlyGoal: 0,
    monthlyGoalType: 'fixed' as 'percentage' | 'fixed',
    address: '',
    city: '',
    state: '',
    observations: '',
    status: 'active' as const,
    isSeller: false,
    isSupplier: false,
  });

  // Editing form
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});

  // Load users
  useEffect(() => {
    // Bring all users
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.cnpj && u.cnpj.includes(searchTerm)) ||
      (u.companyName && u.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'todos' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getFirebaseErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado.';
      case 'auth/invalid-email': return 'O e-mail informado não é válido.';
      case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
      default: return `Erro desconhecido (${code}). Tente novamente.`;
    }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (regData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const cleanPhone = regData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Telefone inválido. Digite o DDD + Número.');
      return;
    }

    setSubmitting(true);
    try {
      const appName = "SecondaryAdminApp";
      let secondaryApp;
      if (!getApps().length || !getApps().find(app => app.name === appName)) {
        secondaryApp = initializeApp(firebaseConfig, appName);
      } else {
        secondaryApp = getApp(appName);
      }
      
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        regData.email.trim(),
        regData.password
      );

      // Create profile in Firestore
      const userProfile: UserProfile = {
        uid: userCredential.user.uid,
        name: regData.name.trim(),
        email: regData.email.trim(),
        phone: cleanPhone,
        whatsapp: regData.whatsapp || cleanPhone,
        role: regData.role,
        cnpj: regData.cnpj,
        companyName: regData.companyName,
        tradingName: regData.tradingName,
        commissionDefault: Number(regData.commissionDefault),
        commissionType: regData.commissionType,
        monthlyGoal: Number(regData.monthlyGoal),
        monthlyGoalType: regData.monthlyGoalType,
        address: regData.address,
        city: regData.city,
        state: regData.state,
        observations: regData.observations,
        status: regData.status,
        isSeller: regData.isSeller,
        isSupplier: regData.isSupplier,
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

      // Save phone map for login
      await setDoc(doc(db, 'phoneMappings', cleanPhone), { email: regData.email.trim() });
      
      // Log creation
      await logSystemAction(userCredential.user.uid, userProfile.name, 'CREATE', `Nova pessoa cadastrada no sistema (Cargo: ${userProfile.role}).`);

      // Successfully created
      await secondaryAuth.signOut();
      setRegData({ name: '', email: '', phone: '', password: '' });
      setIsRegisterModalOpen(false);
      alert('Usuário criado com sucesso!');
    } catch (err: any) {
      console.error("ADMIN_REGISTER_ERROR:", err);
      setError(getFirebaseErrorMessage(err.code || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditData({ ...user });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      // Update Firestore user profile
      const cleanPhone = editData.phone?.replace(/\D/g, '') || '';
      await updateDoc(doc(db, 'users', editingUser.uid), {
        ...editData,
        phone: cleanPhone,
        whatsapp: editData.whatsapp || cleanPhone,
        role: editData.role,
        email: editData.email,
        commissionDefault: Number(editData.commissionDefault || 0),
        commissionType: editData.commissionType || 'percentage',
        monthlyGoal: Number(editData.monthlyGoal || 0),
        monthlyGoalType: editData.monthlyGoalType || 'fixed',
        isSeller: editData.isSeller || false,
        isSupplier: editData.isSupplier || false,
      });
      
      // If phone changed, we should ideally update phoneMappings,
      // but for this demo simplification, we just update the profile.
      
      await logSystemAction(editingUser.uid, editData.name || editingUser.name, 'UPDATE', `Perfil da pessoa atualizado.`);
      
      setIsEditModalOpen(false);
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (window.confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) {
      try {
        await sendPasswordResetEmail(getAuth(), email);
        alert('E-mail enviado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar e-mail de redefinição.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Gestão <span className="text-gray-400 font-normal">de Pessoas</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie fornecedores, vendedores, clientes e administradores.</p>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="btn-action-premium shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Cadastro
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, telefone, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-pink focus:border-brand-pink transition-all font-medium"
          />
        </div>

        <div className="scroll-x-pills">
          {(['todos', 'admin', 'client', 'supplier', 'seller'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 shrink-0",
                roleFilter === f 
                  ? "bg-brand-pink border-brand-pink text-white shadow-md shadow-pink-100" 
                  : "bg-white border-gray-100 text-gray-400 hover:border-pink-100 hover:text-brand-pink"
              )}
            >
              <span className="flex items-center gap-2">
                <Filter className="w-3 h-3" />
                {f === 'todos' ? 'Todos' : f === 'admin' ? 'Admins' : f === 'client' ? 'Clientes' : f === 'supplier' ? 'Fornecedores' : 'Vendedores'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Listagem */}
      <div className="md:bg-white md:rounded-xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                      user.role === 'supplier' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      user.role === 'seller' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-blue-50 text-blue-700 border-blue-100'
                    )}>
                      {user.role === 'admin' ? 'Administrador' : user.role === 'client' ? 'Cliente' : user.role === 'supplier' ? 'Fornecedor' : 'Vendedor'}
                    </span>
                    {(user.isSeller || user.isSupplier) && user.role !== 'seller' && user.role !== 'supplier' && (
                       <div className="flex flex-wrap gap-1 mt-1">
                          {user.isSeller && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">+ Vendedor</span>}
                          {user.isSupplier && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">+ Fornecedor</span>}
                       </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {user.phone || 'Sem telefone'}
                      </span>
                      {user.phone && (
                        <a 
                          href={`https://wa.me/55${user.phone}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-green-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="w-2.5 h-2.5" /> Abrir WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/pessoas/${user.uid}`)}
                        className="p-2 text-gray-400 hover:text-brand-pink hover:bg-pink-50 rounded-lg transition-all"
                        title="Ver Perfil CRM"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                        title="Resetar Senha"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                    <UserCircle className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-gray-900 truncate">{user.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{user.email}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-lg border shrink-0",
                  user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                  user.role === 'supplier' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                  user.role === 'seller' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  'bg-blue-50 text-blue-700 border-blue-100'
                )}>
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    {user.role === 'admin' ? 'Admin' : user.role === 'client' ? 'Cliente' : user.role === 'supplier' ? 'Fornecedor' : 'Vendedor'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Telefone</span>
                  <p className="text-xs font-bold text-gray-900">{user.phone || '-'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">WhatsApp</span>
                  {user.phone ? (
                    <a 
                      href={`https://wa.me/55${user.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100"
                    >
                      <MessageCircle className="w-3 h-3" /> Abrir
                    </a>
                  ) : (
                    <p className="text-xs font-bold text-gray-300">-</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  {user.isSeller && <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Vendedor</span>}
                  {user.isSupplier && <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">Fornecedor</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/pessoas/${user.uid}`)}
                    className="p-2.5 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-200 active:scale-95 transition-all"
                    title="Ver Perfil"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.email)}
                    className="p-2.5 bg-white text-orange-600 border border-orange-100 rounded-xl active:scale-95 transition-all"
                    title="Redefinir Senha"
                  >
                    <KeyRound className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-2.5 bg-white text-blue-600 border border-blue-100 rounded-xl active:scale-95 transition-all"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-full">
             <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-pink" /> Novo Cadastro
              </h2>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterClient} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}              <div className="grid grid-cols-1 gap-4">
                {/* Role Selector - Always visible */}
                <div className="mb-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Tipo de Pessoa</label>
                  <select
                    value={regData.role}
                    onChange={e => setRegData({...regData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink font-bold text-gray-700 shadow-sm"
                  >
                    <option value="client">Cliente</option>
                    <option value="seller">Vendedor</option>
                    <option value="supplier">Fornecedor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                
                {/* Secondary Roles */}
                {(regData.role === 'admin' || regData.role === 'client') && (
                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
                     <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={regData.isSeller || false} onChange={e => setRegData({...regData, isSeller: e.target.checked})} className="rounded text-brand-pink focus:ring-brand-pink" />
                        Também é Vendedor
                     </label>
                     <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={regData.isSupplier || false} onChange={e => setRegData({...regData, isSupplier: e.target.checked})} className="rounded text-brand-pink focus:ring-brand-pink" />
                        Também é Fornecedor
                     </label>
                  </div>
                )}

                <FormSection id="personal" title="Dados Pessoais" icon={User} colorClass="text-brand-pink" expandedSections={expandedSections} toggleSection={toggleSection}>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Nome Completo / Contato</label>
                      <input
                        type="text"
                        required
                        value={regData.name}
                        onChange={e => setRegData({...regData, name: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                        placeholder="João Silva"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">E-mail</label>
                      <input
                        type="email"
                        required
                        value={regData.email}
                        onChange={e => setRegData({...regData, email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                        placeholder="joao@email.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Telefone</label>
                        <input
                          type="text"
                          required
                          value={regData.phone}
                          onChange={e => setRegData({...regData, phone: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                          placeholder="11999999999"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">WhatsApp (Opcional)</label>
                        <input
                          type="text"
                          value={regData.whatsapp}
                          onChange={e => setRegData({...regData, whatsapp: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                          placeholder="Mesmo que telefone"
                        />
                      </div>
                    </div>

                    {regData.role === 'supplier' && (
                      <div className="space-y-4 pt-2 border-t border-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">CNPJ / CPF</label>
                            <input
                              type="text"
                              value={regData.cnpj}
                              onChange={e => setRegData({...regData, cnpj: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">Nome Fantasia</label>
                            <input
                              type="text"
                              value={regData.tradingName}
                              onChange={e => setRegData({...regData, tradingName: e.target.value})}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">Razão Social</label>
                          <input
                            type="text"
                            value={regData.companyName}
                            onChange={e => setRegData({...regData, companyName: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-50">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Senha Provisória de Acesso</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={regData.password}
                          onChange={e => setRegData({...regData, password: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                    </div>
                  </div>
                </FormSection>

                <FormSection id="address" title="Dados de Endereço" icon={MapPin} colorClass="text-blue-500" expandedSections={expandedSections} toggleSection={toggleSection}>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Endereço Completo</label>
                      <input
                        type="text"
                        value={regData.address}
                        onChange={e => setRegData({...regData, address: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                        placeholder="Rua, Número, Complemento"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Cidade</label>
                        <input
                          type="text"
                          value={regData.city}
                          onChange={e => setRegData({...regData, city: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                          placeholder="Ex: São Paulo"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Estado</label>
                        <input
                          type="text"
                          value={regData.state}
                          onChange={e => setRegData({...regData, state: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                          placeholder="UF"
                        />
                      </div>
                    </div>
                  </div>
                </FormSection>

                {(regData.role === 'seller' || regData.role === 'supplier' || regData.role === 'admin') && (
                  <FormSection id="financial" title="Dados Financeiros / Config" icon={CreditCard} colorClass="text-emerald-500" expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="grid grid-cols-1 gap-4">
                      {(regData.role === 'seller' || regData.role === 'admin') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                              <label className="block text-[10px] font-black text-emerald-400 uppercase">Comissão</label>
                              <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => setRegData({...regData, commissionType: 'percentage'})}
                                  className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", regData.commissionType === 'percentage' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                >%</button>
                                <button
                                  type="button"
                                  onClick={() => setRegData({...regData, commissionType: 'fixed'})}
                                  className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", regData.commissionType === 'fixed' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                >R$</button>
                              </div>
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              value={regData.commissionDefault}
                              onChange={e => setRegData({...regData, commissionDefault: Number(e.target.value)})}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5 px-1">
                              <label className="block text-[10px] font-black text-emerald-400 uppercase">Meta Mensal</label>
                              <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => setRegData({...regData, monthlyGoalType: 'percentage'})}
                                  className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", regData.monthlyGoalType === 'percentage' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                >%</button>
                                <button
                                  type="button"
                                  onClick={() => setRegData({...regData, monthlyGoalType: 'fixed'})}
                                  className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", regData.monthlyGoalType === 'fixed' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                >R$</button>
                              </div>
                            </div>
                            <input
                              type="number"
                              value={regData.monthlyGoal}
                              onChange={e => setRegData({...regData, monthlyGoal: Number(e.target.value)})}
                              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Observações Internas</label>
                        <textarea
                          value={regData.observations}
                          onChange={e => setRegData({...regData, observations: e.target.value})}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink resize-none"
                          placeholder="Notas sobre este cadastro..."
                        />
                      </div>
                    </div>
                  </FormSection>
                )}

                {/* Submit */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-brand-pink text-white py-3.5 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50 uppercase tracking-widest text-xs"
                  >
                    {submitting ? 'Processando...' : 'Finalizar Cadastro'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[1000] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-full">
             <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" /> Editar Perfil
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto">
               <div className="grid grid-cols-1 gap-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Papel / Função</label>
                        <select
                          value={editData.role || 'client'}
                          onChange={e => setEditData({...editData, role: e.target.value as UserRole})}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold shadow-sm"
                        >
                          <option value="client">Cliente</option>
                          <option value="seller">Vendedor</option>
                          <option value="supplier">Fornecedor</option>
                          <option value="admin">Administrador</option>
                        </select>
                        
                        {/* Secondary Roles for Edit */}
                        {(editData.role === 'admin' || editData.role === 'client') && (
                          <div className="flex flex-col gap-2 mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <label className="flex items-center gap-2 text-[10px] font-bold text-gray-700 cursor-pointer uppercase tracking-widest">
                                <input type="checkbox" checked={editData.isSeller || false} onChange={e => setEditData({...editData, isSeller: e.target.checked})} className="rounded text-blue-500 focus:ring-blue-500" />
                                Também atua como Vendedor
                             </label>
                             <label className="flex items-center gap-2 text-[10px] font-bold text-gray-700 cursor-pointer uppercase tracking-widest">
                                <input type="checkbox" checked={editData.isSupplier || false} onChange={e => setEditData({...editData, isSupplier: e.target.checked})} className="rounded text-blue-500 focus:ring-blue-500" />
                                Também atua como Fornecedor
                             </label>
                          </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Status da Conta</label>
                        <select
                          value={editData.status || 'active'}
                          onChange={e => setEditData({...editData, status: e.target.value as 'active' | 'inactive'})}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 font-bold shadow-sm"
                        >
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                    </div>
                 </div>

                 <FormSection id="personal" title="Dados Pessoais" icon={User} colorClass="text-blue-600" expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Nome / Contato</label>
                          <input
                            type="text"
                            required
                            value={editData.name || ''}
                            onChange={e => setEditData({...editData, name: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Telefone</label>
                          <input
                            type="text"
                            required
                            value={editData.phone || ''}
                            onChange={e => setEditData({...editData, phone: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">WhatsApp</label>
                          <input
                            type="text"
                            value={editData.whatsapp || ''}
                            onChange={e => setEditData({...editData, whatsapp: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">E-mail</label>
                          <input
                            type="text"
                            value={editData.email || ''}
                            onChange={e => setEditData({...editData, email: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {(editData.role === 'supplier' || editingUser?.role === 'supplier') && (
                        <div className="space-y-4 pt-2 border-t border-gray-50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">CNPJ / CPF</label>
                              <input
                                type="text"
                                value={editData.cnpj || ''}
                                onChange={e => setEditData({...editData, cnpj: e.target.value})}
                                className="w-full px-4 py-2 border border-orange-100 rounded-xl focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">Nome Fantasia</label>
                              <input
                                type="text"
                                value={editData.tradingName || ''}
                                onChange={e => setEditData({...editData, tradingName: e.target.value})}
                                className="w-full px-4 py-2 border border-orange-100 rounded-xl focus:ring-orange-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-orange-400 uppercase mb-1.5">Razão Social</label>
                            <input
                              type="text"
                              value={editData.companyName || ''}
                              onChange={e => setEditData({...editData, companyName: e.target.value})}
                              className="w-full px-4 py-2 border border-orange-100 rounded-xl focus:ring-orange-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                 </FormSection>

                 <FormSection id="address" title="Dados de Endereço" icon={MapPin} colorClass="text-blue-500" expandedSections={expandedSections} toggleSection={toggleSection}>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Endereço Completo</label>
                        <input
                          type="text"
                          value={editData.address || ''}
                          onChange={e => setEditData({...editData, address: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          placeholder="Rua, Número, Complemento"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Cidade</label>
                          <input
                            type="text"
                            value={editData.city || ''}
                            onChange={e => setEditData({...editData, city: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Estado</label>
                          <input
                            type="text"
                            value={editData.state || ''}
                            onChange={e => setEditData({...editData, state: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                 </FormSection>

                 {(editData.role === 'seller' || editData.role === 'supplier' || editData.role === 'admin') && (
                   <FormSection id="financial" title="Dados Financeiros / Config" icon={CreditCard} colorClass="text-emerald-500" expandedSections={expandedSections} toggleSection={toggleSection}>
                      <div className="grid grid-cols-1 gap-4">
                        {(editData.role === 'seller' || editData.role === 'admin') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <label className="block text-[10px] font-black text-emerald-400 uppercase">Comissão</label>
                                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditData({...editData, commissionType: 'percentage'})}
                                      className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", editData.commissionType === 'percentage' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                    >%</button>
                                    <button
                                      type="button"
                                      onClick={() => setEditData({...editData, commissionType: 'fixed'})}
                                      className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", editData.commissionType === 'fixed' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                    >R$</button>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editData.commissionDefault || 0}
                                  onChange={e => setEditData({...editData, commissionDefault: Number(e.target.value)})}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <label className="block text-[10px] font-black text-emerald-400 uppercase">Meta Mensal</label>
                                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditData({...editData, monthlyGoalType: 'percentage'})}
                                      className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", editData.monthlyGoalType === 'percentage' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                    >%</button>
                                    <button
                                      type="button"
                                      onClick={() => setEditData({...editData, monthlyGoalType: 'fixed'})}
                                      className={cn("px-2 py-0.5 text-[9px] font-bold rounded-md transition-all", editData.monthlyGoalType === 'fixed' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400")}
                                    >R$</button>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  value={editData.monthlyGoal || 0}
                                  onChange={e => setEditData({...editData, monthlyGoal: Number(e.target.value)})}
                                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-emerald-500"
                                />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5">Observações Internas</label>
                          <textarea
                            value={editData.observations || ''}
                            onChange={e => setEditData({...editData, observations: e.target.value})}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 resize-none"
                          />
                        </div>
                      </div>
                   </FormSection>
                 )}

                 <div className="pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                      {submitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                 </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
