import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Scale, 
  Gavel, 
  FileText, 
  Download, 
  Copy, 
  CheckCircle2, 
  MessageSquare, 
  Calendar, 
  Building2, 
  BookOpen, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  FileDown,
  ExternalLink,
  ChevronRight,
  Quote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CaseMilestone, LegalCaseDetails, ExecutiveSummaryData } from '../../types';
import { BackendProvider } from '../../services/ai/BackendProvider';
import { exportExecutiveSummaryToPDF } from '../../services/export/pdfExporter';
import { generateApaCitationFromSummary } from '../../services/citation/apaCitationFormatter';
import { ApaCitationCard } from './ApaCitationCard';

interface RulingExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: CaseMilestone | null;
  caseDetails: LegalCaseDetails;
  onNavigateToChat?: (prompt: string) => void;
}

export const RulingExecutiveSummaryModal: React.FC<RulingExecutiveSummaryModalProps> = ({
  isOpen,
  onClose,
  milestone,
  caseDetails,
  onNavigateToChat
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<ExecutiveSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [apaCopied, setApaCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'puntos_clave' | 'ratio' | 'normas'>('puntos_clave');
  const [progressStep, setProgressStep] = useState<number>(1);

  // Generar automáticamente la cita APA 7.ª edición a partir de los datos analizados
  const apaCitation = React.useMemo(() => {
    if (!summary) return null;
    return generateApaCitationFromSummary(summary);
  }, [summary]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setProgressStep(1);

    const timer1 = setTimeout(() => {
      if (isMounted) setProgressStep(2);
    }, 450);

    const timer2 = setTimeout(() => {
      if (isMounted) setProgressStep(3);
    }, 900);

    const runAnalysis = async () => {
      try {
        const provider = new BackendProvider();

        // Construir prompt contextualizado con la providencia y antecedentes del expediente
        const targetTitle = milestone?.title || caseDetails.expedienteTitulo;
        const targetAuthority = milestone?.authority || caseDetails.despachoActual;
        const targetDate = milestone?.displayDate || caseDetails.fechaInicio;
        const targetExcerpt = milestone?.rulingExcerpt || milestone?.description || '';
        const linkedSentencia = milestone?.linkedSentencia;

        const prompt = `Analiza la siguiente providencia o decisión judicial colombiana correspondiente al expediente con radicado ${caseDetails.radicado}:
        
EXPEDIENTE: ${caseDetails.expedienteTitulo}
RADICADO: ${caseDetails.radicado}
PARTES: Demandante (${caseDetails.demandante}) vs. Demandado (${caseDetails.demandado})
TEMA JURÍDICO: ${caseDetails.temaJuridico}
DESPACHO: ${targetAuthority}
HITO / PROVIDENCIA: ${targetTitle}
FECHA DEL FALLO: ${targetDate}
INSTANCIA: ${milestone?.instance || 'Casación'}
EXTRACTO O CONSIDERACIÓN CENTRAL: "${targetExcerpt}"
${linkedSentencia ? `DATOS DE LA SENTENCIA: ${linkedSentencia.providencia} (${linkedSentencia.radicado || ''}) - Ponente: ${linkedSentencia.magistradoPonente || 'Sala de Casación'} - Sala: ${linkedSentencia.chamber || ''}` : ''}

INSTRUCCIONES CLAVE:
Genera una Ficha de Resumen Ejecutivo y Ratio Decidendi destacando:
1. Problema jurídico formulado con rigor dogmático.
2. Ratio Decidendi: La regla jurídica determinante y universalizable.
3. 4 a 5 Puntos Legales Clave que sustentan la decisión (argumentación sustancial, estándar probatorio, doctrina aplicable y efectos procesales).
4. Decisión y órdenes resolutivas.
5. Normas constitucionales/legales y precedentes de unificación aplicables.`;

        const result = await provider.generateExecutiveSummary(prompt);
        if (isMounted) {
          setSummary(result);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error al generar resumen ejecutivo con IA:", err);
        if (isMounted) {
          setError(err.message || "No fue posible procesar la providencia con el motor de IA.");
          setLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      isMounted = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, milestone, caseDetails]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summary) return;
    const apaText = apaCitation ? `\nCITA BIBLIOGRÁFICA (NORMAS APA 7.ª ED.):\n${apaCitation.bibliographicReference}\nCita en el texto: ${apaCitation.inTextParenthetical}\n` : '';
    const text = `RESUMEN EJECUTIVO DE PROVIDENCIA JUDICIAL • LEGISAI COLOMBIA
=============================================================
Providencia: ${summary.radicado}
Corporación: ${summary.corporacion}
Magistrado/Juez Ponente: ${summary.magistradoPonente}
Fecha: ${summary.fecha}
Tema Principal: ${summary.temaPrincipal}
${apaText}
PROBLEMA JURÍDICO:
${summary.problemaJuridico}

RATIO DECIDENDI (REGLA VINCULANTE):
${summary.ratioDecidendi}

PUNTOS LEGALES CLAVE:
${summary.puntosClave.map((pt, i) => `${i + 1}. ${pt}`).join('\n')}

DECISIÓN Y ÓRDENES:
${summary.decision}

NORMAS APLICADAS:
${(summary.normasAplicadas || []).join(', ')}

PRECEDENTES CITADOS:
${(summary.precedentesCitados || []).join(', ')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyApaOnly = async () => {
    if (!apaCitation) return;
    try {
      await navigator.clipboard.writeText(apaCitation.bibliographicReference);
      setApaCopied(true);
      setTimeout(() => setApaCopied(false), 2200);
    } catch (e) {
      console.error('Error al copiar cita APA:', e);
    }
  };

  const handleExportPDF = async () => {
    if (!summary) return;
    setIsExporting(true);
    try {
      await exportExecutiveSummaryToPDF(summary, {
        lawFirmName: 'LEGISAI COLOMBIA • CONSULTORÍA JURISPRUDENCIAL',
        notes: `Expediente: ${caseDetails.expedienteTitulo} • Radicado: ${caseDetails.radicado}`
      });
    } catch (e) {
      console.error("Error al exportar PDF:", e);
      window.alert("Ocurrió un error al generar el archivo PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleGoToChat = () => {
    if (!summary) return;
    const prompt = `Analicemos en profundidad la providencia ${summary.radicado} (${summary.corporacion}, M.P. ${summary.magistradoPonente}) del expediente ${caseDetails.radicado}.
Ratio Decidendi: "${summary.ratioDecidendi}".
¿Qué excepciones doctrinales o debates procesales existen respecto a este fallo?`;

    if (onNavigateToChat) {
      onNavigateToChat(prompt);
    } else {
      navigate('/chat', { state: { initialPrompt: prompt } });
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Principal */}
        <div className="bg-slate-900 text-white px-6 sm:px-8 py-5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-700/50">
                  Resumen Ejecutivo con IA
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {milestone?.instance || 'Análisis Jurisprudencial'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                {milestone?.title || caseDetails.expedienteTitulo}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-50/60">
          {loading ? (
            /* Estado de Carga con Pasos de Análisis */
            <div className="py-16 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-50" />
                <div className="relative w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-900">
                  Generando Resumen Ejecutivo con Gemini 3.8 Flash
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Sintetizando antecedentes procesales, desglosando la regla de decisión y destacando los puntos legales clave.
                </p>
              </div>

              {/* Indicador de pasos */}
              <div className="space-y-2 text-left bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
                <div className={`flex items-center gap-2.5 ${progressStep >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>1. Extracción de providencia y antecedentes fácticos</span>
                </div>
                <div className={`flex items-center gap-2.5 ${progressStep >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>2. Análisis dogmático y formulación del problema jurídico</span>
                </div>
                <div className={`flex items-center gap-2.5 ${progressStep >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>3. Determinación de la Ratio Decidendi y Puntos Legales Clave</span>
                </div>
              </div>
            </div>
          ) : error ? (
            /* Estado de Error */
            <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-sm space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900">Error en el análisis de la providencia</h4>
                <p className="text-xs text-slate-600">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          ) : summary ? (
            /* Resumen Ejecutivo Generado */
            <div className="space-y-6">
              {/* Tarjeta de Metadatos Institucionales de la Sentencia */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {summary.corporacion}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {summary.radicado}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      {summary.temaPrincipal}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Fecha del Fallo</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center sm:justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      {summary.fecha}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Ponente / Despacho</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{summary.magistradoPonente}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Sentido de la Decisión</span>
                    <span className="font-black text-emerald-900 block mt-0.5">{summary.decision}</span>
                  </div>
                </div>
              </div>

              {/* Problema Jurídico Central */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Scale className="w-4 h-4" />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Problema Jurídico Principal
                  </h4>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                  "{summary.problemaJuridico}"
                </p>
              </div>

              {/* CITA BIBLIOGRÁFICA EN FORMATO APA 7.ª EDICIÓN */}
              {apaCitation && (
                <ApaCitationCard
                  citation={apaCitation}
                  title="Cita Bibliográfica de la Providencia (APA 7.ª Edición)"
                />
              )}

              {/* RATIO DECIDENDI DESTACADA */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md space-y-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-amber-300" />
                    Ratio Decidendi • Regla Jurídica Vinculante
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Doctrina Jurisprudencial
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-serif tracking-normal pt-1">
                  {summary.ratioDecidendi}
                </p>
              </div>

              {/* PUNTOS LEGALES CLAVE (Key Legal Points) */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                      {summary.puntosClave.length}
                    </div>
                    <h4 className="text-sm font-black tracking-tight">
                      Puntos Legales Clave Destacados por la IA
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Argumentación y Prueba
                  </span>
                </div>

                <div className="space-y-3">
                  {summary.puntosClave.map((punto, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all flex items-start gap-3.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {idx + 1}
                      </span>
                      <div className="space-y-1 flex-1">
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                          {punto}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Normas y Precedentes Citados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Normas aplicadas */}
                {summary.normasAplicadas && summary.normasAplicadas.length > 0 && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Normativa Aplicada
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.normasAplicadas.map((norma, nIdx) => (
                        <span 
                          key={nIdx}
                          className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60"
                        >
                          {norma}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precedentes citados */}
                {summary.precedentesCitados && summary.precedentesCitados.length > 0 && (
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5 text-indigo-600" />
                      Línea Jurisprudencial y Precedentes
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.precedentesCitados.map((prec, pIdx) => (
                        <span 
                          key={pIdx}
                          className="text-[11px] font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
                        >
                          {prec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Obiter Dicta si existe */}
              {summary.obiterDicta && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2 text-xs">
                  <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Consideraciones Secundarias (Obiter Dicta)
                  </h5>
                  <p className="text-slate-600 leading-relaxed italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    {summary.obiterDicta}
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Barra Inferior de Acciones */}
        <div className="bg-white px-6 sm:px-8 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-600">
              Síntesis Jurídica Certificada por LegisAI
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              id="btn-footer-copiar-cita-apa"
              onClick={handleCopyApaOnly}
              disabled={!apaCitation || loading}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Copiar cita bibliográfica en formato APA 7.ª edición"
            >
              {apaCopied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Cita APA Copiada!</span>
                </>
              ) : (
                <>
                  <Quote className="w-4 h-4 text-amber-600" />
                  <span>Copiar Cita APA</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              disabled={!summary || loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? '¡Copiado!' : 'Copiar Ficha'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!summary || loading || isExporting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handleGoToChat}
              disabled={!summary || loading}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Profundizar en Chat</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulingExecutiveSummaryModal;
