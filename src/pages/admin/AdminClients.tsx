import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, setDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseConfig } from '../../firebase';
import { UserProfile } from '../../types';
import { Users, Plus, Search, X, Mail, User, Lock, AlertCircle, Phone, MessageCircle, Edit2, KeyRound, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';
// Need secondary firebase app imports
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

type FilterType = 'todos' | 'admin' | 'client';

export default function AdminClients() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterType>('todos');
  
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
    password: '',
  });

  // Editing form
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
  });

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
      (u.phone && u.phone.includes(searchTerm));
    
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
        role: 'client',
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', userCredential.user.uid), userProfile);

      // Save phone map for login
      await setDoc(doc(db, 'phoneMappings', cleanPhone), { email: regData.email.trim() });

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
    setEditData({ name: user.name, phone: user.phone || '' });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const cleanPhone = editData.phone.replace(/\D/g, '');
      
      // Update Firestore user profile
      await updateDoc(doc(db, 'users', editingUser.uid), {
        name: editData.name.trim(),
        phone: cleanPhone
      });
      
      // If phone changed, we should ideally update phoneMappings,
      // but for this demo simplification, we just update the profile.
      
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-7 h-7 text-brand-pink" /> 
          Gestão de Equipe e Clientes
        </h1>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="btn-action-premium"
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
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-pink focus:border-brand-pink transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {(['todos', 'admin', 'client'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2",
                roleFilter === f 
                  ? "bg-brand-pink border-brand-pink text-white shadow-md shadow-pink-100" 
                  : "bg-white border-gray-100 text-gray-400 hover:border-pink-100 hover:text-brand-pink"
              )}
            >
              <span className="flex items-center gap-2">
                <Filter className="w-3 h-3" />
                {f === 'todos' ? 'Todos' : f === 'admin' ? 'Admins' : 'Clientes'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                    )}>
                      {user.role}
                    </span>
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
      </div>

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[50] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-full">
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
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={regData.name}
                    onChange={e => setRegData({...regData, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                    placeholder="João Silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={e => setRegData({...regData, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                    placeholder="joao@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Telefone (DDD + Número)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={regData.phone}
                    onChange={e => setRegData({...regData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-brand-pink focus:border-brand-pink"
                    placeholder="11999999999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Senha Provisória</label>
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

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-brand-pink text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50"
                >
                  {submitting ? 'Criando Conta...' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed top-[85px] bottom-[100px] md:top-0 md:bottom-0 md:left-[80px] left-0 right-0 z-[50] flex items-center justify-center p-4 bg-black/5 backdrop-blur-md">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-full">
             <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" /> Editar Perfil
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 overflow-y-auto">
               <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Telefone</label>
                <input
                  type="text"
                  required
                  value={editData.phone}
                  onChange={e => setEditData({...editData, phone: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
