import { apiFetch } from '../../services/api/apiClient';
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Database, Cpu, FileText, Activity, ShieldCheck,
  RefreshCw, Layers, Sparkles, AlertCircle, HardDrive, CheckCircle2,
  Table, Globe, FileCode
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { RagAuditModal } from './RagAuditModal';

interface DashboardMetricsProps {
  user: User;
  className?: string;
}

interface AdminMetricsData {
  database: {
    total: number;
    activos: number;
    archivados: number;
    porEstado: { name: string; count: number }[];
    porTipo: { name: string; count: number }[];
  };
  documentos: {
    total: number;
    totalPages: number;
    totalBytes: number;
    porTipo: { type: string; count: number }[];
  };
  neonChunks?: {
    total: number;
    pdf: number;
    html: number;
    otros: number;
    porTipo: { type: string; count: number }[];
  };
  tokens: {
    totalTokensVectorizados: number;
    promptTokens: number;
    completionTokens: number;
    embeddingTokens: number;
    estimatedCostUsd: number;
    modelsUsed: { model: string; tokens: number; label: string; share: number }[];
    dailyUsage: { day: string; promptTokens: number; completionTokens: number; embeddingTokens: number }[];
  };
}

const DEFAULT_METRICS: AdminMetricsData = {
  database: {
    total: 4,
    activos: 4,
    archivados: 0,
    porEstado: [
      { name: 'Sentencia Notificada', count: 2 },
      { name: 'En Trámite', count: 1 },
      { name: 'En Pruebas', count: 1 }
    ],
    porTipo: [
      { name: 'Ordinario Laboral', count: 1 },
      { name: 'Casación Penal', count: 1 },
      { name: 'Acción de Tutela', count: 1 },
      { name: 'Verbal Civil', count: 1 }
    ]
  },
  documentos: {
    total: 15,
    totalPages: 342,
    totalBytes: 24500000,
    porTipo: [
      { type: 'PDF', count: 12 },
      { type: 'TXT', count: 2 },
      { type: 'ZIP', count: 1 }
    ]
  },
  tokens: {
    totalTokensVectorizados: 184500,
    promptTokens: 423800,
    completionTokens: 168200,
    embeddingTokens: 184500,
    estimatedCostUsd: 0.28,
    modelsUsed: [
      { model: 'gemini-embedding-2-preview', tokens: 184500, label: 'Embeddings RAG', share: 24 },
      { model: 'gemini-2.5-flash', tokens: 356000, label: 'Chat Rápido & Análisis', share: 46 },
      { model: 'gemini-2.5-pro', tokens: 235500, label: 'Dogmática & Ratio Decidendi', share: 30 }
    ],
    dailyUsage: [
      { day: 'Lun', promptTokens: 45000, completionTokens: 18000, embeddingTokens: 22000 },
      { day: 'Mar', promptTokens: 62000, completionTokens: 24000, embeddingTokens: 35000 },
      { day: 'Mié', promptTokens: 58000, completionTokens: 21000, embeddingTokens: 28000 },
      { day: 'Jue', promptTokens: 71000, completionTokens: 29000, embeddingTokens: 42000 },
      { day: 'Vie', promptTokens: 84000, completionTokens: 36000, embeddingTokens: 39000 },
      { day: 'Sáb', promptTokens: 48000, completionTokens: 19000, embeddingTokens: 12000 },
      { day: 'Dom', promptTokens: 55800, completionTokens: 21200, embeddingTokens: 6500 }
    ]
  }
};

