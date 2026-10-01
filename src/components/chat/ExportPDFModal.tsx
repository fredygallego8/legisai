import React, { useState } from 'react';
import { 
  X, FileDown, CheckCircle, Scale, Building2, 
  FileText, Sparkles, Loader2, BookmarkCheck, Shield 
} from 'lucide-react';
import { ExecutiveSummaryData } from '../../types';
import { exportExecutiveSummaryToPDF, PDFExportOptions } from '../../services/export/pdfExporter';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ExecutiveSummaryData;
}

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  isOpen,
  onClose,
  summary
}) => {
  const [lawFirmName, setLawFirmName] = useState('LEGISAI COLOMBIA • CONSULTORÍA JURÍDICA');
  const [caseReference, setCaseReference] = useState('');
  const [notes, setNotes] = useState('');
  const [includeObiterDicta, setIncludeObiterDicta] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setIsSuccess(false);

    try {
      const combinedNotes = [
        caseReference ? `Referencia interna de caso: ${caseReference}` : '',
        notes
      ].filter(Boolean).join('\n\n');

      const options: PDFExportOptions = {
        lawFirmName: lawFirmName.trim() || 'LEGISAI COLOMBIA • CONSULTORÍA JURÍDICA',
        notes: combinedNotes,
        includeObiterDicta
      };

      await exportExecutiveSummaryToPDF(summary, options);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Ocurrió un error al exportar el archivo PDF. Intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Exportar Ficha Jurisprudencial a PDF
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Documento estructurado con metadatos oficiales y Ratio Decidendi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Metadata Preview Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Metadatos a Incluir en el Documento:
            </div>
            <div className="text-xs font-bold text-slate-900">
              {summary.radicado}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {summary.corporacion} • M.P. {summary.magistradoPonente}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 italic line-clamp-1">
              {summary.temaPrincipal}
            </div>
          </div>

          {/* Nombre de la Firma / Cabecera */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Encabezado / Firma de Abogados:
            </label>
            <input
              type="text"
              value={lawFirmName}
              onChange={(e) => setLawFirmName(e.target.value)}
              placeholder="Ej: PAVA DÍAZ ARANA ABOGADOS"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>

          {/* Referencia Interna de Caso */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Referencia de Expediente o Caso (Opcional):
            </label>
            <input
              type="text"
              value={caseReference}
              onChange={(e) => setCaseReference(e.target.value)}
              placeholder="Ej: Expediente 2024-00129 / Acción de Tutela Ramírez"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>

          {/* Notas Estratégicas */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
              Notas Estratégicas para el Memorial (Opcional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escriba observaciones jurídicas o instrucciones sobre la aplicación de este precedente al caso concreto..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
            />
          </div>

          {/* Toggle Obiter Dicta */}
          {summary.obiterDicta && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeObiterDicta}
                onChange={(e) => setIncludeObiterDicta(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Incluir sección de Obiter Dicta</span>
                <span className="text-[10px] text-slate-500">Consideraciones dogmáticas secundarias de la providencia</span>
              </div>
            </label>
          )}

          {/* Structure badge summary */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>El PDF incluye: Metadatos completos, Problema Jurídico, Ratio Decidendi vinculante, Puntos Clave numerados, Resuelve formal y paginación institucional.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || isSuccess}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando Documento...</span>
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>¡Descargado con éxito!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>Descargar Archivo PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
