import React, { useState, useEffect } from 'react';
import { 
  Bell, Scale, Sparkles, RefreshCw, SlidersHorizontal, 
  CheckCheck, Bookmark, ChevronRight, FileDown, MessageSquare, 
  Eye, CheckCircle, ArrowUpRight, AlertCircle, FileText,
  Filter, Tag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResearchTopic, SupremeCourtAlert, SupremeCourtChamber } from '../../types';
import { SupremeCourtAlertsService } from '../../services/alerts/supremeCourtAlertsService';
import { exportExecutiveSummaryToPDF } from '../../services/export/pdfExporter';
import { ManageTopicsModal } from './ManageTopicsModal';
import { SupremeCourtDetailModal } from './SupremeCourtDetailModal';

interface SupremeCourtAlertsSectionProps {
  onNavigateToChatWithPrompt?: (prompt: string) => void;
  className?: string;
}

export const SupremeCourtAlertsSection: React.FC<SupremeCourtAlertsSectionProps> = ({
  onNavigateToChatWithPrompt,
  className = ''
}) => {
  const navigate = useNavigate();

  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [alerts, setAlerts] = useState<SupremeCourtAlert[]>([]);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('ALL');
  const [selectedChamberFilter, setSelectedChamberFilter] = useState<string>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [isManageTopicsOpen, setIsManageTopicsOpen] = useState(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<SupremeCourtAlert | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedTopics = SupremeCourtAlertsService.getTopics();
    const loadedAlerts = SupremeCourtAlertsService.getAlerts();
    setTopics(loadedTopics);
    setAlerts(loadedAlerts);
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const activeTopicsCount = topics.filter(t => t.isActive).length;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const result = await SupremeCourtAlertsService.syncAlerts();
      setAlerts(result.alerts);
      if (result.newCount > 0) {
        setSyncNotice(`Se identificó ${result.newCount} nueva providencia de Casación coincidente.`);
      } else {
        setSyncNotice('Boletines al día. No hay nuevas sentencias para sus temas guardados.');
      }
      setTimeout(() => setSyncNotice(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMarkAllRead = () => {
    const updated = SupremeCourtAlertsService.markAllAsRead();
    setAlerts(updated);
  };

  const handleToggleRead = (id: string, currentRead: boolean) => {
    const updated = SupremeCourtAlertsService.markAsRead(id, !currentRead);
    setAlerts(updated);
  };

  const handleToggleBookmark = (id: string) => {
    const updated = SupremeCourtAlertsService.toggleBookmark(id);
    setAlerts(updated);
  };

  const handleSaveTopic = (topic: ResearchTopic) => {
    const updated = SupremeCourtAlertsService.saveTopic(topic);
    setTopics(updated);
  };

  const handleDeleteTopic = (id: string) => {
    const updated = SupremeCourtAlertsService.deleteTopic(id);
    setTopics(updated);
  };

  const handleToggleTopic = (id: string) => {
    const updated = SupremeCourtAlertsService.toggleTopicActive(id);
    setTopics(updated);
  };

  const handleAnalyzeInChat = (alert: SupremeCourtAlert) => {
    const prompt = `Analiza la Sentencia de la Corte Suprema de Justicia ${alert.providencia} (${alert.radicado}, M.P. ${alert.magistradoPonente}). Explica su ratio decidendi respecto al tema "${alert.topicName}" y cómo puedo aplicarla o contrastarla en mi caso judicial concreto.`;
    
    if (onNavigateToChatWithPrompt) {
      onNavigateToChatWithPrompt(prompt);
    } else {
      navigate('/chat', { state: { initialPrompt: prompt } });
    }
  };

  const handleDirectPDF = async (e: React.MouseEvent, alert: SupremeCourtAlert) => {
    e.stopPropagation();
    try {
      const summary = SupremeCourtAlertsService.toExecutiveSummary(alert);
      await exportExecutiveSummaryToPDF(summary, {
        lawFirmName: 'LEGISAI COLOMBIA • MONITOR DE CASACIÓN CSJ',
        notes: `Notificación de alerta para el tema: ${alert.topicName}.`
      });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      window.alert('Error al generar el PDF.');
    }
  };

  // Filtrado
  const filteredAlerts = alerts.filter(alert => {
    if (selectedTopicFilter !== 'ALL' && alert.topicId !== selectedTopicFilter) {
      return false;
    }
    if (selectedChamberFilter !== 'ALL' && alert.chamber !== selectedChamberFilter) {
      return false;
    }
    if (onlyUnread && alert.isRead) {
      return false;
    }
    if (onlyBookmarked && !alert.isBookmarked) {
      return false;
    }
    return true;
  });

  return (
    <section className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header de la sección de Alertas */}
      <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Scale className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-black text-white items-center justify-center">
                    {unreadCount}
                  </span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  Alertas de la Corte Suprema de Justicia
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-rose-500/90 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Notificaciones automáticas según sus {activeTopicsCount} temas de investigación activos
              </p>
            </div>
          </div>

          {/* Botones de acción principales */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Consultar últimas providencias de relatoría"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={() => setIsManageTopicsOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-900/40 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Gestionar Temas ({topics.length})</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium px-2.5 py-2 rounded-xl hover:bg-white/5 transition-all"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Leídas</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync notification banner */}
        {syncNotice && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}
      </div>

      {/* Barra de Filtros por Tema y Sala */}
      <div className="p-4 sm:px-8 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedTopicFilter('ALL')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              selectedTopicFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
            }`}
          >
            Todos ({alerts.length})
          </button>

          {topics.map(topic => {
            const count = alerts.filter(a => a.topicId === topic.id).length;
            const isSelected = selectedTopicFilter === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicFilter(topic.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span className="max-w-[160px] truncate">{topic.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtros rápidos: Sala / No leídas */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedChamberFilter}
            onChange={(e) => setSelectedChamberFilter(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Todas las Salas</option>
            <option value="SALA_LABORAL">Casación Laboral</option>
            <option value="SALA_PENAL">Casación Penal</option>
            <option value="SALA_CIVIL">Casación Civil</option>
          </select>

          <button
            onClick={() => setOnlyUnread(!onlyUnread)}
            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
              onlyUnread 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            No leídas
          </button>

          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={`p-1.5 rounded-xl border transition-all ${
              onlyBookmarked 
                ? 'bg-amber-50 text-amber-600 border-amber-200' 
                : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Mostrar solo guardadas"
          >
            <Bookmark className={`w-4 h-4 ${onlyBookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de Tarjetas de Alerta */}
      <div className="p-6 sm:p-8 space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            <Scale className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">No hay alertas con los filtros seleccionados</h4>
            <p className="text-xs text-slate-500 mt-1">
              Pruebe cambiando los filtros de Sala o tema, o agregue nuevos temas en "Gestionar Temas".
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div 
              key={alert.id}
              onClick={() => {
                if (!alert.isRead) handleToggleRead(alert.id, false);
                setSelectedAlertForDetail(alert);
              }}
              className={`p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer group ${
                !alert.isRead 
                  ? 'bg-gradient-to-br from-indigo-50/40 via-white to-white border-indigo-200 shadow-sm hover:border-indigo-400' 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {/* Barra superior de la tarjeta */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge de Sala */}
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                    alert.chamber === 'SALA_LABORAL'
                      ? 'bg-indigo-100 text-indigo-800'
                      : alert.chamber === 'SALA_PENAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {alert.chamberLabel}
                  </span>

                  {/* Impacto jurisprudencial */}
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    alert.impactOnPrecedent === 'CAMBIO_JURISPRUDENCIAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : alert.impactOnPrecedent === 'PRECISION_DOCTRINAL'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {alert.impactOnPrecedent.replace(/_/g, ' ')}
                  </span>

                  {/* Tema coincidente */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Tema: {alert.topicName}</span>
                    <span className="text-indigo-600 font-bold">({alert.relevanceScore}% match)</span>
                  </div>

                  {!alert.isRead && (
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600" title="Alerta no leída"></span>
                  )}
                </div>

                {/* Fecha y Marcadores */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 font-medium">
                    {alert.fecha}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(alert.id);
                    }}
                    className={`p-1.5 rounded-lg border transition-all ${
                      alert.isBookmarked 
                        ? 'bg-amber-50 text-amber-600 border-amber-200' 
                        : 'text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title={alert.isBookmarked ? 'Guardada' : 'Guardar'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${alert.isBookmarked ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleRead(alert.id, alert.isRead);
                    }}
                    className={`p-1.5 rounded-lg border transition-all ${
                      alert.isRead 
                        ? 'text-slate-400 hover:text-slate-700 border-slate-200 hover:bg-slate-100' 
                        : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                    }`}
                    title={alert.isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Título de la Providencia */}
              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                  <span>{alert.providencia}</span>
                  <span className="text-xs font-normal text-slate-500">({alert.radicado})</span>
                  <span className="text-xs font-medium text-slate-400">• M.P. {alert.magistradoPonente}</span>
                </h3>

                <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                  {alert.sintesis}
                </p>
              </div>

              {/* Criterio Vinculante (Ratio Decidendi) Highlight */}
              <div className="mt-3 p-3.5 bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl text-xs text-slate-800 leading-relaxed">
                <span className="font-bold text-indigo-900 block mb-0.5 text-[11px] uppercase tracking-wider">
                  Ratio Decidendi:
                </span>
                "{alert.ratioDecidendi}"
              </div>

              {/* Acciones de la Tarjeta */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Normas:</span>
                  <span className="truncate max-w-[280px] sm:max-w-md">{alert.normasAplicadas.join(', ')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDirectPDF(e, alert)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all"
                    title="Descargar Ficha en PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!alert.isRead) handleToggleRead(alert.id, false);
                      setSelectedAlertForDetail(alert);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeInChat(alert);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-indigo-600 px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Analizar en Chat</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Temas de Investigación */}
      <ManageTopicsModal
        isOpen={isManageTopicsOpen}
        onClose={() => setIsManageTopicsOpen(false)}
        topics={topics}
        onSaveTopic={handleSaveTopic}
        onDeleteTopic={handleDeleteTopic}
        onToggleTopic={handleToggleTopic}
      />

      {/* Modal de Detalle de Providencia CSJ */}
      <SupremeCourtDetailModal
        isOpen={Boolean(selectedAlertForDetail)}
        onClose={() => setSelectedAlertForDetail(null)}
        alert={selectedAlertForDetail}
        onAnalyzeInChat={handleAnalyzeInChat}
        onToggleBookmark={handleToggleBookmark}
      />
    </section>
  );
};
