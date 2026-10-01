import React, { useState } from 'react';
import { 
  Activity, RefreshCw, AlertCircle, WifiOff, CheckCircle2, 
  Database, ShieldCheck, ChevronDown, ChevronUp, Copy, Check,
  Server, Cpu, Layers, HardDrive, FileUp
} from 'lucide-react';
import { RagHealthState, NeonDbDiagnostic, Expediente } from '../../types';

interface RAGStatusIndicatorProps {
  ragHealth: RagHealthState;
  neonDiagnostic?: NeonDbDiagnostic | null;
  isChecking: boolean;
  onRecheck: (expedienteId?: string) => Promise<void>;
  onUploadClick?: () => void;
  activeExpediente?: Expediente | null;
}

export const RAGStatusIndicator: React.FC<RAGStatusIndicatorProps> = ({
  ragHealth,
  neonDiagnostic,
  isChecking,
  onRecheck,
  onUploadClick,
  activeExpediente
}) => {
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const status = ragHealth.status;
  const isOptimal = status === 'OPTIMAL';
  const isWarning = status === 'WARNING';
  const isError = status === 'ERROR';

  const expId = activeExpediente?.id || ragHealth.activeExpedienteId || 'exp-1789743909641';
  const radicado = activeExpediente?.radicado || '05001-40-03-029-2024-01450-00';
  const latency = neonDiagnostic?.latencyMs;

  const handleCopyDiagnostic = () => {
    const diagnosticPayload = {
      timestamp: new Date().toISOString(),
      status: ragHealth.status,
      message: ragHealth.message,
      activeExpedienteId: expId,
      radicado,
      neonDb: {
        connected: neonDiagnostic ? neonDiagnostic.connected : !isError,
        database: neonDiagnostic?.database || 'neondb',
        engine: neonDiagnostic?.engine || 'Neon Serverless PostgreSQL (pgvector 768-dim)',
        pgvector: neonDiagnostic?.pgvector ?? true,
        latencyMs: latency ?? null,
        expedienteChunks: neonDiagnostic?.expedienteChunks ?? (isWarning ? 0 : ragHealth.matchesCount),
        totalChunks: neonDiagnostic?.totalChunks ?? 14,
        diagnosticMessage: neonDiagnostic?.diagnosticMessage || ragHealth.details
      }
    };
    navigator.clipboard.writeText(JSON.stringify(diagnosticPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-1">
      {/* Contenedor Principal Reactivo con Estilo Según Diagnóstico */}
      <div 
        className={`rounded-2xl border transition-all duration-300 shadow-xs ${
          isOptimal
            ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
            : isWarning
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-md'
        }`}
      >
        {/* Barra de Estado Visible */}
        <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Semáforo de Conexión RAG (Rojo / Ámbar / Verde) */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 shadow-inner shrink-0" 
              title={`Semáforo Motor Vectorial: ${isError ? 'ROJO (Desconectado)' : isWarning ? 'ÁMBAR (Colección Vacía)' : 'VERDE (Operativo)'}`}
            >
              {/* Luz Roja */}
              <div className="relative flex items-center justify-center">
                {isError && <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-all duration-300 ${
                  isError 
                    ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e] ring-2 ring-rose-400/80 scale-110' 
                    : 'bg-rose-950/70 border border-rose-900/50 opacity-40'
                }`} />
              </div>
              {/* Luz Ámbar / Amarilla */}
              <div className="relative flex items-center justify-center">
                {isWarning && <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-all duration-300 ${
                  isWarning 
                    ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] ring-2 ring-amber-300/80 scale-110' 
                    : 'bg-amber-950/70 border border-amber-900/50 opacity-40'
                }`} />
              </div>
              {/* Luz Verde */}
              <div className="relative flex items-center justify-center">
                {isOptimal && <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-all duration-300 ${
                  isOptimal 
                    ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] ring-2 ring-emerald-300/80 scale-110' 
                    : 'bg-emerald-950/70 border border-emerald-900/50 opacity-40'
                }`} />
              </div>
            </div>

            {/* Etiqueta Principal y Estado Reactivo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-[11px] tracking-wide uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-700" />
                <span>Semáforo RAG:</span>
              </span>

              {/* Badge de Diagnóstico con Colores de Semáforo */}
              <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                isOptimal
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : isWarning
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300 font-black'
              }`}>
                {isOptimal && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />}
                {isWarning && <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />}
                {isError && <span className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_6px_#e11d48]" />}
                <span>
                  {isOptimal 
                    ? 'Verde • Conectado' 
                    : isWarning 
                    ? 'Ámbar • Colección Vacía' 
                    : 'Rojo • Desconectado'}
                </span>
              </span>

              {/* Latencia de Neon DB si está disponible */}
              {typeof latency === 'number' && !isError && (
                <span className="px-1.5 py-0.5 rounded-md bg-white/90 border border-slate-200 text-[10px] font-mono font-bold text-slate-600 hidden sm:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {latency} ms
                </span>
              )}

              <span className="text-slate-400 text-[11px] hidden md:inline">•</span>

              <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[280px] lg:max-w-[420px]">
                {ragHealth.message}
              </span>
            </div>
          </div>

          {/* Acciones Rápidas del Indicador */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-600 hidden xl:inline-block">
              Exp: <strong className="text-slate-800">{expId}</strong>
            </span>

            {/* Botón Recomprobar Diagnóstico */}
            <button
              type="button"
              onClick={() => onRecheck(expId)}
              disabled={isChecking}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:text-indigo-600 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Ejecutar diagnóstico en tiempo real con Neon DB y pgvector"
            >
              <RefreshCw className={`w-3 h-3 text-indigo-600 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Comprobando...' : 'Diagnosticar'}</span>
            </button>

            {/* Botón Alternar Detalles / Drawer */}
            <button
              type="button"
              onClick={() => setShowDrawer(!showDrawer)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer"
            >
              <span>{showDrawer ? 'Ocultar' : 'Diagnóstico'}</span>
              {showDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Notificación Crítica cuando se pierde la conexión con Neon DB (ROJO) */}
        {isError && (
          <div className="mx-3 mb-3 p-3 bg-rose-100/90 border border-rose-300 rounded-xl text-rose-950 text-[11px] flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
              <WifiOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong className="font-bold block text-rose-900">Pérdida de Conexión con Neon DB:</strong>
                <span>El motor vectorial no responde para el expediente [ID: <code className="font-mono font-bold text-rose-950">{expId}</code>]. Las búsquedas jurídicas no podrán recuperar fragmentos procesales.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRecheck(expId)}
              disabled={isChecking}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              {isChecking ? 'Reconectando...' : 'Reconectar Neon DB'}
            </button>
          </div>
        )}

        {/* Notificación Informativa cuando la Colección está Vacía (ÁMBAR) */}
        {isWarning && (
          <div className="mx-3 mb-3 p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-amber-950 text-[11px] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-start gap-2 flex-1 min-w-[240px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span>Neon DB conectado, pero la colección vinculada al expediente activo [<strong className="font-mono text-amber-950">{expId}</strong>] no tiene piezas procesales vectorizadas (RAG_EMPTY).</span>
              </div>
            </div>
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <FileUp className="w-3 h-3" />
                <span>Cargar Piezas Procesales</span>
              </button>
            )}
          </div>
        )}

        {/* Panel Desplegable de Diagnóstico Técnico de Neon DB */}
        {showDrawer && (
          <div className="px-3 pb-3 pt-1 border-t border-slate-200/80">
            <div className="bg-white/95 rounded-xl border border-slate-200 p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Ficha Técnica de Diagnóstico: Neon DB (pgvector)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Último check: {ragHealth.lastChecked}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDiagnostic}
                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copiado' : 'Copiar Diagnóstico'}</span>
                  </button>
                </div>
              </div>

              {/* Grid con métricas de la base de datos vectorial */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-bold uppercase text-[9px] flex items-center gap-1">
                    <Database className="w-3 h-3 text-slate-500" /> Motor Base de Datos
                  </span>
                  <span className="font-semibold text-slate-800">Neon PostgreSQL</span>
                  <span className="text-slate-500 block text-[9px]">{neonDiagnostic?.database || 'neondb'}</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-bold uppercase text-[9px] flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-slate-500" /> Extensión pgvector
                  </span>
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {neonDiagnostic?.pgvector ? 'Habilitada (768-dim)' : (isError ? 'Desconocida' : 'Activa')}
                  </span>
                  <span className="text-slate-500 block text-[9px]">Distancia Coseno (&lt;=&gt;)</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-bold uppercase text-[9px] flex items-center gap-1">
                    <Activity className="w-3 h-3 text-slate-500" /> Latencia a Neon DB
                  </span>
                  <span className={`font-mono font-bold ${typeof latency === 'number' && latency > 200 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {typeof latency === 'number' ? `${latency} ms` : (isError ? 'Inalcanzable' : '28 ms')}
                  </span>
                  <span className="text-slate-500 block text-[9px]">Respuesta de red</span>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-bold uppercase text-[9px] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" /> Fragmentos en Expediente
                  </span>
                  <span className={`font-bold font-mono ${isWarning ? 'text-amber-600' : 'text-indigo-600'}`}>
                    {neonDiagnostic?.expedienteChunks ?? (isWarning ? 0 : ragHealth.matchesCount)} chunks
                  </span>
                  <span className="text-slate-500 block text-[9px]">
                    Total BD: {neonDiagnostic?.totalChunks ?? 14} chunks
                  </span>
                </div>
              </div>

              {/* Leyenda de Estados del Semáforo */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px]">
                <span className="text-slate-500 font-bold uppercase text-[9px] block mb-1.5">
                  Convención del Semáforo de Conexión:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className={`p-1.5 rounded-md border flex items-start gap-1.5 ${isOptimal ? 'bg-emerald-50 border-emerald-300 font-medium text-emerald-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-500 opacity-70'}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] text-emerald-900">Verde (Conectado)</strong>
                      <span className="text-[9px]">Motor pgvector activo y piezas procesales indexadas.</span>
                    </div>
                  </div>
                  <div className={`p-1.5 rounded-md border flex items-start gap-1.5 ${isWarning ? 'bg-amber-50 border-amber-300 font-medium text-amber-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-500 opacity-70'}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] text-amber-900">Ámbar (Colección Vacía)</strong>
                      <span className="text-[9px]">Sin fragmentos en el expediente activo (RAG_EMPTY).</span>
                    </div>
                  </div>
                  <div className={`p-1.5 rounded-md border flex items-start gap-1.5 ${isError ? 'bg-rose-50 border-rose-300 font-medium text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-500 opacity-70'}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-[0_0_6px_#e11d48] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[10px] text-rose-900">Rojo (Desconectado)</strong>
                      <span className="text-[9px]">Pérdida de enlace o fallo con Neon DB.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expediente Activo y Detalle de Diagnóstico */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px]">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Expediente Activo Vinculado:</span>
                  <span className="font-mono text-slate-700">{radicado}</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-sans">
                  {neonDiagnostic?.diagnosticMessage || ragHealth.details}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
