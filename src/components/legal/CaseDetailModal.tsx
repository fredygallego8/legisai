import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Calendar, 
  Building2, 
  User, 
  Scale, 
  Clock, 
  Download, 
  MessageSquare, 
  Share2, 
  FileArchive,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Gavel,
  Quote,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalDocument, Expediente, LegalCaseDetails, CaseMilestone } from '../../types';
import { getOrGenerateCaseDetails } from '../../services/timeline/caseTimelineService';
import { CaseTimeline } from './CaseTimeline';
import { RulingExecutiveSummaryModal } from './RulingExecutiveSummaryModal';
import { generateApaCitationFromMilestone } from '../../services/citation/apaCitationFormatter';
import { ApaCitationCard } from './ApaCitationCard';
import { ProceduralTermsTable } from './ProceduralTermsTable';

interface CaseDetailModalProps {
  document?: LegalDocument | null;
  expediente?: Expediente | null;
  documents?: LegalDocument[];
  onClose: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  document,
  expediente,
  documents,
  onClose
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'timeline' | 'summary' | 'terminos'>('timeline');
  const [isExecutiveSummaryOpen, setIsExecutiveSummaryOpen] = useState<boolean>(false);
  const [executiveSummaryMilestone, setExecutiveSummaryMilestone] = useState<CaseMilestone | null>(null);
  const [copiedApa, setCopiedApa] = useState<boolean>(false);

  // Obtener o derivar los detalles del caso con su cronología judicial
  const lookupId = expediente ? expediente.id : (document ? (document.expedienteId || document.id) : 'exp-1');
  const lookupName = expediente ? expediente.titulo : (document ? document.name : 'Expediente Judicial');
  
  const caseDetails: LegalCaseDetails = React.useMemo(() => {
    return getOrGenerateCaseDetails(lookupId, lookupName, expediente, documents);
  }, [lookupId, lookupName, expediente, documents]);

  // Providencia judicial principal (Casación o última decisión de fondo)
  const principalRuling = React.useMemo(() => {
    return caseDetails.milestones.find(m => m.type === 'SENTENCIA_CASACION' || m.linkedSentencia)
      || caseDetails.milestones.find(m => m.type === 'FALLO_SEGUNDA_INSTANCIA' || m.type === 'FALLO_PRIMERA_INSTANCIA')
      || caseDetails.milestones[caseDetails.milestones.length - 1];
  }, [caseDetails.milestones]);

  // Cita APA generada automáticamente para la providencia principal del expediente
  const principalRulingCitation = React.useMemo(() => {
    if (!principalRuling) return null;
    return generateApaCitationFromMilestone(principalRuling, caseDetails);
  }, [principalRuling, caseDetails]);

  const handleQuickCopyApa = async () => {
    if (!principalRulingCitation) return;
    try {
      await navigator.clipboard.writeText(principalRulingCitation.bibliographicReference);
      setCopiedApa(true);
      setTimeout(() => setCopiedApa(false), 2200);
    } catch (err) {
      console.error('Error al copiar cita APA:', err);
    }
  };

  const handleNavigateToChat = (prompt: string) => {
    navigate('/chat', { state: { initialPrompt: prompt } });
    onClose();
  };