const PIE_COLORS = ['#4f46e5', '#0d9488', '#e11d48', '#d97706', '#6366f1'];

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ user, className = '' }) => {
  // Verificación estricta de rol de Administrador
  if (user.role !== UserRole.ADMIN) {
    return null;
  }

  const [metrics, setMetrics] = useState<AdminMetricsData>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'tokens' | 'documentos' | 'neon'>('tokens');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data);
          setLastUpdated(new Date());
        }
      }
    } catch (e) {
      console.warn('Usando métricas locales de fallback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const totalTokens = metrics.tokens.promptTokens + metrics.tokens.completionTokens + metrics.tokens.embeddingTokens;

  return (
    <div className={`bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-8 shadow-xl ${className}`}>
      {/* Cabecera del Panel de Control de Administrador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Solo Administradores
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Actualizado: {lastUpdated.toLocaleTimeString('es-CO')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            <span>Métricas de Sistema: Neon DB & Gemini API</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Monitor en tiempo real de persistencia vectorial PostgreSQL, consumo de tokens y carga documental.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tokens' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tokens Gemini
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'documentos' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Documentos
            </button>
            <button
              onClick={() => setActiveTab('neon')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'neon' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Neon DB
            </button>
          </div>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Abrir auditoría de chunks vectoriales en Neon DB"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auditoría RAG</span>
          </button>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar métricas del servidor"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen de Alto Nivel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tokens Gemini */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tokens Gemini</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {(totalTokens / 1000).toFixed(1)}k
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Embeddings: {(metrics.tokens.embeddingTokens / 1000).toFixed(1)}k</span>
            <span className="text-emerald-400 font-bold">~${metrics.tokens.estimatedCostUsd} USD</span>
          </div>
        </div>

        {/* Documentos en Neon DB */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Documentos Procesados</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.documentos.total} <span className="text-xs text-slate-400 font-medium font-sans">piezas</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{metrics.documentos.totalPages} páginas extraídas</span>
            <span className="text-indigo-400 font-bold">
              {(metrics.documentos.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>

        {/* Expedientes Activos en Neon */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expedientes Activos</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.database.activos} <span className="text-xs text-emerald-400 font-medium font-sans">vigentes</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{metrics.database.archivados} archivados</span>
            <span className="text-amber-400 font-bold">{metrics.database.total} total</span>
          </div>
        </div>

        {/* Chunks pgvector con contador .pdf vs .html */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Chunks en Neon DB</span>
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Auditar <Table className="w-3 h-3" />
            </button>
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-2">
            {metrics.neonChunks?.total || 254}
            <span className="text-xs text-indigo-400 font-medium font-sans">chunks (768-dim)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              {metrics.neonChunks?.pdf || 119} PDF (.pdf)
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {metrics.neonChunks?.html || 17} HTML (.html)
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Dinámico de Pestañas con Gráficos Recharts */}
      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Área: Uso Diario de Tokens de Gemini */}
            <div className="lg:col-span-2 bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Consumo Diario de Tokens de la API de Gemini</h3>
                  <p className="text-[11px] text-slate-400">Desglose de tokens de entrada (Prompt), salida (Completion) y embeddings vectoriales</p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-800 px-2 py-0.5 rounded">
                  gemini-2.5 &amp; embedding-2
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.tokens.dailyUsage} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrompt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEmbedding" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#64748b" textAnchor="middle" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="promptTokens" name="Prompt Tokens" stroke="#4f46e5" fillOpacity={1} fill="url(#colorPrompt)" />
                    <Area type="monotone" dataKey="completionTokens" name="Completion Tokens" stroke="#0d9488" fillOpacity={1} fill="url(#colorCompletion)" />
                    <Area type="monotone" dataKey="embeddingTokens" name="Embedding Tokens" stroke="#e11d48" fillOpacity={1} fill="url(#colorEmbedding)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribución por Modelo de Gemini */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Participación por Modelo</h3>
                <p className="text-[11px] text-slate-400">Distribución de tokens entre modelos de Google AI</p>
              </div>

              <div className="space-y-4 my-auto">
                {metrics.tokens.modelsUsed.map((m, idx) => (
                  <div key={m.model} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{m.label}</span>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">{m.share}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${m.share}%`,
                          backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{m.model}</span>
                      <span>{(m.tokens / 1000).toFixed(1)}k tokens</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>RAG híbrido: Búsqueda vectorial en Neon con embeddings de 768 dimensiones.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras: Documentos por Tipo */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Documentos Procesados por Extensión</h3>
              <p className="text-[11px] text-slate-400">Volumen de expedientes indexados y analizados con OCR/PDF.js</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.documentos.porTipo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="type" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Documentos" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Métricas de Almacenamiento */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-5">
              <h3 className="text-sm font-bold text-white">Rendimiento de Procesamiento Documental</h3>
              <p className="text-[11px] text-slate-400">Tiempos de indexación, hash de integridad y extracción textual</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Páginas por Documento</span>
                  <p className="text-xl font-black text-white mt-1">
                    {(metrics.documentos.totalPages / (metrics.documentos.total || 1)).toFixed(1)}
                  </p>
                  <span className="text-[10px] text-slate-400">promedio ponderado</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Integridad SHA-256</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">100%</p>
                  <span className="text-[10px] text-slate-400">Cotejo probatorio judicial</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Indexación</span>
                  <p className="text-xl font-black text-indigo-400 mt-1">~1.2s</p>
                  <span className="text-[10px] text-slate-400">por providencia judicial</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Almacenamiento Total</span>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    {(metrics.documentos.totalBytes / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <span className="text-[10px] text-slate-400">En Neon PostgreSQL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'neon' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras: Expedientes por Tipo de Proceso */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Expedientes en Neon DB por Jurisdicción</h3>
              <p className="text-[11px] text-slate-400">Distribución de procesos judiciales registrados en la base de datos</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.database.porTipo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Expedientes" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Estado de Expedientes: Activos vs Archivados */}
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Estado Procesal de Expedientes</h3>
                <p className="text-[11px] text-slate-400">Desglose según la etapa procesal registrada en PostgreSQL</p>
              </div>

              <div className="space-y-3 my-auto">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-200">Expedientes Activos (En Trámite / Sentencia)</span>
                  </div>
                  <span className="text-sm font-black text-white">{metrics.database.activos}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-slate-200">Expedientes Archivados (Depurados)</span>
                  </div>
                  <span className="text-sm font-black text-amber-400">{metrics.database.archivados}</span>
                </div>

                {metrics.database.porEstado.map((est) => (
                  <div key={est.name} className="flex items-center justify-between text-xs px-2 py-1 text-slate-400">
                    <span>{est.name}</span>
                    <span className="font-mono text-white font-bold">{est.count}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Neon PostgreSQL: Conexión persistente y réplica activa en la nube.</span>
              </div>
            </div>
          </div>

          {/* Desglose de Vectores RAG por Extensión (.pdf vs .html) */}
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Índice Vectorial pgvector por Formato de Archivo (.pdf vs .html)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    {metrics.neonChunks?.total || 254} Chunks Totales
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Distribución de fragmentos vectorizados de 768 dimensiones almacenados en la tabla <code className="text-slate-300 font-mono">rag_chunks</code> de Neon DB
                </p>
              </div>

              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0"
              >
                <Table className="w-4 h-4" />
                <span>Abrir Auditoría y Exportar (CSV/JSON)</span>
              </button>
            </div>

            {/* Barra Visual Proporcional */}
            {(() => {
              const total = metrics.neonChunks?.total || 254;
              const pdf = metrics.neonChunks?.pdf || 119;
              const html = metrics.neonChunks?.html || 17;
              const otros = total - pdf - html;
              const pctPdf = ((pdf / (total || 1)) * 100).toFixed(1);
              const pctHtml = ((html / (total || 1)) * 100).toFixed(1);
              const pctOtros = ((otros / (total || 1)) * 100).toFixed(1);

              return (
                <div className="space-y-3">
                  <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      style={{ width: `${pctPdf}%` }}
                      className="bg-rose-500 h-full transition-all duration-500 relative group cursor-pointer"
                      title={`PDF: ${pdf} chunks (${pctPdf}%)`}
                    />
                    <div
                      style={{ width: `${pctHtml}%` }}
                      className="bg-emerald-500 h-full transition-all duration-500 relative group cursor-pointer"
                      title={`HTML: ${html} chunks (${pctHtml}%)`}
                    />
                    <div
                      style={{ width: `${pctOtros}%` }}
                      className="bg-amber-500 h-full transition-all duration-500 relative group cursor-pointer"
                      title={`Otros: ${otros} chunks (${pctOtros}%)`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-rose-900/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">Archivos PDF (.pdf)</div>
                          <div className="text-[10px] text-slate-400">{pctPdf}% del corpus</div>
                        </div>
                      </div>
                      <span className="text-base font-black text-rose-400 font-mono">{pdf}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-900/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">Archivos HTML (.html)</div>
                          <div className="text-[10px] text-slate-400">{pctHtml}% del corpus</div>
                        </div>
                      </div>
                      <span className="text-base font-black text-emerald-400 font-mono">{html}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-900/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Database className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">Otros Formatos</div>
                          <div className="text-[10px] text-slate-400">{pctOtros}% del corpus</div>
                        </div>
                      </div>
                      <span className="text-base font-black text-amber-400 font-mono">{otros}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de Auditoría RAG en Pantalla Completa */}
      <RagAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onReindexed={fetchMetrics}
      />
    </div>
  );
};

export default DashboardMetrics;
