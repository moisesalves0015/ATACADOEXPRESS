import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { Mail, Lock, AlertCircle, ShoppingBag } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (email.trim() === 'adm' && password.trim() === '123') {
      const demoUser = {
        uid: 'demo-admin',
        name: 'Administrador Demo',
        email: 'adm@demo.com',
        role: 'admin' as const,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('demo_user', JSON.stringify(demoUser));
      window.location.href = '/admin';
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F8F9FB' }}>
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

          <div className="mb-8">
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
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" strokeWidth={1.5} />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" strokeWidth={1.5} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
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
