import React, { useState } from 'react';
import { Quote, Copy, CheckCircle2, BookMarked, Sparkles } from 'lucide-react';
import { ApaCitationResult } from '../../services/citation/apaCitationFormatter';

interface ApaCitationCardProps {
  citation: ApaCitationResult;
  title?: string;
  variant?: 'compact' | 'full';
  className?: string;
}

export const ApaCitationCard: React.FC<ApaCitationCardProps> = ({
  citation,
  title = 'Cita Bibliográfica en Formato APA (7.ª ed.)',
  variant = 'full',
  className = ''
}) => {
  const [activeType, setActiveType] = useState<'reference' | 'parenthetical' | 'narrative'>('reference');
  const [copied, setCopied] = useState<boolean>(false);

  const getActiveText = () => {
    switch (activeType) {
      case 'parenthetical':
        return citation.inTextParenthetical;
      case 'narrative':
        return citation.inTextNarrative;
      case 'reference':
      default:
        return citation.bibliographicReference;
    }
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const textToCopy = getActiveText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`p-3.5 rounded-2xl bg-amber-500/5 border border-amber-200/70 space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <Quote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">Cita APA 7.ª ed.</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-600/10 hover:bg-amber-600 hover:text-white text-amber-800'
            }`}
            title="Copiar cita APA al portapapeles"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>¡Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar APA</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-800 leading-relaxed font-mono bg-white p-2.5 rounded-xl border border-amber-100 select-all break-words">
          {citation.bibliographicReference}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl border border-amber-200/80 shadow-xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-amber-50/70 px-5 py-3.5 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
            <Quote className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200/50">
                Normas APA 7.ª Edición
              </span>
              <span className="text-amber-300">•</span>
              <span className="text-[10px] text-amber-700 font-semibold">Jurisprudencia Colombiana</span>
            </div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
              {title}
            </h4>
          </div>
        </div>

        {/* Botón Principal de Copiado */}
        <button
          id="btn-copiar-cita-apa"
          type="button"
          onClick={handleCopy}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>¡Cita Copiada al Portapapeles!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar al Portapapeles</span>
            </>
          )}
        </button>
      </div>

      {/* Selector de formato de cita */}
      <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-100 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveType('reference')}
          className={`pb-2.5 font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeType === 'reference'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Referencia Bibliográfica</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveType('parenthetical')}
          className={`pb-2.5 font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeType === 'parenthetical'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Quote className="w-3.5 h-3.5" />
          <span>Cita Parentética (en texto)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveType('narrative')}
          className={`pb-2.5 font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 ${
            activeType === 'narrative'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cita Narrativa</span>
        </button>
      </div>

      {/* Contenido de la cita */}
      <div className="p-5 space-y-3">
        <div className="relative group bg-slate-50 hover:bg-amber-50/20 p-4 rounded-2xl border border-slate-200 transition-colors">
          <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-mono select-all break-words">
            {getActiveText()}
          </p>

          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Copiar este texto"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Explicación de la estructura APA */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 flex-wrap gap-2">
          <span>
            {activeType === 'reference' && 'Estructura: Tribunal u Órgano. (Año, Día de Mes). Título de Providencia (Radicación; M.P. Ponente).'}
            {activeType === 'parenthetical' && 'Para incluir al final de un párrafo argumentativo o cita textual en memoriales o escritos.'}
            {activeType === 'narrative' && 'Para citar como parte de la redacción: "Como determinó la Corte..."'}
          </span>
          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
            Listo para copiar en Word / Google Docs
          </span>
        </div>
      </div>
    </div>
  );
};

export default ApaCitationCard;
