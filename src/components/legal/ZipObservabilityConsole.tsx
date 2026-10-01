import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Activity, 
  Download,
  Filter,
  Search,
  ShieldAlert,
  ArrowDownCircle,
  Gauge
} from 'lucide-react';
import { ObservabilityLogEntry, ZipExtractionMetrics, formatBytes } from '../../services/zip/zipExtractionService';

interface ZipObservabilityConsoleProps {
  logs: ObservabilityLogEntry[];
  metrics: ZipExtractionMetrics | null;
  isProcessing: boolean;
  onClearLogs?: () => void;
  defaultExpanded?: boolean;
}

export const ZipObservabilityConsole: React.FC<ZipObservabilityConsoleProps> = ({
  logs,
  metrics,
  isProcessing,
  onClearLogs,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ERRORS' | 'WARNS' | 'SUCCESS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al recibir nuevos registros de log si autoScroll está activo
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Si comienza a procesar, expandir la consola automáticamente para dar máxima visibilidad
  useEffect(() => {
    if (isProcessing) {
      setIsExpanded(true);
    }
  }, [isProcessing]);

  const filteredLogs = logs.filter(log => {
    if (activeFilter === 'ERRORS' && log.level !== 'ERROR') return false;
    if (activeFilter === 'WARNS' && log.level !== 'WARN') return false;
    if (activeFilter === 'SUCCESS' && log.level !== 'SUCCESS') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q) || false;
      const matchFile = log.fileTarget?.toLowerCase().includes(q) || false;
      return matchMsg || matchDetails || matchFile;
    }
    return true;
  });

  const handleCopyLogs = async () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        l =>
          `[${l.timestamp}] [${l.level.padEnd(7)}] [${l.phase}] ${l.message}${
            l.details ? ` -> ${l.details}` : ''
          }`
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Error al copiar registros:', e);
    }
  };

  const handleDownloadLogFile = () => {
    if (logs.length === 0) return;
    const text = `REGISTRO DE OBSERVABILIDAD Y AUDITORÍA DE EXTRACCIÓN ZIP • LEGISAI COLOMBIA
Generado el: ${new Date().toISOString()}
Total Eventos: ${logs.length}
Salud de Paquete: ${metrics?.healthScore ?? 'N/A'}%
================================================================================
${logs
  .map(
    l =>
      `[${l.timestamp}] [${l.level.padEnd(7)}] [${l.phase}] ${l.message}${
        l.details ? `\n   Detalle: ${l.details}` : ''
      }${l.fileTarget ? `\n   Objetivo: ${l.fileTarget}` : ''}`
  )
  .join('\n')}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_zip_${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warnCount = logs.filter(l => l.level === 'WARN').length;
  const successCount = logs.filter(l => l.level === 'SUCCESS').length;

  return (
    <div className="border border-slate-800 bg-slate-950 rounded-2xl shadow-xl overflow-hidden text-slate-200 transition-all font-sans">
      {/* Cabecera de la Consola de Observabilidad */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div 
          onClick={() => setIsExpanded(prev => !prev)}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white group-hover:text-indigo-300 transition-colors">
                Consola de Observabilidad y Auditoría Técnica
              </span>
              {isProcessing && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  STREAMING ACTIVO
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Telemetría en tiempo real, integridad de bloques y tolerancia a fallos
            </p>
          </div>
        </div>

        {/* Resumen rápido de métricas e interacción */}
        <div className="flex items-center gap-2 flex-wrap">
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <XCircle className="w-3 h-3 text-rose-400" />
              {errorCount} {errorCount === 1 ? 'error' : 'errores'}
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {warnCount} adv.
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
            {logs.length} eventos
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900/50 transition-all cursor-pointer ml-1"
          >
            {isExpanded ? 'Ocultar Consola' : 'Ver Detalles'}
          </button>
        </div>
      </div>

      {/* Franja de Métricas Rápidas (siempre visible o si hay métricas) */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-900/60 border-b border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            <Gauge className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Salud Paquete</div>
              <div className={`font-black ${metrics.healthScore >= 90 ? 'text-emerald-400' : metrics.healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                {metrics.healthScore}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Válidos</div>
              <div className="font-black text-white">{metrics.validDocuments} docs</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avisos / Omitidos</div>
              <div className="font-black text-amber-300">{metrics.warningEntries + metrics.omittedSystemEntries}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tiempo Descomp.</div>
              <div className="font-black text-cyan-300">{metrics.decompressionTimeMs} ms</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
            <Download className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Volumen Total</div>
              <div className="font-black text-purple-300">{formatBytes(metrics.totalBytes)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cuerpo Expandible de la Consola */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3">
          {/* Barra de Filtros y Acciones */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('ERRORS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeFilter === 'ERRORS'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-rose-300 border border-slate-800'
                }`}
              >
                Errores ({errorCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('WARNS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeFilter === 'WARNS'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-amber-300 border border-slate-800'
                }`}
              >
                Advertencias ({warnCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('SUCCESS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeFilter === 'SUCCESS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-emerald-300 border border-slate-800'
                }`}
              >
                Éxitos ({successCount})
              </button>
            </div>

            {/* Búsqueda dentro del log y utilidades */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filtrar eventos..."
                  className="pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs outline-none focus:border-indigo-500 w-36 sm:w-44 font-mono text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={() => setAutoScroll(prev => !prev)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  autoScroll
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
                    : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
                title={autoScroll ? 'Desplazamiento automático activado' : 'Activar auto-scroll'}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                title="Copiar registro de auditoría completo"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadLogFile}
                disabled={logs.length === 0}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] transition-all cursor-pointer disabled:opacity-40"
                title="Descargar archivo de auditoría (.log)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  disabled={logs.length === 0 || isProcessing}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-500 hover:text-rose-400 text-[11px] transition-all cursor-pointer disabled:opacity-40"
                  title="Limpiar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ventana de salida del Log Terminal */}
          <div
            ref={logContainerRef}
            className="bg-black/90 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed border border-slate-900 space-y-1.5 custom-scrollbar select-text"
          >
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-sans text-xs">
                {logs.length === 0
                  ? 'Esperando carga de archivo ZIP para iniciar telemetría...'
                  : 'No hay eventos que coincidan con los filtros seleccionados.'}
              </div>
            ) : (
              filteredLogs.map(log => {
                let badgeColor = 'bg-slate-800 text-slate-300';
                let icon = <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />;
                let textColor = 'text-slate-300';

                if (log.level === 'ERROR') {
                  badgeColor = 'bg-rose-950/80 text-rose-300 border border-rose-800/40';
                  icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />;
                  textColor = 'text-rose-200';
                } else if (log.level === 'WARN') {
                  badgeColor = 'bg-amber-950/80 text-amber-300 border border-amber-800/40';
                  icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
                  textColor = 'text-amber-200';
                } else if (log.level === 'SUCCESS') {
                  badgeColor = 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40';
                  icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
                  textColor = 'text-emerald-200';
                } else if (log.level === 'PROCESS') {
                  badgeColor = 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/40';
                  icon = <Activity className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />;
                  textColor = 'text-indigo-200';
                }

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 py-0.5 px-1 rounded hover:bg-white/5 transition-colors group/item"
                  >
                    <span className="text-[10px] text-slate-500 select-none shrink-0 font-mono">
                      {log.timestamp}
                    </span>
                    {icon}
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 select-none ${badgeColor}`}
                    >
                      {log.phase}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={`${textColor} break-words font-medium`}>
                        {log.message}
                      </span>
                      {log.details && (
                        <div className="text-[10px] text-slate-400 pl-2 border-l border-slate-800 mt-0.5 break-words">
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
