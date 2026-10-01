import { apiFetch } from '../services/api/apiClient';

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  Scale, 
  MessageSquare, 
  FileText, 
  Settings, 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  LogOut,
  ChevronRight,
  Search,
  Plus,
  Loader2,
  ShieldAlert,
  Database,
  Bell,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { User, UserRole, SubscriptionPlan } from '../types';
import ChatInterface from './chat/ChatInterface';
import DocumentManager from './legal/DocumentManager';
import AdminDashboard from './admin/AdminDashboard';
import BoldPaymentButton from './payments/BoldPaymentButton';
import Dashboard from './dashboard/Dashboard';
import { authClient } from '@/lib/auth-client';
import { SupremeCourtAlertsService } from '../services/alerts/supremeCourtAlertsService';
import { NewExpedienteModal } from './legal/NewExpedienteModal';
import { ExpedienteStorageService } from '../services/expedientes/expedienteStorageService';
import { NeonSyncService, NeonDbHealth } from '../services/neon/neonSyncService';

const Sidebar = ({ 
  user, 
  activeExpedienteId, 
  setActiveExpedienteId, 
  expedientes 
}: { 
  user: User; 
  activeExpedienteId: string; 
  setActiveExpedienteId: (id: string) => void; 
  expedientes: any[]; 
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    const alerts = SupremeCourtAlertsService.getAlerts();
    setUnreadAlerts(alerts.filter(a => !a.isRead).length);
  }, []);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 h-screen flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50 shadow-2xl">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Scale className="text-white w-6 h-6" />
        </div>
        <span className="font-black text-xl text-white tracking-tighter italic">LegisAI</span>
      </div>

      {/* Expediente Activo Global Selector in Menu Principal */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-indigo-400">
            <span>Expediente Activo Global</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <select
            value={activeExpedienteId}
            onChange={(e) => setActiveExpedienteId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-[11px] font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer shadow-inner"
            title="Seleccionar expediente activo global para el despacho"
          >
            {expedientes.map(exp => (
              <option key={exp.id} value={exp.id}>
                {exp.titulo.length > 30 ? exp.titulo.substring(0, 30) + '...' : exp.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="pb-2 px-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Principal</div>
        <Link to="/dashboard" className="flex items-center justify-between p-3.5 rounded-xl hover:bg-indigo-600/10 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-indigo-500/20 group">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            <span>Dashboard</span>
          </div>
          {unreadAlerts > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {unreadAlerts}
            </span>
          )}
        </Link>

        <div className="pt-4 pb-2 px-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Investigación</div>
        <Link to="/chat" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-indigo-600/10 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-indigo-500/20">
          <MessageSquare className="w-4 h-4" />
          Chat Jurídico
        </Link>
        <Link to="/documents" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-indigo-600/10 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-indigo-500/20">
          <FileText className="w-4 h-4" />
          Expedientes
        </Link>
        
        <div className="pt-6 pb-2 px-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Gestión</div>
        <Link to="/subscription" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-indigo-600/10 hover:text-indigo-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-indigo-500/20">
          <CreditCard className="w-4 h-4" />
          Suscripción
        </Link>

        {isAdmin && (
          <>
            <div className="pt-6 pb-2 px-3 text-[10px] font-black text-rose-500/50 uppercase tracking-[0.2em]">Administrador</div>
            <Link to="/admin" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/5 hover:text-rose-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-rose-500/20">
              <LayoutDashboard className="w-4 h-4" />
              Panel de Control
            </Link>
            <Link to="/admin/users" className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-rose-500/5 hover:text-rose-400 transition-all text-xs font-black uppercase tracking-widest border border-transparent hover:border-rose-500/20">
              <Users className="w-4 h-4" />
              Usuarios
            </Link>
          </>
        )}
      </nav>

      <div className="p-6 border-t border-slate-800 bg-slate-950/40">
        <div className="group flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-default">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=4f46e5&color=fff&bold=true`} 
            alt={user.displayName}
            className="w-9 h-9 rounded-xl shadow-lg border-2 border-indigo-500/20 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{user.displayName}</p>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{user.subscription.plan} Member</p>
          </div>
          <button 
            onClick={async () => {
              await authClient.signOut({});
              window.location.href = '/login';
            }}
            className="text-slate-500 hover:text-rose-500 transition-all p-2 hover:bg-rose-500/10 rounded-xl"
            title="Desconectar Despacho"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

/**
 * Identidad del usuario.
 *
 * La sesión la emite better-auth (Google OAuth) y la valida el middleware de
 * Next antes de servir nada. Aquí solo se proyecta a la interfaz: el rol real
 * se comprueba en el servidor en cada route handler.
 */
const buildUser = (
  email: string,
  uid: string,
  displayName?: string,
  role?: string,
): User => ({
  id: uid,
  email,
  displayName: displayName || email.split('@')[0] || 'Jurista LegisAI',
  role: role === 'admin' ? UserRole.ADMIN : UserRole.USER,
  subscription: {
    plan: SubscriptionPlan.PRO,
    status: 'ACTIVE',
    validUntil: '2026-12-31',
  },
});

const App: React.FC = () => {
  const { data: session, isPending } = authClient.useSession();

  const user: User | null = React.useMemo(() => {
    const su = (session as any)?.user;
    if (!su?.email) return null;
    return buildUser(su.email, su.id, su.name, su.role);
  }, [session]);

  if (isPending || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-3xl z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center gap-8 animate-in fade-in duration-1000">
          <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(79,70,229,0.3)] flex items-center justify-center border border-indigo-100">
            <Scale className="w-10 h-10 text-indigo-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] italic">LegisAI Colombia</h2>
            <div className="flex items-center gap-3 justify-center">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] animate-pulse">Sincronizando Despacho...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

interface AuthenticatedAppProps {
  user: User;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ user }) => {
  const [isNewExpedienteOpen, setIsNewExpedienteOpen] = useState(false);
  const [dbHealth, setDbHealth] = useState<NeonDbHealth | null>(null);
  const [activeExpedienteId, setActiveExpedienteId] = useState<string>(() => {
    return localStorage.getItem('legisai_active_expediente_id') || 'exp-1789743909641';
  });
  const [expedientes, setExpedientes] = useState<any[]>(() => {
    return ExpedienteStorageService.getExpedientes();
  });
  const [ramaNotifications, setRamaNotifications] = useState<any[]>([
    {
      id: 'notif-1',
      title: 'Actualización Oficial Rama Judicial',
      despacho: 'Juzgado 015 Laboral del Circuito de Bogotá',
      estado: 'Al Despacho para Sentencia / Auto Admisorio Vigente',
      radicado: '11001-31-05-015-2022-00342-01',
      documentos: [
        { nombre: 'Auto_Y_Actuacion_RamaJudicial_00342-01.pdf', fecha: '2026-09-23', actuacion: 'RADICACIÓN DE NUEVO MEMORIAL' },
        { nombre: 'FijacionEnLista_00342.pdf', fecha: '2026-09-15', actuacion: 'FIJACION EN LISTA / TRASLADO' }
      ],
      date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      read: false
    }
  ]);
  const [showRamaNotifications, setShowRamaNotifications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('legisai_active_expediente_id', activeExpedienteId);
    
    // Escaneo en tiempo real de la Rama Judicial para el expediente activo
    const currentExp = expedientes.find(e => e.id === activeExpedienteId);
    if (currentExp && currentExp.radicado) {
      apiFetch('/api/rama-judicial/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radicado: currentExp.radicado, expedienteId: activeExpedienteId })
      })
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Servidor no disponible o respuesta no válida");
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.portalInfo) {
          const newNotif = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: `Portal Rama Judicial: ${currentExp.radicado}`,
            despacho: data.portalInfo.despacho,
            estado: data.portalInfo.estadoActual,
            radicado: currentExp.radicado,
            documentos: data.nuevosDocumentos || [],
            date: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            read: false
          };
          setRamaNotifications(prev => [newNotif, ...prev]);
        }
      })
      .catch(() => {});
    }
  }, [activeExpedienteId]);

  useEffect(() => {
    // Sincronizar automáticamente con Neon DB
    ExpedienteStorageService.syncWithNeonDb();

    // Comprobar estado de salud y estadísticas de Neon DB
    NeonSyncService.checkHealth().then(status => {
      setDbHealth(status);
    });

    const list = ExpedienteStorageService.getExpedientes();
    setExpedientes(list);
  }, []);

  const handleExpedienteCreated = () => {
    setIsNewExpedienteOpen(false);
    const list = ExpedienteStorageService.getExpedientes();
    setExpedientes(list);
    navigate('/documents');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        user={user} 
        activeExpedienteId={activeExpedienteId} 
        setActiveExpedienteId={setActiveExpedienteId} 
        expedientes={expedientes} 
      />
      <div className="flex-1 flex flex-col ml-64">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-2xl w-[400px] focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:bg-white focus-within:border-indigo-200 transition-all group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Consultar jurisprudencia colombiana..." 
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>
          <div className="flex items-center gap-4">
            {/* Indicador de conexión a Neon PostgreSQL */}
            <div 
              className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                dbHealth?.connected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                dbHealth?.connected
                  ? `Base de datos Neon conectada (${dbHealth.database}). Expedientes en nube: ${dbHealth.expedientesCount ?? 0}. Extensión pgvector activa.`
                  : 'Modo local (conectando a Neon DB...)'
              }
            >
              <Database className={`w-3.5 h-3.5 ${dbHealth?.connected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{dbHealth?.connected ? 'Neon DB (pgvector)' : 'Neon DB'}</span>
              <span className={`w-2 h-2 rounded-full ${dbHealth?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            </div>

            <div className="hidden xl:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <ShieldAlert className="w-3 h-3 text-emerald-500" />
              TLS 1.3
            </div>

            {/* Notificaciones Rama Judicial en Tiempo Real */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRamaNotifications(!showRamaNotifications);
                  if (!showRamaNotifications) {
                    setRamaNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }
                }}
                className="relative p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm cursor-pointer"
                title="Notificaciones de la Rama Judicial en tiempo real"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {ramaNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {ramaNotifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showRamaNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 z-50 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-xs font-black uppercase text-slate-900">Alertas Rama Judicial (Tiempo Real)</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {ramaNotifications.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                    {ramaNotifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No hay notificaciones recientes de la Rama Judicial.</p>
                    ) : (
                      ramaNotifications.map(notif => (
                        <div key={notif.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-xs font-black text-slate-900">{notif.title}</span>
                            <span className="text-[10px] text-indigo-600 font-mono font-bold">{notif.date}</span>
                          </div>

                          {notif.despacho && (
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><strong className="text-slate-900">Despacho:</strong> {notif.despacho}</p>
                              <p><strong className="text-slate-900">Radicado:</strong> <span className="font-mono text-indigo-700">{notif.radicado}</span></p>
                              <p><strong className="text-slate-900">Estado:</strong> <span className="text-emerald-700 font-bold">{notif.estado}</span></p>
                            </div>
                          )}

                          {notif.documentos && notif.documentos.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Documentos y Actuaciones Encontradas ({notif.documentos.length}):</span>
                              <div className="space-y-1">
                                {notif.documentos.map((doc: any, dIdx: number) => (
                                  <div key={doc.id || `doc-${dIdx}-${doc.nombre}`} className="bg-white p-2 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                      <span className="font-mono text-[11px] text-slate-800 truncate" title={doc.nombre}>{doc.nombre}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">{doc.fecha}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {notif.message && (
                            <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link 
              to="/dashboard"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 text-xs font-bold transition-all shadow-sm"
              title="Ver Alertas de la Corte Suprema"
            >
              <Scale className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Alertas CSJ</span>
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                3
              </span>
            </Link>
            <button 
              onClick={() => setIsNewExpedienteOpen(true)}
              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 group cursor-pointer"
              title="Crear o incorporar nuevo expediente judicial"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              Nuevo Expediente
            </button>
          </div>
        </header>

        <main className="p-10 flex-1 overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/documents" element={<DocumentManager />} />
            <Route path="/subscription" element={
              <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex items-center justify-center mx-auto text-indigo-600 mb-6">
                    <CreditCard className="w-10 h-10" />
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic">Planes de Suscripción</h1>
                  <p className="text-slate-500 text-sm font-medium italic max-w-lg mx-auto">Active su licencia profesional para acceder a la base de datos completa de la Corte Suprema y Consejo de Estado.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col h-full hover:shadow-2xl hover:border-indigo-100 transition-all group">
                    <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Abogado Junior</h2>
                    <p className="text-slate-500 mb-10 flex-1 font-medium leading-relaxed italic">"Ideal para litigantes independientes que requieren análisis profundo de expedientes individuales."</p>
                    <div className="mb-10">
                      <span className="text-5xl font-black text-slate-900">$120.000</span>
                      <span className="text-slate-400 font-bold uppercase text-[10px] ml-2 tracking-widest">/mes COP</span>
                    </div>
                    <BoldPaymentButton amount={120000} label="Activar Licencia" />
                  </div>
                  <div className="bg-slate-950 p-12 rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] text-white flex flex-col h-full border border-indigo-500/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-[96px]" />
                    <div className="bg-indigo-600 self-start px-5 py-2 rounded-full text-[9px] font-black mb-8 tracking-[0.3em] shadow-2xl shadow-indigo-600/30">PREMIUM FIRM</div>
                    <h2 className="text-xl font-black mb-4 uppercase tracking-tighter">Gran Firma</h2>
                    <p className="text-slate-400 mb-10 flex-1 font-medium leading-relaxed italic">"Gestión centralizada de expedientes, roles de equipo y auditoría de investigación ilimitada."</p>
                    <div className="mb-10">
                      <span className="text-5xl font-black">$450.000</span>
                      <span className="text-slate-500 font-bold uppercase text-[10px] ml-2 tracking-widest">/mes COP</span>
                    </div>
                    <BoldPaymentButton amount={450000} label="Suscripción Corporativa" />
                  </div>
                </div>
              </div>
            } />
            <Route path="/admin" element={user.role === UserRole.ADMIN ? <AdminDashboard /> : <Navigate to="/chat" />} />
            <Route path="/admin/users" element={user.role === UserRole.ADMIN ? <AdminDashboard initialTab="users" /> : <Navigate to="/chat" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <NewExpedienteModal
          isOpen={isNewExpedienteOpen}
          onClose={() => setIsNewExpedienteOpen(false)}
          onComplete={handleExpedienteCreated}
        />
      </div>
    </div>
  );
};

  // El middleware de Next ya garantiza que hay sesión antes de servir esto:
  // si no la hubiera, el usuario nunca llegaría aquí.
  return (
    <HashRouter>
      <Routes>
        <Route path="/*" element={<AuthenticatedApp user={user} />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
