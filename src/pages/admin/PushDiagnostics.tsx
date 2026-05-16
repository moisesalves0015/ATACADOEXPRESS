import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  Info, 
  Pulse, 
  DeviceMobile, 
  WifiHigh, 
  ArrowsClockwise, 
  PaperPlaneTilt, 
  Copy, 
  Terminal, 
  ShieldCheck, 
  FileCode, 
  Browsers,
  Lightning,
  Bell,
  NavigationArrow
} from "@phosphor-icons/react";
import { getAndSaveToken } from "../../services/notifications/pushService";

export default function PushDiagnostics() {
  const [diag, setDiag] = useState<any>({
    loading: true,
    standalone: false,
    permission: 'unknown',
    supported: false,
    token: '',
    swRegistrations: [],
    userAgent: '',
    platform: '',
    isIOS: false,
    vapidKey: import.meta.env.VITE_VAPID_KEY,
    logs: []
  });

  const [testStatus, setTestStatus] = useState<any>({
    loading: false,
    result: null
  });

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setDiag((prev: any) => ({
      ...prev,
      logs: [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev.logs].slice(0, 50)
    }));
  };

  const runDiagnostics = async () => {
    setDiag((prev: any) => ({ ...prev, loading: true, logs: [] }));
    addLog("Iniciando varredura profunda de sistema...");

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const ua = navigator.userAgent;
    const platform = navigator.platform;

    addLog(`User Agent: ${ua}`);
    addLog(`Plataforma: ${platform}`);
    addLog(`iOS Detectado: ${isIOS ? 'SIM' : 'NÃO'}`);
    addLog(`Modo Standalone: ${isStandalone ? 'SIM' : 'NÃO'}`, isStandalone ? 'success' : (isIOS ? 'error' : 'warning'));

    const pushSupported = 'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window;
    addLog(`Suporte a Push: ${pushSupported ? 'OK' : 'FALHA'}`, pushSupported ? 'success' : 'error');

    let permission = 'unknown';
    try {
      permission = Notification.permission;
      addLog(`Permissão de Notificação: ${permission}`, permission === 'granted' ? 'success' : 'warning');
    } catch (e) {
      addLog(`Erro ao ler permissão: ${e}`, 'error');
    }

    let sws: any[] = [];
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      sws = regs.map(r => ({
        scope: r.scope,
        active: !!r.active,
        waiting: !!r.waiting,
        installing: !!r.installing,
        state: r.active?.state || 'unknown'
      }));
      addLog(`${regs.length} Service Workers encontrados.`);
      regs.forEach(r => addLog(`SW Ativo: ${r.scope} [${r.active?.state || 'N/A'}]`));
    } catch (e) {
      addLog(`Erro ao listar SWs: ${e}`, 'error');
    }

    let token = '';
    if (pushSupported && permission === 'granted') {
      try {
        addLog("Tentando recuperar FCM Token...");
        token = await getAndSaveToken();
        addLog("Token FCM recuperado com sucesso!", 'success');
      } catch (e: any) {
        addLog(`Falha ao obter Token: ${e.message}`, 'error');
      }
    }

    setDiag({
      loading: false,
      standalone: isStandalone,
      permission,
      supported: pushSupported,
      token,
      swRegistrations: sws,
      userAgent: ua,
      platform,
      isIOS,
      vapidKey: import.meta.env.VITE_VAPID_KEY,
      logs: [] // Reset and let state update naturally via useEffect if needed, or just keep the ones added
    });
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado!");
  };

  const testLocalNotification = async () => {
    addLog("Testando notificação LOCAL (Sem Firebase)...");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) throw new Error("Service Worker não registrado!");
      
      await reg.showNotification("Teste Local Atacado Express", {
        body: "Se você viu isso, o Service Worker está funcionando corretamente!",
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "test-local-" + Date.now()
      });
      addLog("Comando enviado ao Service Worker!", 'success');
    } catch (e: any) {
      addLog(`Erro no teste local: ${e.message}`, 'error');
    }
  };

  const testDirectPush = async () => {
    if (!diag.token) return alert("Token não disponível!");
    
    setTestStatus({ loading: true, result: null });
    addLog("Iniciando Teste de Push Direto via Cloud Function...");

    try {
      const response = await fetch('https://us-central1-atacadoexpress-b7e97.cloudfunctions.net/debugSendPush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: diag.token,
          title: "🚀 TESTE DIRETO",
          body: `Enviado às ${new Date().toLocaleTimeString()} para seu dispositivo.`
        })
      });

      const result = await response.json();
      setTestStatus({ loading: false, result });
      
      if (result.success) {
        addLog("Push disparado com sucesso! Verifique seu celular.", 'success');
      } else {
        addLog(`Erro no envio: ${result.error} - ${result.message}`, 'error');
      }
    } catch (e: any) {
      setTestStatus({ loading: false, result: { error: 'NetworkError', message: e.message } });
      addLog(`Erro de rede no teste: ${e.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Profissional */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-pink-500 p-4 rounded-2xl shadow-lg shadow-pink-200">
              <Pulse size={40} weight="bold" className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Push Debug Center</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Diagnóstico Forense de Infraestrutura</p>
            </div>
          </div>
        </div>

        {/* Status Críticos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard 
            icon={<DeviceMobile />} 
            label="Standalone" 
            value={diag.standalone ? "SIM" : "NÃO"} 
            status={diag.standalone ? 'success' : (diag.isIOS ? 'error' : 'warning')} 
          />
          <StatusCard 
            icon={<ShieldCheck />} 
            label="Permissão" 
            value={diag.permission.toUpperCase()} 
            status={diag.permission === 'granted' ? 'success' : 'error'} 
          />
          <StatusCard 
            icon={<WifiHigh />} 
            label="Suporte Push" 
            value={diag.supported ? "OK" : "NÃO"} 
            status={diag.supported ? 'success' : 'error'} 
          />
          <StatusCard 
            icon={<FileCode />} 
            label="SWs Ativos" 
            value={diag.swRegistrations.length.toString()} 
            status={diag.swRegistrations.length > 0 ? 'success' : 'error'} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna de Ações e Testes */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Bloco de Testes Reais */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Lightning weight="fill" className="text-amber-500" /> Testes de Campo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={testLocalNotification}
                  className="flex flex-col items-start p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-all group"
                >
                  <Bell size={24} className="text-slate-400 group-hover:text-slate-900 mb-2" />
                  <span className="font-bold text-slate-900">Notificação Local</span>
                  <span className="text-[10px] text-slate-500">Testa se o iOS aceita exibir banners</span>
                </button>

                <button 
                  onClick={testDirectPush}
                  disabled={!diag.token || testStatus.loading}
                  className="flex flex-col items-start p-6 bg-pink-50 border border-pink-100 rounded-2xl hover:bg-pink-100 transition-all group disabled:opacity-50"
                >
                  <PaperPlaneTilt size={24} className="text-pink-500 mb-2" />
                  <span className="font-bold text-pink-700">Push Direto (FCM)</span>
                  <span className="text-[10px] text-pink-400">Testa o fluxo completo Google -> iPhone</span>
                </button>
              </div>

              {testStatus.result && (
                <div className="mt-6 p-4 bg-slate-900 rounded-2xl overflow-x-auto">
                  <pre className="text-[10px] text-emerald-400 font-mono">
                    {JSON.stringify(testStatus.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Configuração do Sistema */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Identidade Digital</h3>
              
              <div className="space-y-4">
                <InfoItem label="FCM Token" value={diag.token || 'Não gerado'} copy />
                <InfoItem label="VAPID Key" value={diag.vapidKey} copy />
                <InfoItem label="User Agent" value={diag.userAgent} />
              </div>
            </div>

            {/* Service Workers Detalhados */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Service Worker Registry</h3>
              <div className="space-y-3">
                {diag.swRegistrations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum worker encontrado.</p>
                ) : diag.swRegistrations.map((sw: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{sw.scope}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black">Status: {sw.state}</p>
                    </div>
                    <div className="flex gap-2">
                      {sw.active && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full">ATIVO</span>}
                      {sw.waiting && <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full">WAITING</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Console de Logs */}
          <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 flex flex-col h-[600px] lg:h-auto overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Terminal size={20} className="text-pink-500" />
                <span className="text-xs font-black text-white uppercase tracking-widest">Real-time Debug Console</span>
              </div>
              <button onClick={runDiagnostics} className="text-slate-400 hover:text-white transition-colors">
                <ArrowsClockwise size={18} className={diag.loading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-[10px] scrollbar-hide">
              {diag.logs.map((log: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span className={cn(
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-emerald-400' : 
                    log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'
                  )}>
                    {log.msg}
                  </span>
                </div>
              ))}
              {diag.logs.length === 0 && <p className="text-slate-600 italic">Aguardando eventos...</p>}
            </div>
          </div>

        </div>

        {/* Footer Fix */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50 md:left-20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Browsers size={16} /> Status de Instalação: {diag.standalone ? 'PWA NATIVO' : 'BROWSER TAB'}
            </div>
            <button 
              onClick={runDiagnostics}
              className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            >
              Refresh Full Audit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, status }: any) {
  const colors = {
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    error: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-amber-50 text-amber-600 border-amber-100',
    info: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  return (
    <div className={cn("p-4 rounded-2xl border transition-all", colors[status as keyof typeof colors] || colors.info)}>
      <div className="flex items-center gap-3 mb-2 opacity-80">
        {React.cloneElement(icon, { size: 18, weight: "bold" })}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-lg font-black tracking-tight">{value}</p>
    </div>
  );
}

function InfoItem({ label, value, copy }: { label: string, value: string, copy?: boolean }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 group relative">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        {copy && (
          <button 
            onClick={() => {
              navigator.clipboard.writeText(value);
              alert('Copiado!');
            }}
            className="text-slate-400 hover:text-pink-500 transition-colors"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
      <p className="text-xs font-mono text-slate-600 break-all leading-relaxed pr-8">{value}</p>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
