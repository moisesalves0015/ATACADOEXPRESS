import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { pushService } from '../../services/notifications/pushService';
import { 
  Pulse, 
  ShieldCheck, 
  DeviceMobile, 
  WifiHigh, 
  Bell, 
  Key,
  Warning,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  PaperPlaneTilt
} from '@phosphor-icons/react';

export default function PushDiagnostics() {
  const [diag, setDiag] = useState<any>({
    loading: true,
    platform: 'Detectando...',
    standalone: false,
    permission: 'default',
    swStatus: 'Desconhecido',
    token: null,
    isIOS: false,
    supported: false,
    registration: null
  });

  const [testLog, setTestLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setTestLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const runDiagnostics = async () => {
    setDiag(prev => ({ ...prev, loading: true }));
    addLog("Iniciando varredura de sistema...");

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    const permission = Notification.permission;
    const supported = await pushService.isSupported();

    let swStatus = 'Não encontrado';
    let reg = null;

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        reg = registrations.find(r => r.scope.includes('push-scope')) || registrations[0];
        swStatus = `Ativo (${registrations.length} workers encontrados. Principal: ${reg.scope})`;
      }
    } catch (e: any) {
      swStatus = `Erro: ${e.message}`;
    }

    let token = null;
    if (permission === 'granted') {
      try {
        token = await pushService.getAndSaveToken(auth.currentUser?.uid);
      } catch (e: any) {
        addLog(`Erro ao obter token: ${e.message}`);
      }
    }

    setDiag({
      loading: false,
      platform: navigator.userAgent,
      standalone: isStandalone,
      permission: permission,
      swStatus: swStatus,
      token: token,
      isIOS: isIOS,
      supported: supported,
      registration: reg
    });

    addLog(isStandalone ? "✅ Modo Standalone detectado." : "⚠️ Não está em modo Standalone (Necessário para iOS)");
    addLog(`Permissão: ${permission}`);
    addLog(supported ? "✅ Push é suportado neste browser." : "❌ Push NÃO é suportado neste browser.");
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const sendTestNow = async () => {
    if (!diag.token) {
      addLog("❌ Erro: Sem token para enviar.");
      return;
    }
    addLog("🚀 Enviando comando de push imediato via Cloud Function (Simulado)...");
    // Aqui implementaremos o gatilho de teste real
    alert("Token atual copiado! Use-o para validar no Firebase Console se necessário.");
    navigator.clipboard.writeText(diag.token);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Pulse size={32} weight="bold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Push Diagnostics</h1>
              <p className="text-pink-100 opacity-80">Validação profunda de infraestrutura PWA</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard 
              icon={<DeviceMobile />} 
              label="Standalone Mode" 
              value={diag.standalone ? "SIM" : "NÃO"} 
              status={diag.standalone ? 'success' : 'warning'}
            />
            <StatCard 
              icon={<ShieldCheck />} 
              label="Permissão" 
              value={diag.permission.toUpperCase()} 
              status={diag.permission === 'granted' ? 'success' : 'error'}
            />
            <StatCard 
              icon={<WifiHigh />} 
              label="Push Suportado" 
              value={diag.supported ? "SIM" : "NÃO"} 
              status={diag.supported ? 'success' : 'error'}
            />
            <StatCard 
              icon={<Bell />} 
              label="Service Worker" 
              value={diag.swStatus} 
              status={diag.registration ? 'success' : 'error'}
            />
          </div>

          {/* Token Box */}
          <div className="bg-slate-900 rounded-2xl p-6 text-pink-400 font-mono text-xs break-all relative">
            <div className="flex items-center justify-between mb-2 text-slate-400 font-sans uppercase tracking-widest text-[10px]">
              <div className="flex items-center gap-2"><Key size={12}/> FCM Token</div>
              <button onClick={() => { navigator.clipboard.writeText(diag.token || ''); alert("Copiado!"); }} className="hover:text-white">COPIAR</button>
            </div>
            {diag.token || "Token não gerado"}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={runDiagnostics}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all"
            >
              <ArrowsClockwise size={20} className={diag.loading ? "animate-spin" : ""} />
              Atualizar Diagnóstico
            </button>
            <button 
              onClick={sendTestNow}
              disabled={!diag.token}
              className="w-full flex items-center justify-center gap-2 bg-pink-500 text-white py-4 rounded-2xl font-bold hover:bg-pink-600 disabled:opacity-50 transition-all"
            >
              <PaperPlaneTilt size={20} />
              Copiar Token para Teste Manual
            </button>
          </div>

          {/* Logs */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Logs de Eventos</h3>
            <div className="bg-slate-50 rounded-2xl p-4 h-48 overflow-y-auto space-y-2">
              {testLog.map((log, i) => (
                <div key={i} className="text-xs text-slate-600 border-l-2 border-pink-200 pl-3 py-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* iOS Warning */}
      {diag.isIOS && !diag.standalone && (
        <div className="max-w-2xl mx-auto mt-6 bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4 items-start">
          <Warning size={24} className="text-amber-500 flex-shrink-0" weight="fill" />
          <div>
            <h4 className="font-bold text-amber-900">Atenção (Usuário iOS)</h4>
            <p className="text-sm text-amber-800 leading-relaxed">
              O iOS só permite notificações Push se o app for adicionado à **Tela de Início**. 
              Clique no ícone de compartilhar e selecione "Adicionar à Tela de Início" antes de testar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, status }: any) {
  const statusStyles = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    error: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  const icons = {
    success: <CheckCircle size={16} weight="fill" />,
    warning: <Warning size={16} weight="fill" />,
    error: <XCircle size={16} weight="fill" />
  };

  return (
    <div className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between bg-white shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">{icon}</div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
          <p className="text-sm font-bold text-slate-800">{value}</p>
        </div>
      </div>
      <div className={`p-1.5 rounded-full ${statusStyles[status as keyof typeof statusStyles]}`}>
        {icons[status as keyof typeof icons]}
      </div>
    </div>
  );
}
