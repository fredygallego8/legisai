import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Scale, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Download, 
  Share2, 
  Filter, 
  Sparkles, 
  Building2, 
  FileCheck, 
  Gavel, 
  ArrowUpRight, 
  Info,
  Layers,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalCaseDetails, CaseMilestone, MilestoneType } from '../../types';
import { RulingExecutiveSummaryModal } from './RulingExecutiveSummaryModal';
import { generateApaCitationFromMilestone } from '../../services/citation/apaCitationFormatter';
import { ApaCitationCard } from './ApaCitationCard';
import { ProceduralTermsModal } from './ProceduralTermsModal';

interface CaseTimelineProps {
  caseDetails: LegalCaseDetails;
  onNavigateToChat?: (prompt: string) => void;
  className?: string;
}

// Configuración de estilo y distintivos por tipo de hito procesal
const getMilestoneVisuals = (type: MilestoneType, outcome?: string) => {
  switch (type) {
    case 'SENTENCIA_CASACION':
      return {
        icon: Gavel,
        badgeText: 'Corte Suprema • Casación',
        badgeBg: 'bg-indigo-600 text-white',
        nodeBg: 'bg-indigo-600 text-white ring-4 ring-indigo-100',
        borderColor: 'border-indigo-600'
      };
    case 'FALLO_PRIMERA_INSTANCIA':
    case 'FALLO_SEGUNDA_INSTANCIA':
      return {
        icon: Scale,
        badgeText: type === 'FALLO_PRIMERA_INSTANCIA' ? 'Fallo 1ª Instancia' : 'Fallo 2ª Instancia',
        badgeBg: 'bg-purple-100 text-purple-800 border border-purple-200',
        nodeBg: 'bg-purple-600 text-white ring-4 ring-purple-100',
        borderColor: 'border-purple-300'
      };
    case 'DEMANDA':
    case 'AUTO_ADMISION':
      return {
        icon: FileText,
        badgeText: type === 'DEMANDA' ? 'Demanda Inicial' : 'Auto Admisorio',
        badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200',
        nodeBg: 'bg-slate-700 text-white ring-4 ring-slate-100',
        borderColor: 'border-slate-300'
      };
    case 'DICTAMEN_PERICIAL':
      return {
        icon: FileCheck,
        badgeText: 'Prueba Pericial',
        badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        nodeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-100',
        borderColor: 'border-emerald-300'
      };
    case 'RECURSO_CASACION':
    case 'APELACION':
      return {
        icon: ArrowUpRight,
        badgeText: type === 'RECURSO_CASACION' ? 'Recurso Extraordinario' : 'Recurso de Apelación',
        badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200',
        nodeBg: 'bg-amber-600 text-white ring-4 ring-amber-100',
        borderColor: 'border-amber-300'
      };
    default:
      return {
        icon: Clock,
        badgeText: 'Trámite Procesal',
        badgeBg: 'bg-slate-100 text-slate-600',
        nodeBg: 'bg-slate-500 text-white ring-4 ring-slate-100',
        borderColor: 'border-slate-200'
      };
  }
};

const getOutcomeBadge = (outcome?: string) => {
  switch (outcome) {
    case 'FAVORABLE':
      return {
        label: 'Sentido Favorable',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      };
    case 'DESFAVORABLE':
      return {
        label: 'Desfavorable',
        className: 'bg-rose-50 text-rose-700 border border-rose-200'
      };
    case 'PARCIAL':
      return {
        label: 'Favorable Parcial',
        className: 'bg-amber-50 text-amber-700 border border-amber-200'
      };
    case 'EN_TRAMITE':
    default:
      return {
        label: 'En Trámite',
        className: 'bg-blue-50 text-blue-700 border border-blue-200'
      };
  }
};

