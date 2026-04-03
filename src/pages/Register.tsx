import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Mail, Lock, User, Phone, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    cpf: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const { user } = userCredential;

      const role = formData.email === 'moises.app.thoth@gmail.com' ? 'admin' : 'client';

      const userProfile: UserProfile = {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: role as any,
        address: formData.address,
        cpf: formData.cpf,
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      navigate('/');
    } catch (err: any) {
      setError('Erro ao criar conta. Verifique os dados e tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 text-sm font-medium transition-all shadow-sm";

  return (
    <div className="min-h-screen flex" style={{ background: '#F8F9FB' }}>
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

          <div className="mb-6">
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
                <input name="name" type="text" required value={formData.name} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }} placeholder="Seu nome completo" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input name="email" type="email" required value={formData.email} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }} placeholder="seu@email.com" />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input name="password" type="password" required value={formData.password} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            {/* Telefone + CPF */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" strokeWidth={1.5} />
                  <input name="phone" type="text" required value={formData.phone} onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm" style={{ fontSize: '16px' }}
                    placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">CPF</label>
                <input name="cpf" type="text" required value={formData.cpf} onChange={handleChange}
                  className="block w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm" style={{ fontSize: '16px' }}
                  placeholder="000.000.000-00" />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-400 ml-1 uppercase tracking-widest">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" strokeWidth={1.5} />
                <input name="address" type="text" required value={formData.address} onChange={handleChange}
                  className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all shadow-sm"
                  style={{ fontSize: '16px' }} placeholder="Rua, Número, Bairro" />
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
