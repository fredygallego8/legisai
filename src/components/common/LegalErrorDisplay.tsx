
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  CheckCircle, 
  Copy, 
  RotateCcw, 
  Info,
  Lightbulb,
  ArrowRight,
  Database
} from 'lucide-react';
import { AppError } from '../../types';

interface LegalErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onClear?: () => void;
  compact?: boolean;
}

export const LegalErrorDisplay: React.FC<LegalErrorDisplayProps> = ({ error, onRetry, onClear, compact = false }) => {
  const [showTechnical, setShowTechnical] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTechnical = () => {
    const text = `Error LegisAI\nCode: ${error.code}\nComponent: ${error.component}\nColección Afectada: ${error.targetCollection || 'No especificada'} (${error.collectionId || 'N/A'})\nMessage: ${error.message}\nTrace: ${error.technicalInfo}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getResolutionSteps = (code: string, targetCollection?: string, collectionId?: string) => {
    if (code === 'LGS_RAG_INDICE_VACIO' || code === 'RAG_EMPTY') {
      const collIdLower = (collectionId || '').toLowerCase();
      const collNameLower = (targetCollection || '').toLowerCase();

      if (collIdLower.includes('jurisprudencia') || collNameLower.includes('jurisprudencia') || collNameLower.includes('normas')) {
        return [
          'Verificar la disponibilidad del repositorio normativo y de Altas Cortes en Neon DB.',
          'Reformular la consulta citando los artículos específicos (ej. Art. 461 CGP, Art. 2432 Código Civil).',
          'Sincronizar la base de precedentes y jurisprudencia desde el panel de Auditoría RAG.',
          'Alternar temporalmente al modo "Caso / Expediente Actual" si desea consultar piezas procesales activas.'
        ];
      }

      if (collIdLower.includes('session') || collNameLower.includes('adjunto')) {
        return [
          'Comprobar que los archivos adjuntos en la sesión contengan texto digital seleccionable.',
          'Si los documentos son escaneos de providencias físicas, procesarlos con OCR previo a la carga.',
          'Verificar que los archivos no superen el límite de 25 MB ni se encuentren protegidos con clave.',
          'Adjuntar nuevamente el archivo y esperar a que el indicador de carga finalice.'
        ];
      }

      // Si es un expediente judicial específico
      return [
        `Acceder al expediente digital correspondiente ("${targetCollection || 'Expediente Activo'}").`,
        'Cargar las piezas procesales del caso (demanda, auto admisorio/mandamiento, memoriales o sentencias) desde el botón (+).',
        'Verificar en el panel de Auditoría RAG que los archivos figuren como "INDEXADO" en pgvector.',
        'Reintentar la consulta jurídica para que el modelo elabore el concepto con fundamento en las piezas procesales.'
      ];
    }

    switch (code) {
      case 'LGS_RAG_CONTEXTO_DIFUSO':
        return [
          'Añada detalles específicos (ej: nombres de partes, números de radicado).',
          'Asegúrese de que el documento relevante esté cargado en la sesión.',
          'Intente usar terminología técnica jurídica en lugar de lenguaje coloquial.'
        ];
      case 'LGS_FILE_PROTECTED':
        return [
          'Abra el archivo en su visor de PDF.',
          'Use la opción "Guardar como PDF" o "Imprimir como PDF" para quitar el cifrado.',
          'Cargue la nueva versión del archivo sin protección.'
        ];
      default:
        return [
          'Verifique su conexión a internet o a la red del despacho.',
          'Refresque la página si el error persiste.',
          'Contacte a soporte técnico si la falla se repite con distintos archivos.'
        ];
    }
  };

  if (compact) {
    return (
      <div className="group relative flex items-center gap-3 bg-rose-50 px-3 py-2.5 rounded-2xl border border-rose-100 shadow-sm transition-all hover:shadow-md hover:border-rose-200">
        <div className="w-8 h-8 rounded-xl bg-white border border-rose-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="block text-[10px] font-black text-rose-800 leading-none truncate uppercase tracking-tighter">
            {error.code}
          </span>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-1 text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reintentar
            </button>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none border border-slate-700">
          <p className="text-[11px] font-medium leading-relaxed text-slate-300 italic mb-2">"{error.message}"</p>
          <p className="text-[10px] text-emerald-400 font-bold leading-normal uppercase tracking-widest">{error.suggestion}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full bg-white border border-rose-200 rounded-[3rem] p-10 space-y-8 shadow-2xl border-l-[16px] border-l-rose-500 animate-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
        <AlertTriangle className="w-64 h-64 text-rose-950 rotate-12" />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-5 text-rose-600">
          <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 flex items-center justify-center shadow-inner border border-rose-100">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-2 opacity-60">Protocolo de Interrupción Jurídica</span>
            <span className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              Módulo {error.component}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-black text-rose-500/40 uppercase tracking-[0.2em] block">{error.timestamp.split('T')[1].slice(0, 8)} UTC</span>
          <span className="text-[12px] font-bold text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 uppercase mt-2 inline-block shadow-sm">{error.code}</span>
        </div>
      </div>
      
      {/* Identificación de la Colección de Conocimiento Afectada */}
      {error.targetCollection && (
        <div className="p-5 bg-rose-50/80 border border-rose-200/90 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 leading-none mb-1.5">
                Colección de Conocimiento Afectada (RAG)
              </span>
              <h5 className="text-sm font-black text-slate-900 leading-tight">
                {error.targetCollection}
              </h5>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
            {error.collectionId && (
              <div className="text-left sm:text-right">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Colección ID</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-white border border-rose-200 text-rose-800 rounded-xl inline-block shadow-sm">
                  {error.collectionId}
                </span>
              </div>
            )}
            {error.activeExpedienteId && (
              <div className="text-left sm:text-right">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Expediente Activo ID</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl inline-block shadow-sm">
                  {error.activeExpedienteId}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 relative z-10">
        <h4 className="text-2xl font-black text-slate-900 leading-tight italic tracking-tight">{error.message}</h4>
        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sugerencia del Analista</span>
          </div>
          <p className="text-sm text-slate-700 font-semibold leading-relaxed italic">
            {error.suggestion}
          </p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Guía de Resolución Paso a Paso:</h5>
        </div>
        <div className="grid gap-3">
          {getResolutionSteps(error.code, error.targetCollection, error.collectionId).map((step, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors group">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg group-hover:bg-indigo-600 transition-colors">{idx + 1}</span>
              <p className="text-xs font-bold text-slate-600 flex-1">{step}</p>
              <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-300 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 relative z-10 pt-4">
        <button 
          onClick={() => setShowTechnical(!showTechnical)}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors px-2"
        >
          {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showTechnical ? 'Ocultar' : 'Ver'} Diagnóstico Técnico del Motor
        </button>

        {showTechnical && (
          <div className="bg-slate-950 text-emerald-400 p-8 rounded-[2.5rem] font-mono text-[11px] leading-relaxed animate-in slide-in-from-top-4 overflow-hidden border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-6 text-slate-500 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-500/50" />
                <span className="uppercase tracking-[0.3em] text-[10px] font-black">LOG_SYSTEM_TRACE_ANALYSIS</span>
              </div>
              <button 
                onClick={copyTechnical}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${copied ? 'text-emerald-400 border-emerald-500 bg-emerald-500/10' : 'text-slate-400 border-white/10 hover:bg-white/5'}`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copiado' : 'Copiar Traza'}</span>
              </button>
            </div>
            <pre className="overflow-x-auto custom-scrollbar whitespace-pre-wrap max-h-64 scrollbar-thin scrollbar-thumb-white/10">
              {error.technicalInfo || "No hay traza técnica disponible para esta incidencia."}
            </pre>
          </div>
        )}
      </div>

      {(onRetry || onClear) && (
        <div className="flex flex-wrap items-center gap-4 relative z-10 pt-6">
          {onRetry && (
            <button 
              onClick={onRetry} 
              className="flex-1 flex items-center justify-center gap-4 bg-slate-950 text-white px-8 py-4 rounded-[2rem] text-xs font-black uppercase hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-95 group border border-white/10"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" /> 
              Reintentar Consulta Procesal
            </button>
          )}
          {onClear && (
            <button 
              onClick={onClear} 
              className="flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 px-8 py-4 rounded-[2rem] text-xs font-black uppercase hover:bg-indigo-100 border border-indigo-200 transition-all shadow-sm active:scale-95"
            >
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              Limpiar Incidencia y Continuar
            </button>
          )}
          <button 
            onClick={() => window.open('https://help.legisai.co', '_blank')}
            className="flex items-center gap-3 bg-white text-slate-500 px-8 py-4 rounded-[2rem] text-xs font-black uppercase hover:text-slate-900 border border-slate-200 transition-all hover:border-slate-300 hover:shadow-lg shadow-sm"
          >
            <Info className="w-4 h-4" /> 
            Base de Ayuda
          </button>
        </div>
      )}
    </div>
  );
};
