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

      // Create new user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, regData.email.trim(), regData.password);
      
      // Save info to Firestore using our main DB
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
      
      // Update phoneMappings cross-reference
      if (cleanPhone && cleanPhone !== editingUser.phone) {
        await setDoc(doc(db, 'phoneMappings', cleanPhone), { email: editingUser.email });
      }

      setIsEditModalOpen(false);
      alert('Dados atualizados!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResetEmail = async (userEmail: string) => {
    if (window.confirm(`Deseja enviar um e-mail de recuperação de senha para ${userEmail}?`)) {
      try {
        const authInstance = getAuth();
        await sendPasswordResetEmail(authInstance, userEmail);
        alert('E-mail de recuperação enviado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar e-mail. Verifique se o e-mail é válido.');
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
          className="bg-brand-pink text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-pink-600 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" /> Novo Cadastro
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 font-medium">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                          u.role === 'admin' ? "bg-blue-50 text-blue-600" : "bg-pink-50 text-brand-pink"
                        )}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-none">{u.name}</p>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        u.role === 'admin' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.phone ? (
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-gray-700">{u.phone}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300 italic">Sem telefone</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.phone && (
                          <a
                            href={`https://wa.me/55${u.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Chamar no WhatsApp"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar Nome/Fone"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSendResetEmail(u.email)}
                          className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                          title="Enviar Link de Senha"
                        >
                          <KeyRound className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Modal De Cadastro */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-pink" />
                Novo Cadastro
              </h2>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full" disabled={submitting}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterClient} className="p-6 space-y-4">
              {error && <div className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</div>}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Nome</label>
                <input required type="text" value={regData.name} onChange={(e) => setRegData({...regData, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">E-mail</label>
                <input required type="email" value={regData.email} onChange={(e) => setRegData({...regData, email: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                <input required type="tel" value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="(00) 00000-0000" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Senha Inicial</label>
                <input required type="text" value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Min 6 caracteres" />
              </div>

              <button disabled={submitting} type="submit" className="w-full bg-brand-pink text-white py-4 rounded-xl font-bold shadow-lg shadow-pink-100 disabled:opacity-50">
                {submitting ? 'Processando...' : 'Criar Cadastro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal De Edição */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-500" />
                Editar Perfil
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 font-bold mb-4">
                Alterando dados de: {editingUser.email}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                <input required type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">WhatsApp</label>
                <input required type="tel" value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" />
              </div>

              <button disabled={submitting} type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-100">
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
