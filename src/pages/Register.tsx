import React, { useState } from 'react';
import { createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Mail, Lock, User, AlertCircle, Sparkles, Eye, EyeOff, Phone } from 'lucide-react';
import { UserProfile } from '../types';

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Tente fazer login.';
    case 'auth/invalid-email':
      return 'O e-mail informado não é válido.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    default:
      return `Erro desconhecido (${code}). Verifique os dados e tente novamente.`;
  }
}

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Telefone inválido. Digite o DDD + Número.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const { user } = userCredential;

      // Role is always 'client' — admin must be set manually in Firebase Console
      const userProfile: UserProfile = {
        uid: user.uid,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: cleanPhone,
        role: 'client',
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // Save phone map for login
      await setDoc(doc(db, 'phoneMappings', cleanPhone), { email: formData.email.trim() });
      
      navigate('/');
    } catch (err) {
      console.error("ERRO NO CADASTRO:", err);
      const authError = err as AuthError;
      setError(getFirebaseErrorMessage(authError.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#F8F9FB' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-20" style={{ background: '#F72585', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-15" style={{ background: '#7209b7', filter: 'blur(80px)' }} />

        <div className="flex flex-col z-10">
          <span className="text-5xl font-black text-white tracking-tighter">Atacado</span>
          <span className="text-sm font-black uppercase tracking-[0.4em] -mt-1" style={{ color: '#F72585' }}>Express</span>
        </div>

        <div className="z-10">
          <Sparkles className="w-16 h-16 mb-8 opacity-60" style={{ color: '#F72585' }} strokeWidth={1} />
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Faça parte da<br />nossa comunidade.
          </h2>
          <p className="text-white/50 text-lg font-medium leading-relaxed">
            Acesso exclusivo às melhores peças de moda feminina do atacado.
          </p>
        </div>

        <p className="text-white/30 text-sm z-10">© 2025 Atacado Express Boutique</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl font-black text-gray-900 tracking-tighter">Atacado</span>
            <br />
            <span className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: '#F72585' }}>Express</span>
          </div>

          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Criar conta</h1>
            <p className="text-gray-400 font-medium mt-1 text-sm">Preencha os dados abaixo para se cadastrar</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-sm font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Nome */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Nome completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Telefone (WhatsApp)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-10 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-12 pr-10 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                id="register-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)', boxShadow: '0 8px 24px #F7258530' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Criar minha conta'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Já tem conta?{' '}
              <Link to="/login" className="font-bold transition-colors" style={{ color: '#F72585' }}>
                Entrar agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
