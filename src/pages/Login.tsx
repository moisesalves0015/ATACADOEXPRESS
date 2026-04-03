import React, { useState } from 'react';
import { signInWithEmailAndPassword, AuthError } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Mail, Lock, AlertCircle, ShoppingBag, Eye, EyeOff, Phone } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';


function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique e tente novamente.';
    case 'auth/invalid-email':
      return 'O e-mail informado não é válido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o suporte.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    default:
      return 'Ocorreu um erro inesperado. Tente novamente.';
  }
}

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // E-mail or Phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let loginEmail = identifier.trim();

      // Check if it looks like a phone number (only digits or digits with formatting)
      const isPhone = /^[0-9()\-\s]+$/.test(identifier) && !identifier.includes('@');
      
      if (isPhone) {
        const cleanPhone = identifier.replace(/\D/g, '');
        const phoneDoc = await getDoc(doc(db, 'phoneMappings', cleanPhone));
        if (phoneDoc.exists()) {
          loginEmail = phoneDoc.data().email;
        } else {
          setError('Telefone não cadastrado.');
          setLoading(false);
          return;
        }
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate('/');
    } catch (err) {
      const authError = err as AuthError;
      setError(getFirebaseErrorMessage(authError.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: '#F8F9FB' }}>
      {/* Left decorative panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-20" style={{ background: '#F72585', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-15" style={{ background: '#7209b7', filter: 'blur(80px)' }} />

        {/* Logo */}
        <div className="flex flex-col z-10">
          <span className="text-5xl font-black text-white tracking-tighter">Atacado</span>
          <span className="text-sm font-black uppercase tracking-[0.4em] -mt-1" style={{ color: '#F72585' }}>Express</span>
        </div>

        {/* Center content */}
        <div className="z-10">
          <ShoppingBag className="w-16 h-16 mb-8 opacity-60" style={{ color: '#F72585' }} strokeWidth={1} />
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            A sua boutique<br />favorita, online.
          </h2>
          <p className="text-white/50 text-lg font-medium leading-relaxed">
            Moda feminina de atacado com qualidade premium. Compre com praticidade e estilo.
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

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bem-vindo de volta</h1>
            <p className="text-gray-400 font-medium mt-1 text-sm">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 bg-red-50 text-red-500 px-4 py-3 rounded-2xl text-sm font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">E-mail ou Telefone</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-300" strokeWidth={1.5} />
                  <span className="h-4 w-px bg-gray-100" />
                  <Phone className="h-4 w-4 text-gray-300" strokeWidth={1.5} />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-20 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="seu@email.com ou (00) 00000-0000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" strokeWidth={1.5} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="••••••••"
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

            <div className="pt-1">
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 text-white text-sm font-black rounded-xl transition-all disabled:opacity-50 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #F72585 0%, #b5179e 100%)', boxShadow: '0 8px 24px #F7258530' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400 font-medium">
              Não tem conta?{' '}
              <Link to="/register" className="font-bold transition-colors" style={{ color: '#F72585' }}>
                Criar conta gratuita
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
