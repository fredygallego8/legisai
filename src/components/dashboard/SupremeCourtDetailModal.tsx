import React, { useState } from 'react';
import { 
  X, Scale, FileDown, MessageSquare, Copy, 
  CheckCircle, Bookmark, Share2, Sparkles, BookOpen, 
  ArrowRight, ShieldCheck, Loader2
} from 'lucide-react';
import { SupremeCourtAlert } from '../../types';
import { SupremeCourtAlertsService } from '../../services/alerts/supremeCourtAlertsService';
import { exportExecutiveSummaryToPDF } from '../../services/export/pdfExporter';

interface SupremeCourtDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: SupremeCourtAlert | null;
  onAnalyzeInChat: (alert: SupremeCourtAlert) => void;
  onToggleBookmark?: (id: string) => void;
}

export const SupremeCourtDetailModal: React.FC<SupremeCourtDetailModalProps> = ({
  isOpen,
  onClose,
  alert,
  onAnalyzeInChat,
  onToggleBookmark
}) => {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  if (!isOpen || !alert) return null;

  const handleCopyCitation = () => {
    const citation = `CORTE SUPREMA DE JUSTICIA DE COLOMBIA • ${alert.chamberLabel}\nProvidencia: ${alert.providencia} (${alert.radicado})\nMagistrado Ponente: ${alert.magistradoPonente}\nFecha: ${alert.fecha}\nTema: ${alert.temaPrincipal}\n\nRATIO DECIDENDI:\n"${alert.ratioDecidendi}"\n\nDECISIÓN:\n${alert.decision}`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const summary = SupremeCourtAlertsService.toExecutiveSummary(alert);
      await exportExecutiveSummaryToPDF(summary, {
        lawFirmName: 'LEGISAI COLOMBIA • MONITOR DE CASACIÓN CSJ',
        notes: `Alerta generada para el tema de investigación: ${alert.topicName} (Afinidad ${alert.relevanceScore}%).`
      });
      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 2200);
    } catch (err) {
      console.error('Error exportando PDF:', err);
      window.alert('Ocurrió un error al exportar la providencia.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Superior */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {alert.chamberLabel}
                </span>
                <span className="text-xs font-black text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-bold">{alert.fecha}</span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                {alert.providencia} <span className="text-slate-500 font-normal">({alert.radicado})</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(alert.id)}
                className={`p-2 rounded-xl border transition-all ${
                  alert.isBookmarked 
                    ? 'bg-amber-50 text-amber-600 border-amber-200' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
                title={alert.isBookmarked ? 'Guardada en favoritos' : 'Guardar en favoritos'}
              >
                <Bookmark className={`w-4 h-4 ${alert.isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Tag de afinidad con tema de investigación */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 block">
                  Coincidencia con su investigación:
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {alert.topicName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-white border border-indigo-200 text-indigo-700 text-xs font-black px-2.5 py-1 rounded-lg">
                {alert.relevanceScore}% Afinidad Jurídica
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                alert.impactOnPrecedent === 'CAMBIO_JURISPRUDENCIAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : alert.impactOnPrecedent === 'PRECISION_DOCTRINAL'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {alert.impactOnPrecedent.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Metadatos Rápidos */}
          <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                Magistrado Ponente
              </span>
              <span className="font-bold text-slate-800">{alert.magistradoPonente}</span>
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] block">
                Materia / Tema Principal
              </span>
              <span className="font-bold text-slate-800">{alert.temaPrincipal}</span>
            </div>
          </div>

          {/* Problema Jurídico */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Problema Jurídico Resuelto por Casación
            </h4>
            <div className="p-4 bg-slate-50 border-l-4 border-indigo-400 rounded-r-2xl text-xs text-slate-800 italic leading-relaxed">
              "{alert.problemaJuridico}"
            </div>
          </div>

          {/* RATIO DECIDENDI (Criterio Vinculante) */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              Ratio Decidendi • Criterio Vinculante de la Corte Suprema
            </h4>
            <div className="p-5 bg-gradient-to-br from-indigo-50/90 to-white border border-indigo-200 rounded-2xl shadow-sm text-xs text-slate-900 leading-relaxed font-medium">
              {alert.ratioDecidendi}
            </div>
          </div>

          {/* Puntos Clave de la Sentencia */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              Puntos Clave y Consideraciones Determinantes
            </h4>
            <div className="space-y-2">
              {alert.puntosClave.map((punto, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed">{punto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sentido de la Decisión / Resuelve */}
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sentido del Fallo y Órdenes Impartidas
            </h4>
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 font-medium leading-relaxed">
              {alert.decision}
            </div>
          </div>

          {/* Normas y Precedentes */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Normas y Disposiciones Aplicadas
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {alert.normasAplicadas.map((norma, idx) => (
                <span 
                  key={idx}
                  className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg"
                >
                  {norma}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={handleCopyCitation}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl hover:bg-slate-200/60 transition-all active:scale-95"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡Cita Copiada!' : 'Copiar Cita Jurídica'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Exportar a PDF */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pdfDownloaded ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{pdfDownloaded ? '¡PDF Descargado!' : 'Exportar Ficha PDF'}</span>
            </button>

            {/* Analizar en Chat */}
            <button
              onClick={() => onAnalyzeInChat(alert)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-slate-200 active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Analizar en Chat</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
