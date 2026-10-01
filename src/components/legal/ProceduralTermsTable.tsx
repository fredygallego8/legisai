import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Scale, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Filter, 
  Search, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Info,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Expediente, LegalDocument, ProceduralTerm, ProceduralTermsComparativeSummary, TermStatus } from '../../types';
import { ProceduralTermsService } from '../../services/legal/proceduralTermsService';

interface ProceduralTermsTableProps {
  expediente: Expediente;
  documents: LegalDocument[];
  onNavigateToChat?: (prompt: string) => void;
  className?: string;
}

export const ProceduralTermsTable: React.FC<ProceduralTermsTableProps> = ({
  expediente,
  documents,
  onNavigateToChat,
  className = ''
}) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<'TODOS' | TermStatus>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMd, setCopiedMd] = useState(false);
  const [selectedTermDetail, setSelectedTermDetail] = useState<ProceduralTerm | null>(null);

  // Generar automáticamente el resumen y tabla comparativa para el expediente activo
  const summary: ProceduralTermsComparativeSummary = useMemo(() => {
    return ProceduralTermsService.generateComparativeTable(expediente, documents);
  }, [expediente, documents]);

  // Filtrado reactivo de términos
  const filteredTerms = useMemo(() => {
    return summary.terms.filter(term => {
      const matchesStatus = statusFilter === 'TODOS' || term.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        term.actName.toLowerCase().includes(query) ||
        term.legalBasisCgp.toLowerCase().includes(query) ||
        (term.documentOriginName && term.documentOriginName.toLowerCase().includes(query)) ||
        term.consequence.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [summary.terms, statusFilter, searchQuery]);

  const handleDownloadCsv = () => {
    const csvContent = ProceduralTermsService.exportToCsv(summary);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `terminos_procesales_cgp_${expediente.radicado.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = async () => {
    const md = ProceduralTermsService.exportToMarkdown(summary);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2200);
    } catch (e) {
      console.error('Error al copiar Markdown:', e);
    }
  };

  const handleConsultRag = (term: ProceduralTerm) => {
    const prompt = `Analiza detalladamente bajo el Código General del Proceso (CGP - Ley 1564 de 2012) el siguiente término procesal correspondiente al expediente radicado ${expediente.radicado}:
- Actuación: "${term.actName}"
- Documento de origen en el expediente: "${term.documentOriginName || 'N/A'}"
- Base legal CGP: ${term.legalBasisCgp} (${term.legalTermDays} días ${term.termType})
- Fecha de inicio/notificación: ${term.startDisplayDate}
- Fecha de vencimiento: ${term.dueDisplayDate}
- Estado actual: ${term.status} (${term.daysRemainingOrOverdue > 0 ? `faltan ${term.daysRemainingOrOverdue} días` : `venció hace ${Math.abs(term.daysRemainingOrOverdue)} días`})
- Consecuencia procesal: "${term.consequence}"

¿Cuáles son las consecuencias exactas de la preclusión o ejecutoria de este término procesal según el CGP y la jurisprudencia de la Sala de Casación Civil de la Corte Suprema de Justicia?`;

    if (onNavigateToChat) {
      onNavigateToChat(prompt);
    } else {
      navigate('/chat', { state: { initialPrompt: prompt } });
    }
  };

  return (
    <div className={`space-y-6 ${className}`} id="tabla-comparativa-terminos-cgp">
      {/* 1. CABECERA Y METRICAS COMPARATIVAS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Scale className="w-3 h-3 text-indigo-600" />
                Control de Términos CGP
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                Rad. {expediente.radicado}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tabla Comparativa de Términos Procesales y Vencimientos
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Extracción y cómputo automatizado de los plazos judiciales del expediente activo bajo las reglas del Art. 118 del Código General del Proceso (excluyendo días no hábiles y feriados judiciales).
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar tabla comparativa en formato Markdown para memoriales o informes"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? '¡Copiado!' : 'Copiar Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              title="Descargar tabla comparativa en formato CSV / Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas Comparativas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {/* Total Términos */}
          <div 
            onClick={() => setStatusFilter('TODOS')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'TODOS' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span>Total Analizados</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {summary.totalTerms}
            </div>
            <span className="text-[10px] opacity-70 block mt-0.5">Actuaciones del expediente</span>
          </div>

          {/* Vencidos */}
          <div 
            onClick={() => setStatusFilter('VENCIDO')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'VENCIDO' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                : 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                Términos Vencidos
              </span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {summary.expiredCount}
            </div>
            <span className="text-[10px] opacity-70 block mt-0.5">Precluidos / Ejecutoriados</span>
          </div>

          {/* Próximos a Vencer */}
          <div 
            onClick={() => setStatusFilter('PROXIMO_A_VENCER')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'PROXIMO_A_VENCER' 
                ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Próximos Vencimientos
              </span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {summary.upcomingCount}
            </div>
            <span className="text-[10px] opacity-70 block mt-0.5">Términos en curso activo</span>
          </div>

          {/* Cumplidos */}
          <div 
            onClick={() => setStatusFilter('CUMPLIDO')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'CUMPLIDO' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Cumplidos en Término
              </span>
              <Check className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black">
              {summary.completedCount}
            </div>
            <span className="text-[10px] opacity-70 block mt-0.5">Actuaciones oportunas</span>
          </div>
        </div>

        {/* Filtros rápidos y buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Filtro de Píldoras */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filtrar:
            </span>
            {[
              { key: 'TODOS', label: `Todos (${summary.totalTerms})` },
              { key: 'PROXIMO_A_VENCER', label: `🟡 Próximos (${summary.upcomingCount})` },
              { key: 'VENCIDO', label: `🔴 Vencidos (${summary.expiredCount})` },
              { key: 'CUMPLIDO', label: `🟢 Cumplidos (${summary.completedCount})` }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setStatusFilter(item.key as any)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                  statusFilter === item.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por acto, artículo o documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 2. TABLA COMPARATIVA PRINCIPAL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3.5 px-4">Actuación / Documento Origen</th>
                <th className="py-3.5 px-4">Base Legal CGP</th>
                <th className="py-3.5 px-4">Notificación / Inicio</th>
                <th className="py-3.5 px-4">Vencimiento Legal</th>
                <th className="py-3.5 px-4">Estado del Término</th>
                <th className="py-3.5 px-4">Consecuencia Jurídica</th>
                <th className="py-3.5 px-4 text-right">RAG Gemini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredTerms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron términos con el filtro seleccionado</p>
                    <p className="text-xs text-slate-400 mt-1">Seleccione "Todos" o ajuste su búsqueda</p>
                  </td>
                </tr>
              ) : (
                filteredTerms.map((term) => {
                  const isExpired = term.status === 'VENCIDO';
                  const isUpcoming = term.status === 'PROXIMO_A_VENCER';
                  const isCompleted = term.status === 'CUMPLIDO';

                  return (
                    <tr 
                      key={term.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUpcoming ? 'bg-amber-50/30' : isExpired ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Actuación y Documento */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {term.actName}
                        </div>
                        {term.documentOriginName && (
                          <div className="text-[11px] text-indigo-600 flex items-center gap-1 mt-1 font-mono">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate" title={term.documentOriginName}>
                              {term.documentOriginName}
                            </span>
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Sujeto: <strong className="text-slate-600">{term.relevantParty}</strong>
                        </span>
                      </td>

                      {/* Base Legal CGP */}
                      <td className="py-4 px-4">
                        <span className="inline-block bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-[11px] font-mono">
                          {term.legalBasisCgp}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Plazo: <strong>{term.legalTermDays} días {term.termType.toLowerCase()}</strong>
                        </span>
                      </td>

                      {/* Inicio / Notificación */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{term.startDisplayDate}</div>
                        <span className="text-[10px] text-slate-400 max-w-[140px] block truncate" title={term.startEventDescription}>
                          {term.startEventDescription}
                        </span>
                      </td>

                      {/* Vencimiento */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className={`font-black text-[13px] ${
                          isExpired ? 'text-rose-600' : isUpcoming ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {term.dueDisplayDate}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Art. 118 CGP
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isExpired && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              Vencido
                            </span>
                            <span className="text-[10px] text-rose-600 font-bold block">
                              Precluyó el plazo legal
                            </span>
                          </div>
                        )}

                        {isUpcoming && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                              Próximo Vencimiento
                            </span>
                            <span className="text-[10px] text-amber-700 font-black block">
                              Quedan {term.daysRemainingOrOverdue} días hábiles
                            </span>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Cumplido a Tiempo
                            </span>
                            {term.completedDisplayDate && (
                              <span className="text-[10px] text-emerald-600 block">
                                Radicado: {term.completedDisplayDate}
                              </span>
                            )}
                          </div>
                        )}

                        {term.status === 'PENDIENTE' && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                            <Clock className="w-3 h-3" />
                            En Trámite
                          </span>
                        )}
                      </td>

                      {/* Consecuencia Jurídica */}
                      <td className="py-4 px-4 text-slate-600 max-w-xs text-[11px] leading-relaxed">
                        <p>{term.consequence}</p>
                        {term.actionTaken && (
                          <div className="text-[10px] text-slate-500 mt-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <strong>Actuación en expediente:</strong> {term.actionTaken}
                          </div>
                        )}
                      </td>

                      {/* Acción RAG */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleConsultRag(term)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer border border-indigo-200"
                          title="Consultar análisis y jurisprudencia con Gemini RAG"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>Auditar RAG</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla explicativo de las reglas del CGP */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Regla CGP Art. 118:</strong> Los términos en días hábiles se computan a partir del día siguiente a la notificación de la providencia y no incluyen sábados, domingos ni días de vacancia judicial.
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredTerms.length} de {summary.totalTerms} términos filtrados
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProceduralTermsTable;
