import React, { useState } from 'react';
import { 
  Scale, BookOpen, CheckCircle, Copy, Bookmark, 
  Sparkles, ChevronDown, ChevronUp, FileText, Printer,
  FileDown, SlidersHorizontal, Loader2
} from 'lucide-react';
import { ExecutiveSummaryData } from '../../types';
import { exportExecutiveSummaryToPDF } from '../../services/export/pdfExporter';
import { ExportPDFModal } from './ExportPDFModal';

interface ExecutiveSummaryCardProps {
  summary: ExecutiveSummaryData;
  onApplyToPrompt?: (text: string) => void;
  className?: string;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  summary,
  onApplyToPrompt,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const handleDirectPDFExport = async () => {
    setIsExportingPDF(true);
    try {
      await exportExecutiveSummaryToPDF(summary);
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 2500);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('No se pudo generar el PDF estructurado. Por favor intente nuevamente.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const formatAsCitation = () => {
    return `FICHA JURISPRUDENCIAL - RESUMEN EJECUTIVO
Corporación: ${summary.corporacion}
Providencia: ${summary.radicado}
M.P.: ${summary.magistradoPonente}
Fecha: ${summary.fecha}
Tema: ${summary.temaPrincipal}

PROBLEMA JURÍDICO:
${summary.problemaJuridico}

RATIO DECIDENDI:
${summary.ratioDecidendi}

PUNTOS CLAVE:
${summary.puntosClave.map((pt, i) => `${i + 1}. ${pt}`).join('\n')}

DECISIÓN:
${summary.decision}
${summary.normasAplicadas && summary.normasAplicadas.length > 0 ? `\nNORMAS APLICADAS:\n${summary.normasAplicadas.join(', ')}` : ''}
${summary.precedentesCitados && summary.precedentesCitados.length > 0 ? `\nLÍNEA JURISPRUDENCIAL CITADA:\n${summary.precedentesCitados.join(', ')}` : ''}
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatAsCitation());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${summary.radicado} - Resumen Ejecutivo</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              h1 { font-size: 20px; border-bottom: 2px solid #4338ca; padding-bottom: 8px; color: #312e81; }
              .meta { font-size: 13px; color: #475569; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; }
              .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #4338ca; margin-top: 18px; letter-spacing: 0.05em; }
              .ratio-box { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 14px; margin: 12px 0; border-radius: 4px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>${summary.radicado}</h1>
            <div class="meta">
              <strong>${summary.corporacion}</strong><br/>
              <strong>Magistrado Ponente:</strong> ${summary.magistradoPonente} | <strong>Fecha:</strong> ${summary.fecha}<br/>
              <strong>Materia:</strong> ${summary.temaPrincipal}
            </div>
            <div class="section-title">Problema Jurídico</div>
            <p>${summary.problemaJuridico}</p>
            
            <div class="section-title">Ratio Decidendi (Criterio Vinculante)</div>
            <div class="ratio-box">
              <p><strong>${summary.ratioDecidendi}</strong></p>
            </div>
            
            <div class="section-title">Puntos Clave del Fallo</div>
            <ul>
              ${summary.puntosClave.map(p => `<li>${p}</li>`).join('')}
            </ul>

            <div class="section-title">Decisión / Resuelve</div>
            <p>${summary.decision}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div id={`summary-${summary.radicado.replace(/[^a-zA-Z0-9]/g, '-')}`} className={`bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden my-4 ${className}`}>
      {/* Header Banner */}
      <div className="px-6 py-5 bg-slate-950/70 border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Resumen Ejecutivo Judicial
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini 3.8 Jurídico
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 tracking-tight">
              {summary.radicado}
            </h3>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-600/40 border border-slate-700 hover:border-indigo-400 text-xs text-slate-200 hover:text-white rounded-xl transition-all active:scale-95"
            title="Copiar Ficha Jurisprudencial para Memorial"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiada' : 'Copiar Ficha'}</span>
          </button>

          {/* Exportar a PDF Directo */}
          <button
            onClick={handleDirectPDFExport}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 border border-indigo-400/50 text-xs font-semibold text-white rounded-xl transition-all active:scale-95 shadow-sm shadow-indigo-900/50"
            title="Exportar Resumen Ejecutivo a PDF Estructurado con Metadatos"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : pdfDownloaded ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-white" />
            )}
            <span>{pdfDownloaded ? 'PDF Descargado' : 'Exportar PDF'}</span>
          </button>

          {/* Configurar Opciones del PDF (Firma, Caso, Notas) */}
          <button
            onClick={() => setIsOptionsModalOpen(true)}
            className="p-1.5 bg-slate-800/80 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-400 text-slate-300 hover:text-white rounded-xl transition-all"
            title="Personalizar PDF (Firma de Abogados, Expediente, Notas del Caso)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          
          <button
            onClick={handlePrint}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
            title="Imprimir"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metadata Strip */}
      <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 text-[11px] text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Corporación:</span>
          <span className="font-medium text-slate-200 truncate">{summary.corporacion}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Magistrado(a) Ponente:</span>
          <span className="font-medium text-slate-200 truncate">{summary.magistradoPonente}</span>
        </div>
        <div>
          <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider">Fecha de Providencia:</span>
          <span className="font-medium text-slate-200">{summary.fecha}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Tema & Materia */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest font-black text-indigo-400 flex items-center gap-1.5 mb-1.5">
            <Bookmark className="w-3.5 h-3.5" /> Materia Principal
          </div>
          <p className="text-sm font-semibold text-slate-100">{summary.temaPrincipal}</p>
        </div>

        {/* Problema Jurídico */}
        <div className="bg-slate-800/60 border-l-4 border-indigo-500 rounded-r-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1.5">
            Problema Jurídico Formulado
          </div>
          <p className="text-sm text-slate-200 italic leading-relaxed">
            "{summary.problemaJuridico}"
          </p>
        </div>

        {/* Ratio Decidendi (The Core vinculante) */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/90 to-slate-900/90 border-2 border-indigo-500/60 rounded-2xl p-5 shadow-lg shadow-indigo-950/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                Ratio Decidendi • Criterio Vinculante
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">
              Precedente Obligatorio
            </span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-slate-100 leading-relaxed">
            {summary.ratioDecidendi}
          </p>
        </div>

        {/* Puntos Clave */}
        <div>
          <div className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" /> Puntos Clave de la Decisión
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.puntosClave.map((punto, idx) => (
              <div 
                key={idx} 
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-start gap-2.5 hover:border-slate-600 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600/40 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{punto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resuelve / Sentido del Fallo */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4">
          <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 block mb-1">
            Sentido del Fallo y Órdenes Procesales (Resuelve)
          </span>
          <p className="text-xs md:text-sm text-emerald-100 font-medium leading-relaxed">
            {summary.decision}
          </p>
        </div>

        {/* Detalle adicional expandible: Normas & Precedentes */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-300 font-semibold transition-colors py-1"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{showDetails ? 'Ocultar fundamentos normativos y obiter dicta' : 'Ver normas aplicadas, obiter dicta y precedentes citados'}</span>
          </button>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-300">
              {summary.normasAplicadas && summary.normasAplicadas.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
                    Normas y Disposiciones Aplicadas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.normasAplicadas.map((norma, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 border border-slate-700 text-indigo-200 px-2.5 py-1 rounded-lg">
                        {norma}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.precedentesCitados && summary.precedentesCitados.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
                    Línea Jurisprudencial y Precedentes Citados:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.precedentesCitados.map((prec, i) => (
                      <span key={i} className="text-[11px] bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 px-2.5 py-1 rounded-lg">
                        {prec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summary.obiterDicta && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Obiter Dicta (Consideraciones Complementarias):
                  </span>
                  <p className="text-xs text-slate-300 italic">{summary.obiterDicta}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons: PDF Export and Inquire in chat */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectPDFExport}
              disabled={isExportingPDF}
              className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 border border-indigo-500/50 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-950 active:scale-95"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pdfDownloaded ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{pdfDownloaded ? 'Ficha PDF Descargada' : 'Descargar Ficha en PDF'}</span>
            </button>

            <button
              onClick={() => setIsOptionsModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl transition-all"
              title="Personalizar datos de exportación"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Personalizar PDF</span>
            </button>
          </div>

          {onApplyToPrompt && (
            <button
              onClick={() => onApplyToPrompt(`¿Cómo puedo aplicar la ratio decidendi de la ${summary.radicado} a un caso con las siguientes características: `)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Analizar aplicación a mi caso</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal de Personalización y Exportación de PDF */}
      <ExportPDFModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        summary={summary}
      />
    </div>
  );
};
