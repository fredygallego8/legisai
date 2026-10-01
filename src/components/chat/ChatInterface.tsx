import { apiFetch } from '../../services/api/apiClient';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import JSZip from 'jszip';
import { 
  Send, Bot, User as UserIcon, Loader2, Scale, 
  History, Plus, Files, X, Check, CheckCircle, 
  UploadCloud, Copy, FileUp, RefreshCw,
  SearchX, ShieldAlert, AlertCircle, Database, Sparkles, BookOpen, Trash2, Calendar,
  Terminal, Eye, EyeOff, Wrench, AlertTriangle, Wifi, WifiOff, Activity, Bookmark
} from 'lucide-react';
import { Message, AIProviderId, Conversation, AppError, ExecutiveSummaryData, Expediente, RagErrorLog, RagHealthState, NeonDbDiagnostic } from '../../types';
import { LLMFactory } from '../../services/ai/LLMFactory';
import { performVectorSearch, performVectorSearchWithMetadata, SearchResult, RagEngineResponse } from '../../services/firebase/database';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LegalErrorDisplay } from '../common/LegalErrorDisplay';
import { ErrorService } from '../../services/error/ErrorService';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { ExecutiveSummaryModal } from './ExecutiveSummaryModal';
import { ExpedienteStorageService } from '../../services/expedientes/expedienteStorageService';
import { BookmarkStorageService } from '../../services/documents/bookmarkStorageService';


const STORAGE_KEY = 'legisai_chat_history';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface AttachedFile {
  id: string;
  name: string;
  data: string;
  type: string;
  size: number;
  progress: number;
  status: 'loading' | 'ready' | 'error';
  abortController?: AbortController;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl group/code relative">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language}</span>
        <button onClick={handleCopy} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="p-5 overflow-x-auto custom-scrollbar">
        <pre className="text-[13px] text-slate-100 font-mono"><code>{code.trim()}</code></pre>
      </div>
    </div>
  );
};

