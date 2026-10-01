import React, { useState } from 'react';
import { 
  X, Scale, Sparkles, Loader2, BookOpen, 
  FileText, CheckCircle, ArrowRight, AlertCircle, FileSearch, FileDown
} from 'lucide-react';
import { ExecutiveSummaryData } from '../../types';
import { LLMFactory } from '../../services/ai/LLMFactory';
import { AIProviderId } from '../../types';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { exportExecutiveSummaryToPDF } from '../../services/export/pdfExporter';

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat: (summary: ExecutiveSummaryData) => void;
  onSetPromptText: (text: string) => void;
}

const PRESET_SENTENCIAS = [
  {
    radicado: 'Sentencia SU-050 de 2022',
    corporacion: 'Corte Constitucional',
    tema: 'Estabilidad Laboral / Ocupacional Reforzada por Salud',
    sampleSnippet: 'Sentencia SU-050 de 2022. M.P. Cristina Pardo Schlesinger. La Corte unifica las reglas sobre la protección de estabilidad laboral reforzada de personas en debilidad manifiesta por salud en contratos laborales y de prestación de servicios, reiterando la ineficacia del despido sin autorización del Ministerio del Trabajo.'
  },
  {
    radicado: 'Sentencia C-055 de 2022',
    corporacion: 'Corte Constitucional',
    tema: 'Interrupción Voluntaria del Embarazo (IVE) hasta semana 24',
    sampleSnippet: 'Sentencia C-055 de 2022. M.P. Antonio José Lizarazo y Alberto Rojas Ríos. La Corte declara la exequibilidad condicionada del artículo 122 del Código Penal, estableciendo que la conducta de aborto no es punible cuando se realiza antes de la vigésimo cuarta semana de gestación.'
  },
  {
    radicado: 'Sentencia SP-2840-2023',
    corporacion: 'Corte Suprema de Justicia (Penal)',
    tema: 'Regla de Exclusión Probatoria y Prueba Ilícita (Art. 29 C.P.)',
    sampleSnippet: 'Sentencia SP-2840-2023, Radicación 58912. M.P. Hugo Quintero Bernate. La Sala de Casación Penal unifica criterios sobre la exclusión de evidencias recaudadas con violación del debido proceso y derechos fundamentales, diferenciando prueba ilícita de prueba ilegal subsanable.'
  }
];

export const ExecutiveSummaryModal: React.FC<ExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  onInsertToChat,
  onSetPromptText
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExecutiveSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_SENTENCIAS[0]) => {
    setInputText(preset.sampleSnippet);
    handleGenerate(preset.sampleSnippet);
  };

  const handleGenerate = async (customText?: string) => {
    const textToProcess = customText || inputText;
    if (!textToProcess.trim()) {
      setError('Por favor ingrese el texto, radicado o síntesis de la providencia colombiana.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const provider = LLMFactory.getProvider(AIProviderId.GEMINI, '');
      if (provider.generateExecutiveSummary) {
        const summaryData = await provider.generateExecutiveSummary(textToProcess);
        setResult(summaryData);
      } else {
        throw new Error('El proveedor Gemini no soporta extracción de resumen ejecutivo.');
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      setError(err?.message || 'Error al procesar el resumen con Gemini. Verifique la conexión.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onInsertToChat(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                  Resumen Ejecutivo & Ratio Decidendi
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Extracción especializada de puntos clave y regla jurisprudencial vinculante en sentencias colombianas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {/* Quick Presets for Colombian Legal Sentences */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Precedentes Judiciales Destacados en Colombia (1-Click):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESET_SENTENCIAS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isProcessing}
                  className="text-left p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/50 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{preset.corporacion}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{preset.radicado}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{preset.tema}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileSearch className="w-3.5 h-3.5 text-slate-500" />
                Texto o Radicado de la Providencia a Analizar:
              </label>
              <span className="text-[10px] text-slate-400">
                Acepta número de sentencia, extractos de consideraciones o expediente.
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: Sentencia SU-050 de 2022 sobre estabilidad laboral reforzada..."
              rows={4}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleGenerate()}
              disabled={isProcessing || !inputText.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl shadow-indigo-100 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extrayendo Ratio Decidendi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Procesar Resumen con Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Preview */}
          {result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Ficha Jurisprudencial Generada con Éxito
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportExecutiveSummaryToPDF(result)}
                    className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                    title="Exportar a PDF con Metadatos Estructurados"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar PDF</span>
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Insertar en Conversación</span>
                  </button>
                </div>
              </div>

              <ExecutiveSummaryCard 
                summary={result} 
                onApplyToPrompt={(text) => {
                  onSetPromptText(text);
                  onClose();
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Metodología de análisis constitucional según parámetros de la Corte Constitucional Colombiana.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
