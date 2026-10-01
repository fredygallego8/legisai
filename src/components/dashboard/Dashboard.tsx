import React from 'react';
import { 
  Scale, MessageSquare, FileText, Sparkles, 
  ArrowRight, Shield, BookOpen, Clock, Users,
  TrendingUp, CheckCircle, ExternalLink, BookmarkCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../../types';
import { SupremeCourtAlertsSection } from './SupremeCourtAlertsSection';
import { MonthlyTopicAnalytics } from './MonthlyTopicAnalytics';
import { DashboardMetrics } from './DashboardMetrics';
import { LegalKnowledgeGraph } from './LegalKnowledgeGraph';
import { DocumentVolumeChart } from './DocumentVolumeChart';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleNavigateToChat = (prompt?: string) => {
    if (prompt) {
      navigate('/chat', { state: { initialPrompt: prompt } });
    } else {
      navigate('/chat');
    }
  };

  const currentDate = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-16">
      {/* Saludo y Cabecera del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Jurisprudencia Colombiana Inteligente
            </span>
            <span className="text-xs text-slate-400 capitalize">{currentDate}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Bienvenido, <span className="text-indigo-600">{user.displayName}</span>
          </h1>

          <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
            Monitor de casación unificado, análisis dogmático de Ratio Decidendi y gestión de expedientes judiciales.
          </p>
        </div>

        {/* Atajos Rápidos */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleNavigateToChat()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Nuevo Chat Jurídico</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Métrica / Tarjetas de Estado del Despacho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              Corte Suprema
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">3 Alertas</span>
            <p className="text-xs text-slate-500 font-medium">Nuevas providencias de casación</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Activos
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">4 Temas</span>
            <p className="text-xs text-slate-500 font-medium">Líneas de investigación en seguimiento</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Expedientes
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">12 Procesos</span>
            <p className="text-xs text-slate-500 font-medium">Documentos y providencias indexadas</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3 hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Licencia
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 block">{user.subscription.plan} Member</span>
            <p className="text-xs text-slate-500 font-medium">Relatoría y Casación Ilimitada</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN EXCLUSIVA PARA ADMINISTRADORES: Métricas de Neon DB, Tokens Gemini y Documentos Procesados */}
      {user.role === UserRole.ADMIN && (
        <DashboardMetrics user={user} />
      )}

      {/* SECCIÓN PRINCIPAL: Alertas de la Corte Suprema de Justicia */}
      <SupremeCourtAlertsSection
        onNavigateToChatWithPrompt={handleNavigateToChat}
      />

      {/* COMPONENTE ANALÍTICO: Visualización con Recharts de Frecuencia de Sentencias por Mes */}
      <MonthlyTopicAnalytics />

      {/* SECCIÓN RESUMEN DE ACTUACIONES: Volumen de procesamiento de documentos en los últimos 30 días con Recharts */}
      <DocumentVolumeChart />

      {/* GRAFO DE CONOCIMIENTO D3.JS: Relación Normas Colombianas y Expediente Hipoteca Santa Gema */}
      <LegalKnowledgeGraph />

      {/* Acceso Rápido a Líneas Jurisprudenciales y Precedentes Frecuentes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-8 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Precedentes Judiciales Vinculantes de Consulta Frecuente
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Haga clic para abrir el análisis de Ratio Decidendi en el chat con Gemini
            </p>
          </div>

          <button
            onClick={() => handleNavigateToChat()}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Ver toda la jurisprudencia</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => handleNavigateToChat("Analiza la ratio decidendi de la Sentencia SU-050 de 2022 de la Corte Constitucional frente al fuero de salud y estabilidad laboral reforzada")}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              Corte Constitucional
            </span>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 mt-2">
              Sentencia SU-050 de 2022
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Unificación de estabilidad ocupacional reforzada y carga de solicitar permiso al Ministerio del Trabajo.
            </p>
          </button>

          <button
            onClick={() => handleNavigateToChat("Analiza la ratio decidendi de la Sentencia SL2845-2024 de la Sala de Casación Laboral de la Corte Suprema de Justicia")}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-slate-200 px-2 py-0.5 rounded-md">
              Sala Casación Laboral
            </span>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 mt-2">
              Sentencia SL2845-2024
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Criterio de la Sala Laboral sobre el estándar de afectación sustancial de salud para activar la presunción del art. 26.
            </p>
          </button>

          <button
            onClick={() => handleNavigateToChat("Analiza la jurisprudencia de la Sala de Casación Penal de la Corte Suprema en Sentencia SP2190-2024 sobre prescripción de la acción penal")}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md">
              Sala Casación Penal
            </span>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 mt-2">
              Sentencia SP2190-2024
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Términos de prescripción extraordinaria en delitos contra la administración pública en concurso con particulares.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