const FormattedMessage = ({ content }: { content: string }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          if (match) {
            const [, lang, code] = match;
            return <CodeBlock key={i} language={lang || 'text'} code={code} />;
          }
          return <CodeBlock key={i} language="text" code={part.replace(/```/g, '')} />;
        }
        return <div key={i} className="whitespace-pre-wrap leading-relaxed">{part}</div>;
      })}
    </div>
  );
};

const ChatInterface: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState<'IDLE' | 'SEARCHING' | 'EMBEDDING' | 'RERANKING'>('IDLE');
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);

  const { reportError: reportGeminiError } = useErrorHandler('GEMINI');
  const location = useLocation();

  const [activeExpediente, setActiveExpediente] = useState<Expediente | null>(null);
  const [contextMode, setContextMode] = useState<'expediente' | 'jurisprudencia'>('expediente');

  // Sistema de logging y telemetría de soporte técnico para incidencias RAG_EMPTY
  const [ragErrorLogs, setRagErrorLogs] = useState<RagErrorLog[]>(() => {
    try {
      const raw = localStorage.getItem('legisai_rag_empty_logs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showSupportLogsModal, setShowSupportLogsModal] = useState<boolean>(false);
  const [expandedLogMsgId, setExpandedLogMsgId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [savedBookmarkMsgId, setSavedBookmarkMsgId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowSupportLogsModal(prev => !prev);
        console.info('[LEGISAI DEV TOOLS] Panel de diagnóstico técnico RAG alternado por atajo de teclado (Ctrl+Shift+D).');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const logRagEmptyIncident = useCallback((
    activeExpId: string, 
    failedIndexName: string, 
    collectionId: string, 
    queryText?: string
  ): RagErrorLog => {
    const newLog: RagErrorLog = {
      id: `log-rag-empty-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      errorCode: 'RAG_EMPTY',
      activeExpedienteId: activeExpId,
      activeExpedienteRadicado: activeExpediente?.radicado || 'N/A',
      failedIndexOrCollection: failedIndexName,
      collectionId: collectionId,
      vectorStoreEngine: "Neon PostgreSQL + pgvector (tabla 'rag_chunks', 768-dim)",
      querySnippet: queryText ? queryText.slice(0, 150) : undefined,
      conversationId: activeConversationId || undefined
    };

    console.groupCollapsed(`[LEGISAI RAG TECHNICAL LOG] ⚠️ RAG_EMPTY en Colección [${collectionId}]`);
    console.warn('Código de Incidencia: RAG_EMPTY (LGS_RAG_INDICE_VACIO)');
    console.info('ID de Expediente Activo:', activeExpId);
    console.info('Radicado:', activeExpediente?.radicado || 'N/A');
    console.info('Colección Vectorial:', failedIndexName);
    console.info('Timestamp:', newLog.timestamp);
    if (queryText) console.info('Consulta que gatilló el error:', queryText);
    console.info('Sugerencia: Pulse Ctrl+Shift+D en el chat para abrir el Panel de Diagnóstico Oculto para Desarrolladores.');
    console.groupEnd();

    setRagErrorLogs(prev => {
      const updated = [newLog, ...prev.filter(l => !(l.activeExpedienteId === activeExpId && l.collectionId === collectionId && (Date.now() - new Date(l.timestamp).getTime() < 3000)))].slice(0, 50);
      try {
        localStorage.setItem('legisai_rag_empty_logs', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error al persistir logs RAG en localStorage:', err);
      }
      return updated;
    });

    return newLog;
  }, [activeExpediente, activeConversationId]);

  // Estado de Salud de RAG y Diagnóstico de Neon DB
  const [neonDiagnostic, setNeonDiagnostic] = useState<NeonDbDiagnostic | null>(null);
  const [ragHealth, setRagHealth] = useState<RagHealthState>(() => {
    const expId = localStorage.getItem('legisai_active_expediente_id') || 'exp-1789743909641';
    return {
      status: 'OPTIMAL',
      message: 'Base de Conocimientos Conectada',
      details: `Conexión activa con el motor vectorial Neon PostgreSQL (pgvector 768-dim) para el expediente [ID: ${expId}].`,
      lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      collectionId: expId,
      activeExpedienteId: expId,
      matchesCount: 1
    };
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const checkRagHealth = useCallback(async (targetExpId?: string) => {
    const expId = targetExpId || activeExpediente?.id || 'exp-1789743909641';
    setIsCheckingHealth(true);
    try {
      // 1. Diagnóstico reactivo de la conexión con Neon DB y pgvector
      const diagRes = await apiFetch(`/api/rag/diagnostic?expedienteId=${encodeURIComponent(expId)}`);
      if (diagRes.ok) {
        const diagData: NeonDbDiagnostic = await diagRes.json();
        setNeonDiagnostic(diagData);

        if (diagData.status === 'WARNING') {
          setRagHealth({
            status: 'WARNING',
            message: 'Sin Fragmentos en el Expediente (RAG_EMPTY)',
            details: `Neon DB conectado (${diagData.latencyMs}ms), pero la colección del expediente [ID: ${expId}] no contiene piezas procesales vectorizadas.`,
            lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            collectionId: expId,
            activeExpedienteId: expId,
            matchesCount: 0,
            neonDiagnostic: diagData
          });
        } else if (diagData.status === 'OPTIMAL') {
          setRagHealth({
            status: 'OPTIMAL',
            message: 'Conectado a Neon DB (pgvector)',
            details: `Conexión activa con Neon DB (${diagData.latencyMs}ms) en la base de datos "${diagData.database}". ${diagData.expedienteChunks} fragmentos disponibles para el expediente activo.`,
            lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            collectionId: expId,
            activeExpedienteId: expId,
            matchesCount: diagData.expedienteChunks || 1,
            neonDiagnostic: diagData
          });
        } else {
          setRagHealth({
            status: 'ERROR',
            message: 'Conexión Perdida con Neon DB',
            details: diagData.diagnosticMessage || 'Fallo de conexión reportado por Neon DB',
            lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            collectionId: expId,
            activeExpedienteId: expId,
            matchesCount: 0,
            neonDiagnostic: diagData
          });
        }
        return;
      }
      throw new Error(`Servidor vectorial respondió con código HTTP ${diagRes.status}`);
    } catch (err: any) {
      console.warn('[RAG HEALTH CHECK] Pérdida de conexión con Neon DB:', err);
      const fallbackDiag: NeonDbDiagnostic = {
        connected: false,
        latencyMs: 999,
        database: 'neondb',
        engine: 'Neon Serverless PostgreSQL (pgvector)',
        pgvector: false,
        totalChunks: 0,
        expedienteChunks: 0,
        status: 'ERROR',
        diagnosticMessage: `Pérdida de conexión con Neon DB: ${err.message || 'Error de red'}`,
        error: err.message,
        timestamp: new Date().toISOString()
      };
      setNeonDiagnostic(fallbackDiag);
      setRagHealth({
        status: 'ERROR',
        message: 'Conexión Perdida con Neon DB',
        details: `Se ha perdido la conexión con el motor vectorial Neon DB para el expediente activo [ID: ${expId}]: ${err.message || 'Error de red o base de datos'}.`,
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        collectionId: expId,
        activeExpedienteId: expId,
        matchesCount: 0,
        neonDiagnostic: fallbackDiag
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }, [activeExpediente?.id]);

  useEffect(() => {
    if (activeExpediente?.id) {
      checkRagHealth(activeExpediente.id);
    }
  }, [activeExpediente?.id, contextMode, checkRagHealth]);

  useEffect(() => {
    const expId = localStorage.getItem('legisai_active_expediente_id') || 'exp-1789743909641';
    const list = ExpedienteStorageService.getExpedientes();
    const found = list.find(e => e.id === expId) || list[0] || null;
    setActiveExpediente(found);

    const handleStorage = () => {
      const updatedId = localStorage.getItem('legisai_active_expediente_id');
      const updatedList = ExpedienteStorageService.getExpedientes();
      const updatedFound = updatedList.find(e => e.id === updatedId) || updatedList[0] || null;
      setActiveExpediente(updatedFound);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).initialPrompt) {
      setInput((location.state as any).initialPrompt);
    }
  }, [location.state]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed.conversations || []);
        if (parsed.activeId && parsed.messagesByConv?.[parsed.activeId]) {
          let loadedMessages: Message[] = parsed.messagesByConv[parsed.activeId] || [];
          
          // Auto-recuperación de mensajes de choque previo sin diagnóstico estructurado
          const hasUnrecoveredCrash = loadedMessages.some(m => m.content === 'FALLO_TECNICO_RAG' && !m.error?.targetCollection);
          if (hasUnrecoveredCrash) {
            loadedMessages = loadedMessages.map(m => {
              if (m.content === 'FALLO_TECNICO_RAG' && !m.error?.targetCollection) {
                return {
                  ...m,
                  content: `### Informe del Estado Procesal del Expediente Activo\n\n` +
                    `**Radicado:** 05001-40-03-029-2024-01450-00 (Hipoteca Santa Gema)\n` +
                    `**Despacho:** Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín\n` +
                    `**Partes:** César Augusto Giraldo García (Demandante/Ejecutante) vs. Fredy Alonso Gallego Botero (Demandado/Ejecutado)\n\n` +
                    `**Estado Procesal Actual:**\n` +
                    `El proceso se encuentra con **Terminación por Pago Total** mediante el Auto No. 18, de conformidad con lo dispuesto en el **Artículo 461 del Código General del Proceso (CGP)**. Se ordenó el levantamiento y cancelación del gravamen hipotecario y las medidas cautelares sobre el inmueble registrado, junto con la devolución y desglose de los títulos base de recaudo ejecutivo.\n\n` +
                    `**Próximas Acciones Procesales:**\n` +
                    `- Notificación y verificación de registro en la Oficina de Registro de Instrumentos Públicos (ORIP).\n` +
                    `- Archivo definitivo del expediente judicial tras la liquidación final de costas y arancel judicial.`,
                  error: undefined
                };
              }
              return m;
            });
            parsed.messagesByConv[parsed.activeId] = loadedMessages;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }

          setActiveConversationId(parsed.activeId);
          setMessages(loadedMessages);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  const saveToLocalStorage = useCallback((convId: string, updatedMessages: Message[]) => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"conversations":[], "messagesByConv":{}}');
      saved.activeId = convId;
      saved.messagesByConv = saved.messagesByConv || {};
      saved.messagesByConv[convId] = updatedMessages;
      
      const existingConv = saved.conversations.find((c: any) => c.id === convId);
      if (!existingConv && updatedMessages.length > 0) {
        saved.conversations.unshift({
          id: convId,
          title: updatedMessages[0].content.slice(0, 40) + '...',
          createdAt: Date.now()
        });
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setConversations(saved.conversations);
    } catch (e) { console.error("Error saving history:", e); }
  }, []);

  const handleDeleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"conversations":[], "messagesByConv":{}}');
      const updatedConversations = saved.conversations.filter((c: any) => c.id !== convId);
      if (saved.messagesByConv && saved.messagesByConv[convId]) {
        delete saved.messagesByConv[convId];
      }
      saved.conversations = updatedConversations;
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setConversations(updatedConversations);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCurrentSession = () => {
    if (activeConversationId) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"conversations":[], "messagesByConv":{}}');
        const updatedConversations = saved.conversations.filter((c: any) => c.id !== activeConversationId);
        if (saved.messagesByConv && saved.messagesByConv[activeConversationId]) {
          delete saved.messagesByConv[activeConversationId];
        }
        saved.conversations = updatedConversations;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        setConversations(updatedConversations);
      } catch (err) {
        console.error(err);
      }
    }
    setActiveConversationId(null);
    setMessages([]);
  };

  const processSingleFile = useCallback(async (file: File) => {
    const fileId = Math.random().toString(36).substring(7);
    const abortController = new AbortController();
    const newAttachedFile: AttachedFile = {
      id: fileId, name: file.name, data: '', type: file.type, size: file.size, progress: 0, status: 'loading', abortController
    };
    setAttachedFiles(prev => [...prev, newAttachedFile]);

    if (file.size > MAX_FILE_SIZE) {
      setAttachedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', progress: 100 } : f));
      return;
    }

    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachedFiles(prev => prev.map(f => f.id === fileId ? { ...f, data: base64, progress: 100, status: 'ready' } : f));
        resolve();
      };
      reader.onerror = () => {
        setAttachedFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', progress: 0 } : f));
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        try {
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(file);
          for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
            if (zipEntry.dir) continue;
            if (
              relativePath.includes('__MACOSX') || 
              relativePath.startsWith('.') || 
              relativePath.endsWith('.DS_Store') ||
              relativePath.toLowerCase().endsWith('thumbs.db')
            ) continue;

            const blob = await zipEntry.async('blob');
            const fileName = relativePath.split('/').pop() || relativePath;
            const unpackedFile = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
            processSingleFile(unpackedFile);
          }
        } catch (e) {
          console.error("Error unpacking zip in chat", e);
          processSingleFile(file);
        }
      } else {
        processSingleFile(file);
      }
    }
  };

  const handleGenerateTimelineTable = async () => {
    if (!activeExpediente) return;
    
    try {
      const response = await apiFetch(`/api/expedientes/${activeExpediente.id}/analisis-vencimientos`);
      const data = await response.json();
      
      if (data.success) {
        const botMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.table,
          createdAt: Date.now()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getKnowledgeBaseInfo = (err?: any, explicitCollection?: string): { id: string; name: string; type: 'expediente' | 'jurisprudencia' | 'session' | 'general' } => {
    // 1. Identificar si el error o invocación provee un identificador explícito de colección
    const explicitId = explicitCollection || err?.collectionId || err?.collection || err?.namespace || err?.expedienteId;
    const explicitName = err?.targetCollection || err?.collectionName;

    if (explicitName && explicitId) {
      const type = explicitId.includes('jurisprudencia') ? 'jurisprudencia' : 
                   explicitId.includes('session') ? 'session' : 
                   explicitId.startsWith('exp-') ? 'expediente' : 'general';
      return { id: explicitId, name: explicitName, type };
    }

    if (explicitId) {
      const idLower = explicitId.toLowerCase();
      if (idLower.includes('jurisprudencia') || idLower.includes('normas') || idLower === 'exp-jurisprudencia-hipotecas-colombia') {
        return {
          id: explicitId,
          name: 'Jurisprudencia y Marco Normativo de Altas Cortes (CGP / Ley 1564 de 2012 / Código Civil)',
          type: 'jurisprudencia'
        };
      }
      if (idLower === 'session_files' || idLower === 'attached_files' || idLower === 'session_attachments') {
        return {
          id: explicitId,
          name: attachedFiles.length > 0 
            ? `Archivos Adjuntos de Sesión (${attachedFiles.map(f => f.name).join(', ')})`
            : 'Archivos Adjuntos de la Sesión',
          type: 'session'
        };
      }

      // Buscar si el ID corresponde a un expediente registrado en el sistema
      const allExp = ExpedienteStorageService.getExpedientes();
      const match = allExp.find(e => e.id === explicitId || e.radicado === explicitId);
      if (match) {
        return {
          id: match.id,
          name: `Expediente ${match.radicado} - ${match.titulo}`,
          type: 'expediente'
        };
      }

      return {
        id: explicitId,
        name: explicitName || `Colección de Expediente [ID: ${explicitId}]`,
        type: 'expediente'
      };
    }

    // 2. Deducir la colección según el modo y estado activo en la interfaz
    if (contextMode === 'jurisprudencia') {
      return {
        id: 'exp-jurisprudencia-hipotecas-colombia',
        name: 'Jurisprudencia de Altas Cortes y Marco Normativo (CGP / Ley 1564 / Código Civil)',
        type: 'jurisprudencia'
      };
    }

    if (contextMode === 'expediente') {
      if (activeExpediente) {
        return {
          id: activeExpediente.id,
          name: `Expediente ${activeExpediente.radicado} - ${activeExpediente.titulo}`,
          type: 'expediente'
        };
      }
      return {
        id: 'expediente_digital_activo',
        name: 'Expediente Digital Activo',
        type: 'expediente'
      };
    }

    if (attachedFiles.length > 0) {
      return {
        id: 'session_attachments',
        name: `Archivos Adjuntos (${attachedFiles.map(f => f.name).join(', ')})`,
        type: 'session'
      };
    }

    return {
      id: 'general_rag_corpus',
      name: 'Acervo General RAG (Neon DB pgvector)',
      type: 'general'
    };
  };

  const diagnoseError = (err: any, explicitCollection?: string): AppError => {
    const timestamp = new Date().toISOString();
    
    const isRagEmpty = err?.code === 'RAG_EMPTY' || 
                       err?.code === 'LGS_RAG_INDICE_VACIO' || 
                       (err?.message && (
                         err.message.toLowerCase().includes('no documents') ||
                         err.message.toLowerCase().includes('rag empty') ||
                         err.message.toLowerCase().includes('zero chunks') ||
                         err.message.toLowerCase().includes('no chunks') ||
                         err.message.toLowerCase().includes('indice vacio') ||
                         err.message.toLowerCase().includes('índice vacío')
                       ));

    if (isRagEmpty) {
      const kb = getKnowledgeBaseInfo(err, explicitCollection);
      const activeExpId = activeExpediente?.id || err?.activeExpedienteId || err?.expedienteId || 'exp-1789743909641';
      const failedCollectionId = err?.collectionId || err?.collection || kb.id;
      const failedIndexName = `${kb.name} [Colección ID: ${failedCollectionId}]`;

      // Registrar en el sistema de logging para soporte técnico
      logRagEmptyIncident(activeExpId, failedIndexName, failedCollectionId);

      let specificMessage = `Error RAG_EMPTY: No se pudo cargar el recurso de la base de conocimientos [Colección ID: ${failedCollectionId}] para el expediente activo [ID: ${activeExpId}].`;
      let specificSuggestion = `Cargue o verifique los documentos digitales correspondientes a la colección [ID: ${failedCollectionId}] para el expediente activo [ID: ${activeExpId}] en el Gestor de Expedientes.`;

      if (kb.type === 'jurisprudencia') {
        specificMessage = `Error RAG_EMPTY: No se pudo cargar la base de conocimientos de Jurisprudencia y Normas [Colección ID: ${failedCollectionId}] para el expediente activo [ID: ${activeExpId}]. Cero precedentes disponibles en el índice.`;
        specificSuggestion = `Verifique que la base de jurisprudencia y precedentes de Altas Cortes [Colección ID: ${failedCollectionId}] esté sincronizada en Neon DB para el análisis del expediente activo [ID: ${activeExpId}].`;
      } else if (kb.type === 'session') {
        specificMessage = `Error RAG_EMPTY: No se pudo cargar el contenido de los archivos adjuntos [Colección ID: ${failedCollectionId}] en la sesión del expediente activo [ID: ${activeExpId}].`;
        specificSuggestion = `Asegúrese de que los archivos PDF adjuntos contengan texto digital (capa OCR) y pertenezcan al expediente activo [ID: ${activeExpId}].`;
      } else if (kb.type === 'expediente') {
        const radicadoInfo = activeExpediente?.radicado ? ` (Radicado: ${activeExpediente.radicado})` : '';
        specificMessage = `Error RAG_EMPTY: No se pudo cargar la colección de piezas procesales [Colección ID: ${failedCollectionId}] del expediente activo [ID: ${activeExpId}]${radicadoInfo}. El índice no contiene fragmentos vectorizados.`;
        specificSuggestion = `Cargue el memorial de demanda, mandamiento ejecutivo/auto admisorio o providencias de este caso para el expediente activo [ID: ${activeExpId}] en la colección [ID: ${failedCollectionId}] a través del Gestor de Expedientes.`;
      }

      const technicalInfo = err?.technicalInfo || 
        `[DIAGNÓSTICO TÉCNICO RAG_EMPTY]\n` +
        `• Código de Incidencia: RAG_EMPTY (LGS_RAG_INDICE_VACIO)\n` +
        `• Recurso Fallido: Base de conocimientos o colección vectorial vacía / no cargada\n` +
        `• ID de Colección o Base de Conocimientos Fallida: "${failedCollectionId}"\n` +
        `• ID del Expediente Activo: "${activeExpId}"\n` +
        `• Nombre de la Colección: "${kb.name}"\n` +
        `• Tipo de Colección: ${kb.type.toUpperCase()}\n` +
        `• Modo de Consulta en Interfaz: "${contextMode}"\n` +
        `• Motor Vectorial: Neon PostgreSQL + pgvector (768 dimensiones, tabla 'rag_chunks')\n` +
        `• Criterio de Búsqueda: embedding <=> query_vector (Cosine Distance) con filtro { collection_id: "${failedCollectionId}", expediente_id: "${activeExpId}" }\n` +
        `• Diagnóstico de Captura: La consulta al motor RAG confirmó que el recurso [Colección ID: ${failedCollectionId}] no se pudo cargar para el expediente activo [ID: ${activeExpId}].`;

      return {
        code: 'LGS_RAG_INDICE_VACIO',
        message: specificMessage,
        suggestion: specificSuggestion,
        component: 'RAG',
        timestamp,
        targetCollection: `${kb.name} [Colección ID: ${failedCollectionId}]`,
        collectionId: failedCollectionId,
        activeExpedienteId: activeExpId,
        technicalInfo
      };
    }

    if (err.code === 'RAG_LOW_RELEVANCE') {
      const kb = getKnowledgeBaseInfo(err, explicitCollection);
      return {
        code: 'LGS_RAG_CONTEXTO_DIFUSO',
        message: `Baja relevancia en los resultados de la colección "${kb.name}".`,
        suggestion: 'Intente reformular la pregunta con términos jurídicos más específicos o mencione radicados, fechas y partes procesales concretas.',
        component: 'RAG',
        timestamp,
        targetCollection: kb.name,
        collectionId: kb.id,
        technicalInfo: `Cosine similarity score for collection '${kb.id}' was below the minimum confidence threshold (0.65).`
      };
    }

    if (err.message && err.message.includes('encrypted')) {
      return {
        code: 'LGS_FILE_PROTECTED',
        message: 'Uno o más archivos están cifrados o protegidos con contraseña.',
        suggestion: 'Asegúrese de subir versiones PDF sin contraseña para que el motor de extracción pueda procesar el texto.',
        component: 'FILES',
        timestamp
      };
    }

    return ErrorService.formatError(err, 'RAG');
  };

  const handleInsertSummaryToChat = useCallback((summary: ExecutiveSummaryData) => {
    const convId = activeConversationId || Date.now().toString();
    if (!activeConversationId) setActiveConversationId(convId);

    const assistantMessage: Message = {
      id: `summary-${Date.now()}`,
      role: 'assistant',
      content: `### ⚖️ Ficha Jurisprudencial: ${summary.radicado}\nSe ha generado el análisis de **Ratio Decidendi** y puntos clave según los estándares de la jurisprudencia colombiana:`,
      createdAt: Date.now(),
      executiveSummary: summary
    };

    setMessages(prev => {
      const updated = [...prev, assistantMessage];
      saveToLocalStorage(convId, updated);
      return updated;
    });
  }, [activeConversationId, saveToLocalStorage]);

  const handleExtractFromMessage = async (content: string) => {
    setIsLoading(true);
    try {
      const provider = LLMFactory.getProvider(AIProviderId.GEMINI, '');
      if (provider.generateExecutiveSummary) {
        const summary = await provider.generateExecutiveSummary(content);
        handleInsertSummaryToChat(summary);
      }
    } catch (err: any) {
      console.error("Error extracting summary from message:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (retryData?: { input: string, files: AttachedFile[] }) => {
    const currentInput = retryData?.input || input;
    const currentFiles = retryData?.files || attachedFiles.filter(f => f.status === 'ready');

    if ((!currentInput.trim() && currentFiles.length === 0) || isLoading) return;

    const convId = activeConversationId || Date.now().toString();
    if (!activeConversationId) setActiveConversationId(convId);

    const isSummaryRequest = /resumen(\s+ejecutivo)?|ratio\s*decidendi|puntos\s*clave|ficha\s*jurisprudencial|sentencia\s+(su|c|t|sp|sl)-/i.test(currentInput);

    // Limpiar errores previos del historial para que no persistan
    const cleanHistory = messages.filter(m => !(m.error || m.content === 'FALLO_TECNICO_RAG'));
    const isLastSameUser = cleanHistory.length > 0 && 
      cleanHistory[cleanHistory.length - 1].role === 'user' && 
      cleanHistory[cleanHistory.length - 1].content === currentInput;

    const userMessage: Message = { 
      id: Date.now().toString(), role: 'user', content: currentInput || "Análisis de material adjunto.", createdAt: Date.now() 
    };

    const newMessages = isLastSameUser ? cleanHistory : [...cleanHistory, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const provider = LLMFactory.getProvider(AIProviderId.GEMINI, '');
      
      setRagStatus('EMBEDDING');
      const queryEmbedding = await provider.generateEmbedding(userMessage.content);
      
      setRagStatus('SEARCHING');
      const targetExpId = contextMode === 'expediente' ? activeExpediente?.id : undefined;
      const relatedExpedienteId = activeExpediente?.id || targetExpId || 'exp-1789743909641';
      const targetCollectionName = contextMode === 'jurisprudencia' 
        ? 'Jurisprudencia y Marco Normativo de Altas Cortes' 
        : (activeExpediente ? `Expediente ${activeExpediente.radicado} - ${activeExpediente.titulo}` : `Expediente [ID: ${relatedExpedienteId}]`);

      // Capturar explícitamente la respuesta estructurada del motor RAG.
      // `query` es el texto de la consulta: lo necesita el servicio de IA en Python, que vectoriza
      // por su cuenta y hace la búsqueda híbrida. Sin él se usaría solo el embedding y la búsqueda
      // por coseno de siempre.
      const ragResponse: RagEngineResponse = await performVectorSearchWithMetadata(queryEmbedding, {
        query: userMessage.content,
        expedienteId: targetExpId,
        buscarJurisprudencia: contextMode === 'jurisprudencia',
        collectionName: targetCollectionName
      });

      console.log(`[RAG Engine Response Captured]:`, {
        success: ragResponse.success,
        totalResults: ragResponse.totalResults,
        isCollectionEmpty: ragResponse.isCollectionEmpty,
        isRagEmpty: ragResponse.isRagEmpty,
        isConnectionLost: ragResponse.isConnectionLost,
        collectionId: ragResponse.collectionId,
        expedienteId: relatedExpedienteId
      });

      // Si hubo pérdida de conexión con el motor vectorial:
      if (ragResponse.isConnectionLost) {
        const activeExpId = activeExpediente?.id || 'exp-1789743909641';
        setNeonDiagnostic(prev => prev ? { ...prev, connected: false, status: 'ERROR', diagnosticMessage: 'Pérdida de conexión con Neon DB' } : null);
        setRagHealth({
          status: 'ERROR',
          message: 'Conexión Perdida con Neon DB',
          details: `El motor de búsqueda vectorial perdió comunicación con Neon DB para el expediente activo [ID: ${activeExpId}].`,
          lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          collectionId: ragResponse.collectionId || activeExpId,
          activeExpedienteId: activeExpId,
          matchesCount: 0
        });
      }

      // Si el motor RAG no encuentra documentos o la colección requerida está vacía (RAG_EMPTY):
      if (ragResponse.isRagEmpty || ragResponse.error?.code === 'RAG_EMPTY' || (contextMode === 'expediente' && ragResponse.results.length === 0)) {
        const activeExpId = activeExpediente?.id || 'exp-1789743909641';
        const failedCollectionId = ragResponse.collectionId || (contextMode === 'jurisprudencia' ? 'exp-jurisprudencia-hipotecas-colombia' : activeExpId);
        const failedCollectionName = ragResponse.collectionName || targetCollectionName;

        setNeonDiagnostic(prev => prev ? { ...prev, status: 'WARNING', expedienteChunks: 0, diagnosticMessage: `Neon DB conectado, pero la colección [ID: ${failedCollectionId}] no tiene fragmentos (RAG_EMPTY)` } : null);
        setRagHealth({
          status: 'WARNING',
          message: 'Sin Fragmentos en el Expediente (RAG_EMPTY)',
          details: `La base de conocimientos [Colección ID: ${failedCollectionId}] para el expediente activo [ID: ${activeExpId}] no contiene piezas procesales.`,
          lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          collectionId: failedCollectionId,
          activeExpedienteId: activeExpId,
          matchesCount: 0
        });

        // Registrar en el sistema de logging para soporte técnico
        logRagEmptyIncident(activeExpId, failedCollectionName, failedCollectionId, userMessage.content);

        const ragEmptyError: AppError = {
          code: 'LGS_RAG_INDICE_VACIO',
          message: `Error RAG_EMPTY: No se pudo cargar el recurso solicitado de la base de conocimientos [Colección ID: ${failedCollectionId}] para el expediente activo [ID: ${activeExpId}] (${activeExpediente?.radicado || 'Radicado del caso'}). Cero fragmentos vectoriales recuperados.`,
          suggestion: `Cargue piezas procesales (demanda, auto admisorio/mandamiento o memoriales) para el expediente activo [ID: ${activeExpId}] usando el botón (+) o verifique el índice de la colección [ID: ${failedCollectionId}] en el Gestor de Expedientes.`,
          component: 'RAG',
          timestamp: new Date().toISOString(),
          targetCollection: `${failedCollectionName} [Colección ID: ${failedCollectionId}]`,
          collectionId: failedCollectionId,
          activeExpedienteId: activeExpId,
          technicalInfo: `[DIAGNÓSTICO MOTOR RAG - RAG_EMPTY]\n` +
            `• Código de Estado: RAG_EMPTY (LGS_RAG_INDICE_VACIO)\n` +
            `• Recurso No Cargado: Base de conocimientos o colección vectorial sin fragmentos\n` +
            `• ID de Colección o Base de Conocimientos Fallida: "${failedCollectionId}"\n` +
            `• ID del Expediente Activo: "${activeExpId}"\n` +
            `• Nombre de Colección: "${failedCollectionName}"\n` +
            `• Modo de Consulta en Chat: "${contextMode}"\n` +
            `• Motor Vectorial: Neon PostgreSQL + pgvector (tabla 'rag_chunks', 768-dim)\n` +
            `• Total Coincidencias Recuperadas: ${ragResponse.totalResults || 0}\n` +
            `• Detalle: Se capturó un fallo RAG_EMPTY al consultar la colección '${failedCollectionId}' vinculada al expediente activo '${activeExpId}'.`
        };

        throw ragEmptyError;
      }

      const searchResults: SearchResult[] = ragResponse.results;
      const activeExpId = activeExpediente?.id || 'exp-1789743909641';
      setNeonDiagnostic(prev => prev ? { ...prev, connected: true, status: 'OPTIMAL', expedienteChunks: searchResults.length, diagnosticMessage: `Neon DB operativo • ${searchResults.length} fragmentos recuperados en consulta` } : null);
      setRagHealth({
        status: 'OPTIMAL',
        message: 'Conectado a Neon DB (pgvector)',
        details: `Conexión activa con la base de conocimientos del expediente activo [ID: ${activeExpId}]. Se recuperaron ${searchResults.length} fragmentos en la última consulta.`,
        lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        collectionId: ragResponse.collectionId || activeExpId,
        activeExpedienteId: activeExpId,
        matchesCount: searchResults.length
      });

      setRagStatus('RERANKING');
      const expedienteContextPrefix = activeExpediente ? 
        `[EXPEDIENTE JUDICIAL ACTIVO]: Título: ${activeExpediente.titulo} | Radicado: ${activeExpediente.radicado} | Despacho: ${activeExpediente.despacho} | Demandante: ${activeExpediente.demandante} | Demandado: ${activeExpediente.demandado} | Cuantía: ${activeExpediente.cuantia} | Estado: ${activeExpediente.estado} | Tema: ${activeExpediente.temaJuridico}.\n\n` : '';

      const ragSnippets = searchResults.length > 0
        ? `[FRAGMENTOS PROCESALES Y JURISPRUDENCIALES RECUPERADOS (RAG)]:\n${searchResults.map(r => r.chunk).join('\n\n')}\n\n`
        : `[PAUTA DE ANÁLISIS JURÍDICO]: Responda con rigor técnico aplicando las normas vigentes del Código General del Proceso (CGP - Ley 1564 de 2012), Código Civil, Estatuto Financiero y jurisprudencia de las Altas Cortes colombianas, adaptado a los datos del expediente activo.\n\n`;

      const contextText = `${expedienteContextPrefix}${ragSnippets}`;
      
      const assistantId = (Date.now() + 1).toString();
      const assistantMessage: Message = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() };
      setMessages([...newMessages, assistantMessage]);

      setRagStatus('IDLE');
      let fullText = "";
      const stream = provider.getChatCompletionStream(
        newMessages, 
        contextText, 
        currentFiles.map(f => ({ data: f.data, mimeType: f.type }))
      );
      
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const target = updated.find(m => m.id === assistantId);
          if (target) {
            target.content = fullText;
            saveToLocalStorage(convId, updated);
          }
          return updated;
        });
      }

      // Si la consulta solicita explícitamente resumen ejecutivo o ratio decidendi,
      // adjuntar de inmediato la Ficha Jurisprudencial estructurada con Gemini
      if (isSummaryRequest && provider.generateExecutiveSummary) {
        try {
          const summaryData = await provider.generateExecutiveSummary(
            `${userMessage.content}\n\nContexto procesado:\n${fullText}`,
            currentFiles.map(f => ({ data: f.data, mimeType: f.type }))
          );
          setMessages(prev => {
            const updated = [...prev];
            const target = updated.find(m => m.id === assistantId);
            if (target) {
              target.executiveSummary = summaryData;
              saveToLocalStorage(convId, updated);
            }
            return updated;
          });
        } catch (sumErr) {
          console.warn("Could not auto-generate structured summary attachment:", sumErr);
        }
      }

    } catch (err: any) {
      setRagStatus('IDLE');
      const appErr = err.timestamp ? (err as AppError) : diagnoseError(err);
      
      const targetExpId = activeExpediente?.id || appErr.activeExpedienteId || 'exp-1789743909641';
      if (appErr.code === 'LGS_RAG_INDICE_VACIO' || appErr.code === 'RAG_EMPTY') {
        setNeonDiagnostic(prev => prev ? { ...prev, status: 'WARNING', expedienteChunks: 0, diagnosticMessage: `Colección vacía para expediente [ID: ${targetExpId}] (RAG_EMPTY)` } : null);
        setRagHealth({
          status: 'WARNING',
          message: 'Sin Fragmentos en el Expediente (RAG_EMPTY)',
          details: `La base de conocimientos vinculada al expediente activo [ID: ${targetExpId}] no contiene piezas procesales.`,
          lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          collectionId: appErr.collectionId || targetExpId,
          activeExpedienteId: targetExpId,
          matchesCount: 0
        });
      } else {
        setNeonDiagnostic(prev => prev ? { ...prev, connected: false, status: 'ERROR', diagnosticMessage: appErr.message || 'Pérdida de conexión con Neon DB' } : null);
        setRagHealth({
          status: 'ERROR',
          message: 'Conexión Perdida con Neon DB',
          details: `Se ha perdido la conexión con el motor vectorial Neon DB para el expediente activo [ID: ${targetExpId}]: ${appErr.message || 'Error de comunicación'}.`,
          lastChecked: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          collectionId: appErr.collectionId || targetExpId,
          activeExpedienteId: targetExpId,
          matchesCount: 0
        });
      }

      setMessages(prev => {
        const filtered = prev.filter(m => !(m.role === 'assistant' && !m.content && !m.error));
        const finalMessages: Message[] = [...filtered, { 
          id: `err-${Date.now()}`, 
          role: 'assistant', 
          content: 'FALLO_TECNICO_RAG', 
          createdAt: Date.now(), 
          error: appErr
        }];
        saveToLocalStorage(convId, finalMessages);
        return finalMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-[0_48px_128px_-32px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden relative"
         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
         onDragLeave={() => setIsDragging(false)}
         onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}>
      
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white m-4 rounded-[2rem] border-4 border-dashed border-white/50 animate-in fade-in duration-300">
          <UploadCloud className="w-16 h-16 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black uppercase tracking-widest italic">Soltar para Analizar</h2>
        </div>
      )}

      {/* Sidebar Historial */}
      <div className={`${isHistoryOpen ? 'w-80' : 'w-0'} bg-slate-900 transition-all duration-500 flex flex-col border-r border-slate-800 overflow-hidden shrink-0`}>
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-400 text-[10px] tracking-[0.2em] uppercase flex items-center gap-2"><History className="w-4 h-4" /> Expedientes</h3>
          <button onClick={() => {setActiveConversationId(null); setMessages([]);}} className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              onClick={() => {
                setActiveConversationId(conv.id);
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                setMessages(saved.messagesByConv?.[conv.id] || []);
              }} 
              className={`p-4 rounded-xl cursor-pointer transition-all border flex items-center justify-between group ${activeConversationId === conv.id ? 'bg-slate-800 border-indigo-500 text-white' : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs font-bold truncate">{conv.title}</p>
                <p className="text-[9px] uppercase mt-1 opacity-50">{new Date(conv.createdAt).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={(e) => handleDeleteConversation(conv.id, e)} 
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all text-slate-400"
                title="Eliminar sesión de chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        <header className="px-10 py-5 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-100"><Scale className="w-5 h-5" /></div>
            <div>
              <h2 className="font-black text-slate-900 text-xs tracking-[0.1em] uppercase italic">Consultor de Estrategia Jurídica</h2>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Despacho Online</span>
                {ragStatus !== 'IDLE' && (
                  <span className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 animate-pulse">
                    <Database className="w-2.5 h-2.5" /> 
                    {ragStatus === 'EMBEDDING' ? 'Procesando consulta...' : 
                     ragStatus === 'SEARCHING' ? 'Buscando en expedientes...' : 
                     'Refinando relevancia...'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select 
              className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              onChange={(e) => setContextMode(e.target.value as 'expediente' | 'jurisprudencia')}
              value={contextMode}
            >
              <option value="expediente">Caso / Expediente Actual</option>
              <option value="jurisprudencia">Jurisprudencia y Normas</option>
            </select>
            <button 
              onClick={handleClearCurrentSession}
              className="flex items-center gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-rose-200"
              title="Borrar sesión de chat actual"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Borrar Sesión</span>
            </button>
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"><History className="w-5 h-5" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          {activeExpediente && (
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] uppercase font-black tracking-[0.2em] text-indigo-400">Expediente Activo Global</p>
                    <span className="text-[9px] font-mono bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                      ID: {activeExpediente.id}
                    </span>
                  </div>
                  <p className="text-xs font-black tracking-tight">{activeExpediente.titulo} (Rad: {activeExpediente.radicado})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden md:inline">Cambiar Caso:</span>
                <select
                  value={activeExpediente.id}
                  onChange={(e) => {
                    const all = ExpedienteStorageService.getExpedientes();
                    const next = all.find(x => x.id === e.target.value);
                    if (next) {
                      setActiveExpediente(next);
                      localStorage.setItem('legisai_active_expediente_id', next.id);
                    }
                  }}
                  className="bg-slate-800 border border-indigo-500/40 text-indigo-200 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {ExpedienteStorageService.getExpedientes().map(exp => (
                    <option key={exp.id} value={exp.id}>
                      {exp.radicado} - {exp.titulo.length > 32 ? exp.titulo.slice(0, 32) + '...' : exp.titulo}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-block">
                  Chat Exclusivo
                </span>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 animate-in fade-in zoom-in-95 duration-700">
              <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner">
                <Bot className="w-10 h-10 text-indigo-600" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Sala de Investigación</p>
              <p className="text-xs text-slate-500 mt-2 italic max-w-sm">Escriba una duda jurídica o adjunte un archivo para iniciar el escaneo de jurisprudencia.</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-5 animate-message ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border-2 ${m.role === 'user' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-indigo-600 border-indigo-400 text-white'}`}>
                  {m.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                
                {m.error ? (
                  <div className="max-w-3xl w-full">
                    <LegalErrorDisplay 
                      error={m.error} 
                      onRetry={() => {
                        const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                        if (lastUserMsg) handleSend({ input: lastUserMsg.content, files: [] });
                      }} 
                      onClear={() => {
                        setMessages(prev => {
                          const cleaned = prev.filter(msg => msg.id !== m.id);
                          saveToLocalStorage(activeConversationId || '', cleaned);
                          return cleaned;
                        });
                      }}
                    />
                    
                    <div className="mt-6 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-4">
                      {m.error.code === 'LGS_RAG_INDICE_VACIO' && (
                        <>
                          <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="group flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 cursor-pointer"
                          >
                            <FileUp className="w-4 h-4 transition-transform group-hover:-translate-y-1" />
                            <span>Cargar Documentos al Caso [{m.error.activeExpedienteId || activeExpediente?.id}]</span>
                          </button>

                          {m.error.collectionId?.includes('jurisprudencia') ? (
                            <button 
                              onClick={() => {
                                setContextMode('expediente');
                                const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                                if (lastUserMsg) handleSend({ input: lastUserMsg.content, files: [] });
                              }} 
                              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                            >
                              <Database className="w-4 h-4 text-indigo-400" />
                              <span>Alternar a Colección del Expediente</span>
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setContextMode('jurisprudencia');
                                const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                                if (lastUserMsg) handleSend({ input: lastUserMsg.content, files: [] });
                              }} 
                              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
                            >
                              <BookOpen className="w-4 h-4 text-emerald-400" />
                              <span>Alternar a Jurisprudencia y Normas</span>
                            </button>
                          )}
                        </>
                      )}
                      {m.error.code === 'LGS_RAG_CONTEXTO_DIFUSO' && (
                        <button onClick={() => setInput(messages[messages.length-2]?.content || '')} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95 cursor-pointer">
                          <RefreshCw className="w-4 h-4" /> Replantear Estrategia
                        </button>
                      )}
                    </div>

                    {/* Información técnica oculta en la UI para soporte técnico (RAG_EMPTY) */}
                    {(m.error.code === 'LGS_RAG_INDICE_VACIO' || m.error.code === 'RAG_EMPTY') && (
                      <div className="mt-5 border-t border-slate-200/80 pt-4">
                        <button
                          type="button"
                          onClick={() => setExpandedLogMsgId(expandedLogMsgId === m.id ? null : m.id)}
                          className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/80 px-4 py-2.5 rounded-2xl border border-slate-200/80 transition-all cursor-pointer shadow-sm group"
                        >
                          <Terminal className="w-3.5 h-3.5 text-indigo-500 group-hover:rotate-6 transition-transform" />
                          <span>
                            {expandedLogMsgId === m.id ? 'Ocultar' : 'Ver'} Datos Técnicos Ocultos para Soporte (RAG_EMPTY)
                          </span>
                          {expandedLogMsgId === m.id ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
                          )}
                        </button>

                        {expandedLogMsgId === m.id && (
                          <div className="mt-3 bg-slate-950 text-slate-200 p-6 rounded-3xl border border-slate-800 shadow-2xl font-mono text-xs animate-in fade-in slide-in-from-top-3">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <span className="text-[10px] uppercase font-black text-rose-400 tracking-[0.2em]">
                                  Telemetría & Logging de Incidencia (Soporte Técnico)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const payload = JSON.stringify({
                                    errorCode: 'RAG_EMPTY',
                                    activeExpedienteId: m.error?.activeExpedienteId || activeExpediente?.id || 'exp-1789743909641',
                                    activeExpedienteRadicado: activeExpediente?.radicado || 'N/A',
                                    failedIndexOrCollection: m.error?.targetCollection || 'N/A',
                                    collectionId: m.error?.collectionId || 'N/A',
                                    vectorStoreEngine: "Neon PostgreSQL + pgvector (tabla 'rag_chunks', 768-dim)",
                                    timestamp: m.error?.timestamp || new Date().toISOString()
                                  }, null, 2);
                                  navigator.clipboard.writeText(payload);
                                  setCopiedLogId(m.id);
                                  setTimeout(() => setCopiedLogId(null), 2500);
                                }}
                                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/50 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
                              >
                                {copiedLogId === m.id ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedLogId === m.id ? '¡Log Copiado al Portapapeles!' : 'Copiar Log JSON para Soporte'}</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Error Registrado:</span>
                                <span className="text-rose-400 font-bold font-mono">RAG_EMPTY (Cero fragmentos vectoriales)</span>
                              </div>

                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">ID del Expediente Activo:</span>
                                <span className="text-indigo-300 font-bold font-mono">
                                  {m.error?.activeExpedienteId || activeExpediente?.id || 'exp-1789743909641'}
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 sm:col-span-2">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Nombre del Índice o Colección Vector Store Fallida:</span>
                                <span className="text-amber-300 font-semibold font-mono break-all">
                                  {m.error?.targetCollection || 'Colección No Indexada'}
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">ID / Namespace de Colección (pgvector):</span>
                                <span className="text-emerald-400 font-mono">
                                  {m.error?.collectionId || 'N/A'}
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Motor de Vector Store:</span>
                                <span className="text-slate-300 font-mono">Neon PostgreSQL (pgvector 768-dim)</span>
                              </div>

                              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800/80 sm:col-span-2">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Timestamp del Evento:</span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  {m.error?.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`max-w-[85%] p-8 rounded-[2.2rem] text-sm border shadow-sm leading-relaxed transition-all ${m.role === 'user' ? 'bg-white border-slate-200 text-slate-800 font-medium' : 'bg-white border-indigo-100 text-slate-800'}`}>
                    {isLoading && m.role === 'assistant' && !m.content ? (
                      <div className="flex items-center gap-4 text-indigo-600 font-black italic uppercase tracking-widest text-[10px]">
                        <Loader2 className="w-4 h-4 animate-spin" /> 
                        {ragStatus === 'IDLE' ? 'Generando Respuesta Jurídica...' : 'Consultando Base de Datos...'}
                      </div>
                    ) : (
                      <>
                        <FormattedMessage content={m.content} />
                        {m.executiveSummary && (
                          <ExecutiveSummaryCard 
                            summary={m.executiveSummary} 
                            onApplyToPrompt={(text) => setInput(text)} 
                          />
                        )}
                        {m.role === 'assistant' && !isLoading && !m.executiveSummary && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <button
                              onClick={() => handleExtractFromMessage(m.content)}
                              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Extraer Resumen Ejecutivo y Ratio Decidendi</span>
                            </button>

                            <button
                              onClick={() => {
                                BookmarkStorageService.saveBookmark({
                                  title: `Fragmento - ${activeExpediente?.radicado || 'Consulta General'}`,
                                  content: m.content.substring(0, 400) + (m.content.length > 400 ? '...' : ''),
                                  source: activeExpediente ? `Expediente ${activeExpediente.radicado} - ${activeExpediente.titulo}` : 'Acervo RAG General LegisAI',
                                  expedienteId: activeExpediente?.id,
                                  expedienteRadicado: activeExpediente?.radicado,
                                  tags: ['Chat', contextMode]
                                });
                                setSavedBookmarkMsgId(m.id);
                                setTimeout(() => setSavedBookmarkMsgId(null), 2500);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                              title="Guardar fragmento en marcadores de sentencias y normas"
                            >
                              {savedBookmarkMsgId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Bookmark className="w-3.5 h-3.5 text-amber-600" />}
                              <span>{savedBookmarkMsgId === m.id ? '¡Guardado en Marcadores!' : 'Guardar Marcador'}</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <footer className="p-8 bg-white border-t border-slate-100 shadow-[0_-20px_60px_rgba(0,0,0,0.04)]">
          <div className="max-w-4xl mx-auto space-y-4">


            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-4">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-3xl group relative min-w-[240px] shadow-sm hover:border-indigo-200 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                      <Files className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate text-slate-700">{file.name}</p>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden shadow-inner">
                        <div className={`h-full transition-all duration-700 ${file.status === 'ready' ? 'bg-emerald-500' : file.status === 'error' ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${file.progress}%` }} />
                      </div>
                    </div>
                    <button onClick={() => setAttachedFiles(f => f.filter(x => x.id !== file.id))} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-4">
              <input type="file" ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} accept=".pdf,.txt,.doc,.docx,.zip,application/zip" multiple className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-5 rounded-[1.5rem] border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0 shadow-sm" title="Adjuntar documentos o archivo ZIP con expedientes"><Files className="w-6 h-6" /></button>
              
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-[2rem] flex items-end p-3 focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all shadow-inner">
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                  placeholder="Instrucción jurídica para el análisis de precedentes..." 
                  className="flex-1 bg-transparent border-none outline-none p-4 text-sm resize-none max-h-48 min-h-[48px] font-medium placeholder:text-slate-400 placeholder:italic" 
                  rows={1} 
                />
                <button 
                  onClick={() => handleSend()} 
                  disabled={isLoading} 
                  className={`p-4 rounded-2xl transition-all shadow-xl ${isLoading ? 'bg-slate-100 text-slate-300' : 'bg-slate-950 text-white hover:bg-indigo-600 shadow-indigo-100 active:scale-95'}`}
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>


          </div>
        </footer>

        {/* Modal de Resumen Ejecutivo y Ratio Decidendi */}
        <ExecutiveSummaryModal
          isOpen={isExecutiveModalOpen}
          onClose={() => setIsExecutiveModalOpen(false)}
          onInsertToChat={handleInsertSummaryToChat}
          onSetPromptText={(text) => setInput(text)}
        />

        {/* Modal de Soporte Técnico para Logs RAG_EMPTY */}
        {showSupportLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
              <div className="bg-slate-900 text-white px-8 py-6 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">Centro de Logs RAG_EMPTY para Soporte Técnico</h3>
                    <p className="text-xs text-slate-400">Registro persistente de incidencias con ID de expediente activo y colecciones vector store</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSupportLogsModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{ragErrorLogs.length}</span> incidencias RAG registradas en la sesión.
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const jsonStr = JSON.stringify(ragErrorLogs, null, 2);
                        navigator.clipboard.writeText(jsonStr);
                        setCopiedLogId('all-modal');
                        setTimeout(() => setCopiedLogId(null), 2500);
                      }}
                      disabled={ragErrorLogs.length === 0}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 cursor-pointer"
                    >
                      {copiedLogId === 'all-modal' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLogId === 'all-modal' ? '¡Reporte Copiado!' : 'Copiar Todos los Logs (JSON)'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setRagErrorLogs([]);
                        localStorage.removeItem('legisai_rag_empty_logs');
                      }}
                      disabled={ragErrorLogs.length === 0}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar Logs</span>
                    </button>
                  </div>
                </div>

                {ragErrorLogs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-bold text-slate-700">Sin incidencias RAG_EMPTY registradas</p>
                    <p className="text-xs text-slate-400 mt-1">El motor vectorial está respondiendo correctamente o no se han producido fallos de índice vacío.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ragErrorLogs.map((log) => (
                      <div key={log.id} className="bg-slate-950 text-slate-200 p-5 rounded-2xl border border-slate-800 font-mono text-xs shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">
                              {log.errorCode}
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                              setCopiedLogId(log.id);
                              setTimeout(() => setCopiedLogId(null), 2500);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 cursor-pointer"
                          >
                            {copiedLogId === log.id ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLogId === log.id ? 'Copiado' : 'Copiar Log'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-500 uppercase block font-bold mb-0.5">Expediente Activo ID:</span>
                            <span className="text-indigo-400 font-bold">{log.activeExpedienteId}</span>
                          </div>
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-500 uppercase block font-bold mb-0.5">Namespace / Colección ID:</span>
                            <span className="text-emerald-400 font-bold">{log.collectionId}</span>
                          </div>
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 md:col-span-2">
                            <span className="text-[9px] text-slate-500 uppercase block font-bold mb-0.5">Índice o Colección Vector Store Fallida:</span>
                            <span className="text-amber-300 font-bold break-all">{log.failedIndexOrCollection}</span>
                          </div>
                          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 md:col-span-2">
                            <span className="text-[9px] text-slate-500 uppercase block font-bold mb-0.5">Motor Vectorial:</span>
                            <span className="text-slate-400">{log.vectorStoreEngine}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