  const handleOpenExecutiveSummaryForPrincipalRuling = () => {
    // Buscar la providencia más relevante (casación o sentencia de fondo)
    setExecutiveSummaryMilestone(principalRuling || null);
    setIsExecutiveSummaryOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-50 w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                Detalle del Expediente Judicial
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Radicado: {caseDetails.radicado}
              </span>
              {document?.originZip && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <FileArchive className="w-3 h-3" />
                  {document.originZip}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {caseDetails.expedienteTitulo}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {principalRulingCitation && (
              <button
                id="btn-case-modal-copiar-cita-apa"
                type="button"
                onClick={handleQuickCopyApa}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 border cursor-pointer ${
                  copiedApa
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border-amber-300'
                }`}
                title="Copiar cita bibliográfica en formato APA 7.ª edición al portapapeles"
              >
                {copiedApa ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>¡Cita APA Copiada!</span>
                  </>
                ) : (
                  <>
                    <Quote className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Copiar Cita APA</span>
                    <span className="sm:hidden">Cita APA</span>
                  </>
                )}
              </button>
            )}

            <button
              id="btn-case-modal-resumen-ejecutivo-ia"
              onClick={handleOpenExecutiveSummaryForPrincipalRuling}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border border-slate-700 cursor-pointer"
              title="Generar resumen ejecutivo de la sentencia seleccionada con IA"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Resumen Ejecutivo IA</span>
            </button>

            <button
              onClick={() => handleNavigateToChat(`Consulta sobre el expediente ${caseDetails.expedienteTitulo} (Radicado: ${caseDetails.radicado}). Analiza el estado procesal y los precedentes aplicables.`)}
              className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Consultar con IA</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Metadatos Rápidos del Expediente */}
        <div className="bg-slate-900 text-white px-6 sm:px-8 py-3.5 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Demandante / Actor</span>
            <span className="font-bold text-slate-100 truncate block">{caseDetails.demandante}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Demandado / Opositor</span>
            <span className="font-bold text-slate-100 truncate block">{caseDetails.demandado}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Despacho Actual</span>
            <span className="font-bold text-indigo-300 truncate block">{caseDetails.despachoActual}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado Procesal</span>
            <span className="font-black text-emerald-400 truncate block">{caseDetails.estadoProcesal}</span>
          </div>
        </div>

        {/* Pestañas de Vista */}
        <div className="bg-white px-6 sm:px-8 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6 text-xs font-black">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Línea de Tiempo Procesal ({caseDetails.milestones.length} Hitos)
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Ficha Resumen y Metadatos
            </button>
            <button
              id="btn-tab-terminos-cgp"
              onClick={() => setActiveTab('terminos')}
              className={`py-3.5 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'terminos'
                  ? 'border-amber-500 text-amber-600 font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-500" />
              Términos Procesales CGP
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden md:inline">
            Iniciado: {caseDetails.fechaInicio}
          </span>
        </div>

        {/* Contenido desplazable */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'timeline' ? (
            <CaseTimeline
              caseDetails={caseDetails}
              onNavigateToChat={handleNavigateToChat}
            />
          ) : activeTab === 'terminos' ? (
            <ProceduralTermsTable
              expediente={expediente || {
                id: caseDetails.documentId,
                radicado: caseDetails.radicado,
                titulo: caseDetails.expedienteTitulo,
                demandante: caseDetails.demandante,
                demandado: caseDetails.demandado,
                despacho: caseDetails.despachoActual,
                tipoProceso: caseDetails.temaJuridico,
                estado: caseDetails.estadoProcesal,
                fechaInicio: caseDetails.fechaInicio,
                createdAt: Date.now()
              }}
              documents={documents || []}
              onNavigateToChat={handleNavigateToChat}
            />
          ) : (
            /* Vista de Ficha Resumen y Metadatos */
            <div className="max-w-4xl mx-auto space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  Ficha Técnica Procesal y Datos del Asunto
                </h3>
                <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg border border-indigo-100">
                  {caseDetails.temaJuridico}
                </span>
              </div>

              {/* Banner de Resumen Ejecutivo con IA */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-indigo-500/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                      Inteligencia Artificial Jurisprudencial
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Resumen Ejecutivo de la Sentencia y Puntos Legales Clave
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Sintetiza la Ratio Decidendi, problema jurídico y argumentos probatorios decisivos de la providencia con el motor Gemini 3.8 Flash.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenExecutiveSummaryForPrincipalRuling}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shrink-0 flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generar Resumen con IA</span>
                </button>
              </div>

              {/* Cita Bibliográfica Automática en Formato APA 7.ª Edición */}
              {principalRulingCitation && (
                <ApaCitationCard
                  citation={principalRulingCitation}
                  title="Cita Bibliográfica de la Providencia (Normas APA 7.ª Edición)"
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Radicación Única Nacional</label>
                  <p className="font-mono font-bold text-sm text-slate-900">{caseDetails.radicado}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Cuantía Estimada</label>
                  <p className="font-bold text-sm text-slate-900">{caseDetails.cuantia || 'Sin cuantía fijada'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Fecha de Inicio de la Acción</label>
                  <p className="font-medium text-slate-700">{caseDetails.fechaInicio}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Despacho de Conocimiento</label>
                  <p className="font-medium text-slate-700">{caseDetails.despachoActual}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-black text-slate-800">Resumen del Estado de la Litis</h4>
                <p className="text-slate-600 leading-relaxed">
                  El expediente contiene una trazabilidad de {caseDetails.milestones.length} hitos registrados desde la demanda inicial de primera instancia hasta el pronunciamiento vinculante de casación por la Corte Suprema de Justicia.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-400">
                  {document ? (
                    <>Archivo digitalizado: {document.name} ({(document.size / 1024 / 1024).toFixed(2)} MB)</>
                  ) : (
                    <>Expediente procesal: {caseDetails.radicado} — {caseDetails.despachoActual}</>
                  )}
                </span>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                >
                  Ver en Línea de Tiempo →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="bg-white px-6 sm:px-8 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Trazabilidad Judicial Segura</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>

      {/* Modal de Resumen Ejecutivo con IA */}
      <RulingExecutiveSummaryModal
        isOpen={isExecutiveSummaryOpen}
        onClose={() => setIsExecutiveSummaryOpen(false)}
        milestone={executiveSummaryMilestone}
        caseDetails={caseDetails}
        onNavigateToChat={handleNavigateToChat}
      />
    </div>
  );
};

export default CaseDetailModal;
