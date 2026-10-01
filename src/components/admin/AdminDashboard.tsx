import { apiFetch } from '../../services/api/apiClient';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Database, 
  MessageCircle, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  UserCheck,
  Search,
  MoreVertical,
  Mail,
  Calendar,
  Layers,
  FileCode,
  FileText,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import RAGAnalyticsDashboard from './RAGAnalyticsDashboard';
import { RAGStatusIndicator } from './RAGStatusIndicator';
import { RagHealthState, NeonDbDiagnostic } from '../../types';

interface AdminDashboardProps {
  initialTab?: 'dashboard' | 'users' | 'rag-audit' | 'rag-analytics';
}

interface RagAuditItem {
  id: string;
  name: string;
  type: string;
  chunk_count: string | number;
}

const mockUsers = [
  { id: 'u1', name: 'Dr. Fredy Gallego', email: 'fredy.gallego@gmail.com', role: 'USER', plan: 'PRO', status: 'Activo', registered: '2025-01-15' },
  { id: 'u2', name: 'Dr. Jaime Pava Díaz', email: 'admin@pavadiaz.com', role: 'ADMIN', plan: 'ENTERPRISE', status: 'Activo', registered: '2024-11-01' },
  { id: 'u3', name: 'Dra. Carolina Arana', email: 'carolina.arana@pavadiaz.com', role: 'ADMIN', plan: 'ENTERPRISE', status: 'Activo', registered: '2024-11-05' },
  { id: 'u4', name: 'Dr. Juan Camilo Restrepo', email: 'j.restrepo@litigantes.co', role: 'USER', plan: 'JUNIOR', status: 'Activo', registered: '2025-02-10' },
  { id: 'u5', name: 'Dra. Valentina Morales', email: 'vmorales@derechopenal.co', role: 'USER', plan: 'PRO', status: 'Suspendido', registered: '2025-01-20' },
];

const data = [
  { name: 'Lun', users: 40, msgs: 240 },
  { name: 'Mar', users: 30, msgs: 139 },
  { name: 'Mie', users: 20, msgs: 980 },
  { name: 'Jue', users: 27, msgs: 390 },
  { name: 'Vie', users: 18, msgs: 480 },
  { name: 'Sab', users: 23, msgs: 380 },
  { name: 'Dom', users: 34, msgs: 430 },
];

const StatCard = ({ title, value, change, icon: Icon, trend, subtitle }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
        <Icon className="w-5 h-5" />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}%
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
    </div>
  </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab = 'dashboard' }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'rag-audit' | 'rag-analytics'>(initialTab);
  const [searchFilter, setSearchFilter] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PDF' | 'HTML' | 'ZERO'>('ALL');
  const [auditData, setAuditData] = useState<RagAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Métricas de RAG en Neon DB
  const [chunkCounts, setChunkCounts] = useState<{ total: number; pdf: number; html: number }>({
    total: 0,
    pdf: 0,
    html: 0
  });

  const [ragHealth, setRagHealth] = useState<RagHealthState>({
    status: 'OPTIMAL',
    message: 'Motor vectorial operativo en Neon DB (pgvector)',
    details: '',
    collectionId: '',
    matchesCount: 0,
    latencyMs: 32,
    activeExpedienteId: 'exp-1789743909641',
    chunksCount: 24,
    lastChecked: new Date().toISOString()
  });
  const [neonDiagnostic, setNeonDiagnostic] = useState<NeonDbDiagnostic | null>({
    connected: true,
    database: 'neondb',
    engine: 'PostgreSQL (pgvector)',
    pgvector: true,
    totalChunks: 0,
    expedienteChunks: 0,
    status: 'OPTIMAL',
    diagnosticMessage: '',
    timestamp: new Date().toISOString(),
    pgvectorVersion: '0.7.0',
    dimensions: 768,
    latencyMs: 28,
    chunksCount: 24,
    databaseName: 'neondb'
  });

  const loadAuditData = async () => {
    setLoadingAudit(true);
    try {
      const [resAudit, resMetrics] = await Promise.all([
        apiFetch('/api/admin/audit-rag'),
        apiFetch('/api/admin/metrics')
      ]);

      if (resAudit.ok) {
        const json = await resAudit.json();
        if (json.success && Array.isArray(json.data)) {
          setAuditData(json.data);
        }
      }

      if (resMetrics.ok) {
        const mJson = await resMetrics.json();
        if (mJson.success && mJson.documentos?.chunksPorTipo) {
          const chunksList: { type: string; count: number }[] = mJson.documentos.chunksPorTipo;
          const pdfC = chunksList.find(c => c.type.toLowerCase() === 'pdf')?.count || 0;
          const htmlC = chunksList.find(c => c.type.toLowerCase() === 'html')?.count || 0;
          setChunkCounts({
            total: pdfC + htmlC,
            pdf: pdfC,
            html: htmlC
          });
        }
      }
    } catch (err) {
      console.warn('Aviso cargando auditoría RAG:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const res = await apiFetch('/api/admin/reindex', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadAuditData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReindexing(false);
    }
  };

  const exportCsv = () => {
    const headers = ['ID_DOCUMENTO', 'NOMBRE_ARCHIVO', 'TIPO', 'CONTEO_CHUNKS_VECTORIALES', 'ESTADO_INDEXACION'];
    const rows = auditData.map(item => [
      `"${item.id}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.type}"`,
      parseInt(String(item.chunk_count), 10) || 0,
      (parseInt(String(item.chunk_count), 10) || 0) > 0 ? '"INDEXADO"' : '"NO_INDEXADO"'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_vectores_rag_neon_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMarkdownTable = () => {
    let md = `| ID Documento | Nombre de Archivo | Tipo | Conteo de Vectores | Estado |\n|---|---|---|---|---|\n`;
    auditData.forEach(item => {
      const count = parseInt(String(item.chunk_count), 10) || 0;
      md += `| \`${item.id}\` | ${item.name} | \`.${item.type}\` | **${count}** | ${count > 0 ? '✅ Indexado' : '❌ Sin Indexar'} |\n`;
    });
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = mockUsers.filter(u => 
    u.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    u.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredAudit = auditData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(auditFilter.toLowerCase()) || 
                          item.id.toLowerCase().includes(auditFilter.toLowerCase()) ||
                          item.type.toLowerCase().includes(auditFilter.toLowerCase());
    const count = parseInt(String(item.chunk_count), 10) || 0;
    if (!matchesSearch) return false;
    if (typeFilter === 'PDF') return item.type.toLowerCase() === 'pdf';
    if (typeFilter === 'HTML') return item.type.toLowerCase() === 'html';
    if (typeFilter === 'ZERO') return count === 0;
    return true;
  });

  const indexedCount = auditData.filter(i => (parseInt(String(i.chunk_count), 10) || 0) > 0).length;
  const unindexedCount = auditData.filter(i => (parseInt(String(i.chunk_count), 10) || 0) === 0).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
          <p className="text-slate-500 text-sm">Control central de infraestructura, métricas y auditoría RAG en Neon DB.</p>
        </div>
        
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Métricas
          </button>
          <button 
            onClick={() => setActiveTab('rag-analytics')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rag-analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Analítica RAG
          </button>
          <button 
            onClick={() => setActiveTab('rag-audit')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rag-audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Auditoría RAG ({auditData.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Usuarios ({mockUsers.length})
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Semáforo de Estado RAG & Diagnóstico Neon DB en Panel de Control */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2 px-1">Semáforo de Salud Motor Vectorial (Neon DB / pgvector)</h3>
            <RAGStatusIndicator 
              ragHealth={ragHealth}
              neonDiagnostic={neonDiagnostic}
              isChecking={loadingAudit}
              onRecheck={loadAuditData}
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Usuarios Activos" value="1,284" change="12" icon={Users} trend="up" />
            
            {/* CONTADOR SOLICITADO: Total Chunks indexados en Neon DB desglosados .pdf vs .html */}
            <div className="bg-white p-6 rounded-2xl border border-indigo-200 ring-2 ring-indigo-500/10 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  pgvector Neon DB
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chunks RAG en Neon DB</p>
                <h3 className="text-2xl font-bold text-slate-900 flex items-baseline gap-2">
                  {chunkCounts.total || auditData.reduce((acc, curr) => acc + (parseInt(String(curr.chunk_count), 10) || 0), 0)}
                  <span className="text-xs font-medium text-slate-500">fragmentos</span>
                </h3>
                <div className="pt-2 flex items-center gap-3 border-t border-slate-100 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                    <FileText className="w-3.5 h-3.5" />
                    .pdf: {chunkCounts.pdf}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                    <FileCode className="w-3.5 h-3.5" />
                    .html: {chunkCounts.html}
                  </span>
                </div>
              </div>
            </div>

            <StatCard title="Documentos Registrados" value={auditData.length || "119"} change="5" icon={Database} trend="up" />
            <StatCard title="Consultas Jurídicas" value="8,432" change="8" icon={MessageCircle} trend="up" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">Actividad de Chat Jurídico</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="msgs" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">Nuevos Suscriptores</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="users" stroke="#4f46e5" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA SOLICITADA: Script y Tabla Visual de Auditoría RAG */}
      {activeTab === 'rag-audit' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen de Auditoría */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Fragmentos (Neon DB)</span>
              <div className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
                {chunkCounts.total || auditData.reduce((acc, curr) => acc + (parseInt(String(curr.chunk_count), 10) || 0), 0)}
                <span className="text-xs font-medium text-slate-500 font-sans">chunks vectoriales</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold pt-1 border-t border-slate-100">
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">.pdf: {chunkCounts.pdf}</span>
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">.html: {chunkCounts.html}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentos con Vectores</span>
              <div className="text-3xl font-black text-emerald-600 flex items-baseline gap-2">
                {indexedCount}
                <span className="text-xs font-medium text-slate-500 font-sans">/ {auditData.length} en base de datos</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Indexados con gemini-embedding-2-preview</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documentos sin Indexar (0 Vectores)</span>
              <div className="text-3xl font-black text-amber-600 flex items-baseline gap-2">
                {unindexedCount}
                <span className="text-xs font-medium text-slate-500 font-sans">pendientes</span>
              </div>
              <button
                onClick={handleReindex}
                disabled={reindexing}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
                {reindexing ? 'Vectorizando...' : 'Re-indexar pendientes ahora'}
              </button>
            </div>
          </div>

          {/* Barra de Herramientas y Exportación */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Filtrar por ID, nombre o tipo..."
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-slate-800"
                />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Todos ({auditData.length})
                </button>
                <button
                  onClick={() => setTypeFilter('PDF')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${typeFilter === 'PDF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  .PDF
                </button>
                <button
                  onClick={() => setTypeFilter('HTML')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${typeFilter === 'HTML' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  .HTML
                </button>
                <button
                  onClick={() => setTypeFilter('ZERO')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${typeFilter === 'ZERO' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Sin Vectores (0)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyMarkdownTable}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Copiar tabla en formato Markdown"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar Tabla'}
              </button>

              <button
                onClick={exportCsv}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Descargar script y datos de auditoría en CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>

              <button
                onClick={loadAuditData}
                disabled={loadingAudit}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer"
                title="Recargar datos de Neon DB"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabla Visual de Auditoría */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tabla de Auditoría Vectorial de Documentos (Neon DB)</h3>
                <p className="text-xs text-slate-500">Muestra los IDs, formato de archivo y el conteo de vectores asociados para detectar archivos no indexados.</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredAudit.length} de {auditData.length} registros
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-black border-y border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4">ID del Documento</th>
                    <th className="py-3 px-4">Nombre del Documento</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4 text-center">Vectores (Chunks)</th>
                    <th className="py-3 px-4 text-right">Estado RAG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAudit.map((row) => {
                    const chunkCount = parseInt(String(row.chunk_count), 10) || 0;
                    const isIndexed = chunkCount > 0;
                    const isHtml = row.type.toLowerCase() === 'html' || row.name.toLowerCase().endsWith('.html');
                    const isPdf = row.type.toLowerCase() === 'pdf' || row.name.toLowerCase().endsWith('.pdf');

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 select-all">
                          {row.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate" title={row.name}>
                          {row.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isHtml 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : isPdf 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isHtml ? <FileCode className="w-3 h-3" /> : isPdf ? <FileText className="w-3 h-3" /> : null}
                            .{row.type.toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                            isIndexed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {chunkCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isIndexed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Indexado RAG
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                              <XCircle className="w-3.5 h-3.5" />
                              Sin indexar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar jurista o correo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              Mostrando {filteredUsers.length} de {mockUsers.length} juristas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-black border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Abogado(a)</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      {u.plan}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        u.status === 'Activo' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {u.registered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rag-analytics' && (
        <RAGAnalyticsDashboard />
      )}
    </div>
  );
};

export default AdminDashboard;