export const CaseTimeline: React.FC<CaseTimelineProps> = ({
  caseDetails,
  onNavigateToChat,
  className = ''
}) => {
  const navigate = useNavigate();

  // Estados de interacción
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(() => {
    // Seleccionar por defecto el hito más reciente o de casación
    const casacionMs = caseDetails.milestones.find(m => m.type === 'SENTENCIA_CASACION');
    if (casacionMs) return casacionMs.id;
    return caseDetails.milestones[caseDetails.milestones.length - 1]?.id || null;
  });

  const [filterInstance, setFilterInstance] = useState<string>('TODAS');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC'); // Cronológico o inverso
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [summaryMilestone, setSummaryMilestone] = useState<CaseMilestone | null>(null);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // Filtrado y ordenamiento de hitos
  const processedMilestones = useMemo(() => {
    let list = [...caseDetails.milestones];

    if (filterInstance !== 'TODAS') {
      list = list.filter(m => m.instance === filterInstance);
    }

    list.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [caseDetails.milestones, filterInstance, sortOrder]);

  const selectedMilestone = useMemo(() => {
    return caseDetails.milestones.find(m => m.id === selectedMilestoneId) || processedMilestones[0];
  }, [caseDetails.milestones, selectedMilestoneId, processedMilestones]);

  // Generación automática de la cita APA 7.ª edición para el hito seleccionado
  const selectedMilestoneApaCitation = useMemo(() => {
    if (!selectedMilestone) return null;
    return generateApaCitationFromMilestone(selectedMilestone, caseDetails);
  }, [selectedMilestone, caseDetails]);

  const handleAnalyzeInChat = (milestone: CaseMilestone) => {
    const prompt = `Analiza detalladamente el hito judicial "${milestone.title}" (${milestone.displayDate}) correspondiente al proceso con radicado ${caseDetails.radicado}. Autoridad: ${milestone.authority}. Criterio o fragmento relevante: "${milestone.rulingExcerpt || milestone.description}". ¿Qué implicaciones probatorias o de casación tiene para este caso?`;

    if (onNavigateToChat) {
      onNavigateToChat(prompt);
    } else {
      navigate('/chat', { state: { initialPrompt: prompt } });
    }
  };

  const handleOpenExecutiveSummary = (milestone: CaseMilestone) => {
    setSummaryMilestone(milestone);
    setIsSummaryModalOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Barra de Filtros y Orden de la Línea de Tiempo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Instancia:
          </span>
          {['TODAS', 'Primera Instancia', 'Segunda Instancia', 'Corte Suprema'].map((inst) => (
            <button
              key={inst}
              onClick={() => setFilterInstance(inst)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterInstance === inst
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {inst === 'TODAS' ? 'Todas las Etapas' : inst}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="btn-timeline-terminos-cgp"
            onClick={() => setShowTermsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all cursor-pointer shadow-xs"
            title="Ver tabla comparativa automática de términos procesales vencidos y próximos vencimientos según el CGP"
          >
            <Scale className="w-3.5 h-3.5 text-slate-950" />
            <span>Términos CGP</span>
          </button>

          <span className="text-slate-400 font-medium">Orden:</span>
          <button
            onClick={() => setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            {sortOrder === 'ASC' ? 'Cronológico (Inicio → Casación)' : 'Inverso (Más Reciente Primero)'}
          </button>
        </div>
      </div>

      {/* Estructura Principal: Línea de Tiempo a la Izquierda + Panel de Detalle del Hito a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: LÍNEA DE TIEMPO INTERACTIVA (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Hitos y Providencias del Proceso ({processedMilestones.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Seleccione un hito para inspeccionar consideraciones, providencias y anexos.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Línea Procesal Verificada
            </span>
          </div>

          {/* Contenedor del eje de la línea de tiempo */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[19px] sm:before:left-[27px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {processedMilestones.map((milestone, idx) => {
              const visuals = getMilestoneVisuals(milestone.type, milestone.outcome);
              const IconComp = visuals.icon;
              const isSelected = selectedMilestone?.id === milestone.id;
              const outcomeBadge = getOutcomeBadge(milestone.outcome);

              return (
                <div 
                  key={milestone.id}
                  onClick={() => setSelectedMilestoneId(milestone.id)}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    isSelected ? 'scale-[1.01]' : 'hover:translate-x-1'
                  }`}
                >
                  {/* Nodo circular del hito en el eje */}
                  <div 
                    className={`absolute -left-[27px] sm:-left-[35px] top-3.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${visuals.nodeBg} ${
                      isSelected ? 'ring-indigo-300 ring-4 shadow-md scale-110' : 'opacity-90 group-hover:opacity-100'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Tarjeta del Hito */}
                  <div 
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-indigo-50/40 border-indigo-300 shadow-md ring-1 ring-indigo-200' 
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {/* Fila superior: Fecha, Instancia y Sentido */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-slate-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          {milestone.displayDate}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${visuals.badgeBg}`}>
                          {visuals.badgeText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {milestone.outcome && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${outcomeBadge.className}`}>
                            {outcomeBadge.label}
                          </span>
                        )}
                        {milestone.isCritical && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                            Hito Clave
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Título y Autoridad */}
                    <h4 className={`text-sm font-bold tracking-tight mb-1 ${
                      isSelected ? 'text-indigo-950 font-black' : 'text-slate-900'
                    }`}>
                      {milestone.title}
                    </h4>

                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium mb-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{milestone.authority}</span>
                    </p>

                    {/* Síntesis o extracto */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                      {milestone.description}
                    </p>

                    {/* Sentencia Vinculada Destacada si existe */}
                    {milestone.linkedSentencia && (
                      <div className="mt-3 p-2.5 rounded-xl bg-indigo-600/5 border border-indigo-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gavel className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-black text-indigo-900">
                              {milestone.linkedSentencia.providencia}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 text-[11px] truncate max-w-[160px]">
                              {milestone.linkedSentencia.chamber}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-100 shadow-2xs">
                            {milestone.linkedSentencia.impactLabel || 'Casación'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenExecutiveSummary(milestone);
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Resumen Ejecutivo IA (Puntos Clave)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA DERECHA: PANEL DE DETALLES DEL HITO SELECCIONADO (5 columnas) */}
        <div className="lg:col-span-5 space-y-5 sticky top-6">
          {selectedMilestone ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-6">
              {/* Encabezado del Panel de Detalle */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                    {selectedMilestone.instance}
                  </span>
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedMilestone.displayDate}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {selectedMilestone.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {selectedMilestone.authority}
                </p>
              </div>

              {/* Sentido y Estado */}
              {selectedMilestone.outcome && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-600">Sentido de la Resolución:</span>
                  <span className={`font-black px-2.5 py-1 rounded-lg ${getOutcomeBadge(selectedMilestone.outcome).className}`}>
                    {getOutcomeBadge(selectedMilestone.outcome).label}
                  </span>
                </div>
              )}

              {/* Descripción Procesal Completa */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Descripción Procesal
                </label>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                  {selectedMilestone.description}
                </p>
              </div>

              {/* Criterio Jurídico o Fragmento Relevante */}
              {selectedMilestone.rulingExcerpt && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Criterio / Consideración Clave
                  </label>
                  <blockquote className="p-3.5 rounded-2xl bg-indigo-50/60 border-l-4 border-indigo-600 text-xs italic text-indigo-950 font-serif leading-relaxed">
                    "{selectedMilestone.rulingExcerpt}"
                  </blockquote>
                </div>
              )}

              {/* Sentencia de Casación Vinculada */}
              {selectedMilestone.linkedSentencia && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Gavel className="w-3.5 h-3.5 text-indigo-400" />
                      Precedente Vinculante de Casación
                    </span>
                    <span className="text-[10px] font-bold bg-white/10 text-slate-200 px-2 py-0.5 rounded">
                      CSJ
                    </span>
                  </div>
                  <div>
                    <h5 className="font-black text-sm text-white">
                      {selectedMilestone.linkedSentencia.providencia}
                    </h5>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {selectedMilestone.linkedSentencia.chamber}
                    </p>
                  </div>
                  {selectedMilestone.linkedSentencia.magistradoPonente && (
                    <p className="text-[11px] text-slate-400 font-medium">
                      M.P.: {selectedMilestone.linkedSentencia.magistradoPonente}
                    </p>
                  )}
                </div>
              )}

              {/* Anexos o Piezas del Hito */}
              {selectedMilestone.attachments && selectedMilestone.attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Piezas Procesales y Actas Adjuntas ({selectedMilestone.attachments.length})
                  </label>
                  <div className="space-y-2">
                    {selectedMilestone.attachments.map((att, attIdx) => (
                      <div 
                        key={attIdx} 
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[180px]">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium">{att.size}</span>
                          <button 
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                            title="Descargar copia"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cita Bibliográfica Automática en Formato APA 7.ª Edición */}
              {selectedMilestoneApaCitation && (
                <div className="space-y-1.5">
                  <ApaCitationCard
                    citation={selectedMilestoneApaCitation}
                    variant="compact"
                    title="Cita APA 7.ª Edición"
                  />
                </div>
              )}

              {/* Acciones del Hito: Resumen Ejecutivo IA y Consulta en Chat */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <button
                  id="btn-generar-resumen-ejecutivo-sentencia"
                  type="button"
                  onClick={() => handleOpenExecutiveSummary(selectedMilestone)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-900 hover:from-slate-900 hover:to-indigo-800 text-white text-xs font-black tracking-wide flex items-center justify-between gap-3 shadow-xl shadow-indigo-950/25 transition-all active:scale-[0.99] border border-indigo-500/40 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 border border-amber-400/30">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-xs text-white">
                        Generar Resumen Ejecutivo con IA
                      </span>
                      <span className="block text-[10px] text-indigo-200/90 font-medium">
                        Destacar Ratio Decidendi y puntos legales clave
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleAnalyzeInChat(selectedMilestone)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 border border-indigo-200/80 transition-all active:scale-98 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Profundizar en Chat con IA</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold">Seleccione un hito de la línea de tiempo</p>
            </div>
          )}

          {/* Tarjeta Informativa del Expediente */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garantía de Cadena Procesal</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Los hitos y providencias son sincronizados con los estados electrónicos de la Rama Judicial y la relatoría de la Corte Suprema.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Resumen Ejecutivo de la Sentencia Generado con IA */}
      <RulingExecutiveSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        milestone={summaryMilestone}
        caseDetails={caseDetails}
        onNavigateToChat={onNavigateToChat}
      />

      {/* Modal de Tabla Comparativa de Términos Procesales CGP */}
      <ProceduralTermsModal
        isOpen={showTermsModal}
        expediente={{
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
        documents={[]}
        onClose={() => setShowTermsModal(false)}
        onNavigateToChat={onNavigateToChat}
      />
    </div>
  );
};

export default CaseTimeline;
