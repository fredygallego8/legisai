import { apiFetch } from '../../services/api/apiClient';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  MoreVertical, 
  Download, 
  Trash2, 
  CheckCircle2, 
  CheckCircle,
  Clock, 
  Filter,
  Search, 
  Plus, 
  GripVertical,
  FileArchive,
  Layers,
  FolderArchive,
  Eye,
  CalendarDays,
  Sparkles,
  Cpu,
  BookOpen,
  ArrowRight,
  Folder,
  Copy,
  Check,
  ChevronRight,
  Scale,
  Hash,
  Archive,
  ArchiveRestore,
  RotateCcw,
  AlertTriangle,
  Bookmark,
  X,
  RefreshCw
} from 'lucide-react';
import { LegalDocument, ProcessedPdfDocument, Expediente, LegalBookmark } from '../../types';
import DocumentUploadForm from './DocumentUploadForm';
import { ZipDocumentImporter } from './ZipDocumentImporter';
import { CaseDetailModal } from './CaseDetailModal';
import { PdfRagProcessorModal } from './PdfRagProcessorModal';
import { NewExpedienteModal } from './NewExpedienteModal';
import { ArchiveExpedienteModal } from './ArchiveExpedienteModal';
import { ProceduralTermsModal } from './ProceduralTermsModal';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { LegalErrorDisplay } from '../common/LegalErrorDisplay';
import { DocumentStorageService } from '../../services/documents/documentStorageService';
import { ExpedienteStorageService } from '../../services/expedientes/expedienteStorageService';
import { pdfRagService } from '../../services/documents/pdfRagService';
import { BookmarkStorageService } from '../../services/documents/bookmarkStorageService';

type ColumnId = 'document' | 'date' | 'actions';

const DEFAULT_COLUMN_ORDER: ColumnId[] = ['document', 'date', 'actions'];
const COLUMN_STORAGE_KEY = 'legisai_doc_column_order';

const DocumentManager: React.FC = () => {
  const location = useLocation();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showZipImporter, setShowZipImporter] = useState(false);
  const [showPdfRagModal, setShowPdfRagModal] = useState(false);
  const [isNewExpedienteModalOpen, setIsNewExpedienteModalOpen] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<LegalDocument | null>(null);
  const [selectedDocForRag, setSelectedDocForRag] = useState<LegalDocument | null>(null);
  const [selectedExpedienteForDetails, setSelectedExpedienteForDetails] = useState<Expediente | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Estados de búsqueda y filtrado
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [expedienteSearchQuery, setExpedienteSearchQuery] = useState('');
  const [expedienteCategoryFilter, setExpedienteCategoryFilter] = useState<string>('TODOS');
  const [copiedRadicado, setCopiedRadicado] = useState(false);
  const [expedienteToArchive, setExpedienteToArchive] = useState<Expediente | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [archiveFeedbackMessage, setArchiveFeedbackMessage] = useState<string | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<LegalDocument | null>(null);
  const [showSharepointModal, setShowSharepointModal] = useState(false);
  const [sharepointAccessCode, setSharepointAccessCode] = useState('');
  const [isSharepointDownloading, setIsSharepointDownloading] = useState(false);
  const [sharepointSuccessMsg, setSharepointSuccessMsg] = useState<string | null>(null);

  const handleSharepointImport = () => {
    if (!sharepointAccessCode.trim()) {
      alert('Por favor ingrese el código numérico de acceso.');
      return;
    }
    if (!activeExpedienteId) {
      alert('Seleccione un expediente activo para importar los documentos.');
      return;
    }
    setIsSharepointDownloading(true);
    console.log('[DocumentManagerSharepoint] Iniciando importación desde SharePoint. Código:', sharepointAccessCode);

    setTimeout(() => {
      try {
        const imported = DocumentStorageService.downloadAndImportFromSharePoint(sharepointAccessCode.trim(), activeExpedienteId);
        setDocuments(DocumentStorageService.getDocuments());
        console.log('[DocumentManagerSharepoint] Documentos importados y ordenados descendentemente:', imported);
        setSharepointSuccessMsg(`¡Se importaron y ordenaron ${imported.length} documentos correctamente!`);
        setIsSharepointDownloading(false);
        setTimeout(() => {
          setSharepointSuccessMsg(null);
          setShowSharepointModal(false);
          setSharepointAccessCode('');
        }, 2000);
      } catch (e: any) {
        console.error('[DocumentManagerSharepoint] Error en importación:', e);
        alert('Error al importar desde SharePoint: ' + (e.message || ''));
        setIsSharepointDownloading(false);
      }
    }, 1000);
  };

  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const { reportError } = useErrorHandler('DATABASE');
  
  // Expedientes y Documentos
  const [expedientes, setExpedientes] = useState<Expediente[]>(() => ExpedienteStorageService.getExpedientes());
  const [activeExpedienteId, setActiveExpedienteId] = useState<string>(() => ExpedienteStorageService.getActiveExpedienteId());
  const [documents, setDocuments] = useState<LegalDocument[]>(() => DocumentStorageService.getDocuments());
  const [indexedRagPdfs, setIndexedRagPdfs] = useState<ProcessedPdfDocument[]>(() => pdfRagService.getProcessedDocuments());
  const [managerTab, setManagerTab] = useState<'vault' | 'bookmarks'>('vault');
  const [bookmarks, setBookmarks] = useState<LegalBookmark[]>(() => BookmarkStorageService.getBookmarks());
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState('');
  const [copiedBookmarkId, setCopiedBookmarkId] = useState<string | null>(null);

  // Estados para el modal de Consulta Rama Judicial & Comparación
  const [showRamaJudicialModal, setShowRamaJudicialModal] = useState(false);
  const [ramaRadicadoInput, setRamaRadicadoInput] = useState('');
  const [isConsultingRama, setIsConsultingRama] = useState(false);
  const [ramaConsultaResult, setRamaConsultaResult] = useState<any | null>(null);
  const [ramaErrorMsg, setRamaErrorMsg] = useState<string | null>(null);
  
  const localPdfInputRef = useRef<HTMLInputElement>(null);

  // Suscribirse a cambios reactivos en expedientes, expediente activo, documentos y RAG
  useEffect(() => {
    const unsubExpedientes = ExpedienteStorageService.subscribe(updated => {
      setExpedientes(updated);
    });
    const unsubActiveExp = ExpedienteStorageService.subscribeActive(activeId => {
      setActiveExpedienteId(activeId);
    });
    const unsubStorage = DocumentStorageService.subscribe(updatedDocs => {
      setDocuments(updatedDocs);
    });
    const unsubRag = pdfRagService.subscribe(updatedRagDocs => {
      setIndexedRagPdfs(updatedRagDocs);
    });
    const unsubBookmarks = BookmarkStorageService.subscribe(updatedBookmarks => {
      setBookmarks(updatedBookmarks);
    });

    return () => {
      unsubExpedientes();
      unsubActiveExp();
      unsubStorage();
      unsubRag();
      unsubBookmarks();
    };
  }, []);

  const filteredBookmarks = useMemo(() => {
    if (!bookmarkSearchQuery.trim()) return bookmarks;
    const q = bookmarkSearchQuery.toLowerCase();
    return bookmarks.filter(b => 
      b.title.toLowerCase().includes(q) ||
      b.content.toLowerCase().includes(q) ||
      b.source.toLowerCase().includes(q) ||
      (b.expedienteRadicado && b.expedienteRadicado.toLowerCase().includes(q))
    );
  }, [bookmarks, bookmarkSearchQuery]);

  // Expediente activo seleccionado
  const activeExpediente = useMemo(() => {
    return expedientes.find(e => e.id === activeExpedienteId) || expedientes[0];
  }, [expedientes, activeExpedienteId]);

  // Si llega por URL con query ?new=true o ?action=new, abrir formulario de carga
  useEffect(() => {
    if (location.search.includes('new=true') || location.search.includes('action=new')) {
      setShowUploadForm(true);
      setShowZipImporter(false);
    }
  }, [location.search]);

  useEffect(() => {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filtered = Array.isArray(parsed) ? parsed.filter((id: string) => id !== 'status') : DEFAULT_COLUMN_ORDER;
        setColumnOrder(filtered.length > 0 ? filtered : DEFAULT_COLUMN_ORDER);
      } catch (e) {
        console.error("Failed to parse column order", e);
      }
    }
    localStorage.removeItem(COLUMN_STORAGE_KEY); // Reset to default clean columns without status
  }, []);

  // Selección de expediente activo
  const handleSelectExpediente = (expId: string) => {
    setActiveExpedienteId(expId);
    ExpedienteStorageService.setActiveExpedienteId(expId);
  };

  const handleCopyRadicado = (radicado: string) => {
    navigator.clipboard.writeText(radicado);
    setCopiedRadicado(true);
    setTimeout(() => setCopiedRadicado(false), 2000);
  };

  const processLocalPdfDocument = async (file: File) => {
    setSelectedDocForRag(null);
    setShowPdfRagModal(true);
  };

  const handleUploadComplete = (newDoc: LegalDocument) => {
    const docWithExp = {
      ...newDoc,
      expedienteId: newDoc.expedienteId || activeExpedienteId
    };
    DocumentStorageService.addDocument(docWithExp);
    setShowUploadForm(false);
  };

  const handleBatchUploadComplete = (newDocs: LegalDocument[]) => {
    const docsWithExp = newDocs.map(d => ({
      ...d,
      expedienteId: d.expedienteId || activeExpedienteId
    }));
    DocumentStorageService.addBatchDocuments(docsWithExp);
    setShowZipImporter(false);
    setShowUploadForm(false);
  };

  const handleDeleteDocument = (docId: string) => {
    DocumentStorageService.deleteDocument(docId);
  };

  const handleRetry = (docId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'PROCESSING', errorDetail: undefined } 
        : doc
    ));
    
    setTimeout(() => {
      const updated = documents.map(doc => 
        doc.id === docId ? { ...doc, status: 'READY' as const } : doc
      );
      DocumentStorageService.saveDocuments(updated);
    }, 2000);
  };

  // Conteo de documentos asociados a cada expediente
  const getDocCountForExpediente = (expId: string) => {
    return documents.filter(d => d.expedienteId === expId).length;
  };

  const handleOpenArchiveModal = (exp: Expediente) => {
    setExpedienteToArchive(exp);
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = (expId: string, reason: string) => {
    ExpedienteStorageService.archiveExpediente(expId, reason);
    setArchiveFeedbackMessage('Expediente archivado exitosamente. Se ha ocultado de la lista activa.');
    setTimeout(() => setArchiveFeedbackMessage(null), 4000);
  };

  const handleRestoreExpediente = (expId: string) => {
    ExpedienteStorageService.unarchiveExpediente(expId);
    setArchiveFeedbackMessage('Expediente restaurado y reabierto en la lista de casos activos.');
    setTimeout(() => setArchiveFeedbackMessage(null), 4000);
  };

  const handlePermanentDelete = (exp: Expediente) => {
    if (window.confirm(`¿Confirma la eliminación definitiva del expediente ${exp.radicado}? Toda su información será destruida de forma irreversible.`)) {
      ExpedienteStorageService.permanentDeleteExpediente(exp.id);
      setArchiveFeedbackMessage('Expediente judicial eliminado definitivamente.');
      setTimeout(() => setArchiveFeedbackMessage(null), 4000);
    }
  };

  // Conteo total de expedientes archivados
  const archivedExpedientesCount = useMemo(() => {
    return expedientes.filter(e => e.isArchived).length;
  }, [expedientes]);

  // Filtrar la lista de expedientes según búsqueda y categoría (por defecto excluye archivados)
  const filteredExpedientes = useMemo(() => {
    return expedientes.filter(exp => {
      // Si el usuario seleccionó la pestaña de ARCHIVADOS, listar únicamente los archivados
      if (expedienteCategoryFilter === 'ARCHIVADOS') {
        if (!exp.isArchived) return false;
      } else {
        // En cualquier otra pestaña, EXCLUIR estrictamente los archivados (no salen por defecto)
        if (exp.isArchived) return false;

        const matchesCategory = expedienteCategoryFilter === 'TODOS' || 
          exp.tipoProceso.toLowerCase().includes(expedienteCategoryFilter.toLowerCase());
        if (!matchesCategory) return false;
      }

      if (!expedienteSearchQuery.trim()) return true;
      const q = expedienteSearchQuery.toLowerCase();
      return (
        exp.radicado.toLowerCase().includes(q) ||
        exp.titulo.toLowerCase().includes(q) ||
        exp.demandante.toLowerCase().includes(q) ||
        exp.demandado.toLowerCase().includes(q) ||
        exp.despacho.toLowerCase().includes(q)
      );
    });
  }, [expedientes, expedienteCategoryFilter, expedienteSearchQuery]);

  // Función auxiliar robusta para normalizar formatos 'DD/MM/YYYY' y 'MMMM D, YYYY' (ej. 'July 28, 2025') a objetos Date de JavaScript
  const parseRamaDate = (input: string | number): Date => {
    if (!input) return new Date(0);
    if (typeof input === 'number') return new Date(input);
    const str = String(input).trim();

    // 1. Formato DD/MM/YYYY o DD-MM-YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const fullYear = y.length === 2 ? (parseInt(y, 10) > 50 ? `19${y}` : `20${y}`) : y;
        return new Date(parseInt(fullYear, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    }

    // 2. Formato MMMM D, YYYY (ej. 'July 28, 2025' o 'Julio 28, 2025')
    const monthMap: Record<string, number> = {
      january: 0, enero: 0, jan: 0,
      february: 1, febrero: 1, feb: 1,
      march: 2, marzo: 2, mar: 2,
      april: 3, abril: 3, apr: 3, abr: 3,
      may: 4, mayo: 4,
      june: 5, junio: 5, jun: 5,
      july: 6, julio: 6, jul: 6,
      august: 7, agosto: 7, aug: 7, ago: 7,
      september: 8, septiembre: 8, sep: 8,
      october: 9, octubre: 9, oct: 9,
      november: 10, noviembre: 10, nov: 10,
      december: 11, diciembre: 11, dic: 11
    };

    for (const [monthName, monthIndex] of Object.entries(monthMap)) {
      if (str.toLowerCase().includes(monthName)) {
        const nums = str.match(/\d+/g);
        if (nums && nums.length >= 2) {
          let day = 1;
          let year = new Date().getFullYear();
          if (nums.length === 2) {
            day = parseInt(nums[0], 10);
            year = parseInt(nums[1], 10);
            if (year < 100) year += 2000;
          } else if (nums.length >= 3) {
            day = parseInt(nums[0], 10);
            year = parseInt(nums[nums.length - 1], 10);
            if (year < 100) year += 2000;
          }
          return new Date(year, monthIndex, day);
        }
      }
    }

    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const [y, m, d] = parts;
          return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        } else {
          const [d, m, y] = parts;
          const fullYear = y.length === 2 ? (parseInt(y, 10) > 50 ? `19${y}` : `20${y}`) : y;
          return new Date(parseInt(fullYear, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        }
      }
    }

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  };

  // ÚNICAMENTE los documentos del expediente activo seleccionado, ordenados descendentemente por fecha real
  const currentExpedienteDocuments = useMemo(() => {
    if (!activeExpediente) return [];
    const list = documents.filter(d => d.expedienteId === activeExpediente.id);
    return [...list].sort((a, b) => {
      const dateA = parseRamaDate(a.createdAt || a.name);
      const dateB = parseRamaDate(b.createdAt || b.name);
      return dateB.getTime() - dateA.getTime();
    });
  }, [documents, activeExpediente]);

  // Filtro de texto aplicado sobre los documentos del expediente activo
  const filteredDocuments = useMemo(() => {
    if (!documentSearchQuery.trim()) return currentExpedienteDocuments;
    const q = documentSearchQuery.toLowerCase();
    return currentExpedienteDocuments.filter(d => 
      d.name.toLowerCase().includes(q) ||
      (d.originZip && d.originZip.toLowerCase().includes(q)) ||
      d.type.toLowerCase().includes(q) ||
      (d.cuaderno && d.cuaderno.toLowerCase().includes(q))
    );
  }, [currentExpedienteDocuments, documentSearchQuery]);

  const renderCell = (doc: LegalDocument, columnId: ColumnId) => {
    const isRagIndexed = doc.ragIndexed || indexedRagPdfs.some(p => p.name.toLowerCase() === doc.name.toLowerCase());

    switch (columnId) {
      case 'document':
        return (
          <div 
            onClick={() => setSelectedDocForDetails(doc)}
            className="flex items-center gap-3 cursor-pointer group/doc hover:opacity-90 transition-opacity w-full"
            title="Haga clic para ver el panel de detalles y la línea de tiempo interactiva"
          >
            {/* Icono de estado al inicio */}
            <div className="shrink-0">
              {doc.status === 'READY' && (
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600" title="Estado: Listo">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {doc.status === 'PROCESSING' && (
                <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600" title="Estado: Indexando">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
              )}
              {doc.status === 'ERROR' && (
                <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600" title="Estado: Error">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${doc.status === 'ERROR' ? 'bg-rose-50 text-rose-400 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
              <FileText className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <p className={`text-sm font-bold break-all group-hover/doc:text-indigo-600 transition-colors ${doc.status === 'ERROR' ? 'text-rose-900' : 'text-slate-900'}`}>
                {doc.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded shadow-xs">
                  {(doc.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs border text-indigo-600 bg-indigo-50 border-indigo-100/50">
                  {doc.type}
                </span>
                {doc.cuaderno && (
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200">
                    {doc.cuaderno}
                  </span>
                )}
                {isRagIndexed && (
                  <span 
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs border text-violet-700 bg-violet-50 border-violet-200 flex items-center gap-1"
                    title="Expediente procesado con embeddings para RAG con Gemini"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-violet-600" />
                    <span>RAG Activo</span>
                  </span>
                )}
                {doc.originZip && (
                  <span 
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs border text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1 max-w-[170px] truncate"
                    title={`Descomprimido desde el paquete: ${doc.originZip}`}
                  >
                    <FileArchive className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                    <span className="truncate">{doc.originZip}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      case 'date':
        return (
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
            {new Date(doc.createdAt).toLocaleDateString('es-CO')}
          </span>
        );
      case 'actions':
        return (
          <div className="flex items-center justify-end gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDocForPreview(doc);
              }}
              className="p-2 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
              title="Ver documento en tamaño grande (Modal)"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDocument(doc.id);
              }}
              className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all cursor-pointer" 
              title="Eliminar documento de este expediente"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null) return;
    
    if (draggedColumnIndex !== index) {
      const newOrder = [...columnOrder];
      const draggedItem = newOrder[draggedColumnIndex];
      newOrder.splice(draggedColumnIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setColumnOrder(newOrder);
      setDraggedColumnIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedColumnIndex(null);
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnOrder));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      
      {/* 1. SECCIÓN PRINCIPAL: TÍTULO Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-indigo-600" />
              Gestión de Expedientes Judiciales
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500">
              {expedientes.length} expedientes activos
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-500">
              {documents.length} Docs en bóveda
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Expedientes y Casos Procesales
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Seleccione un expediente para examinar su carátula, antecedentes procesales y los documentos específicos que lo integran.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Input oculto para procesamiento directo de PDF */}
          <input
            ref={localPdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processLocalPdfDocument(e.target.files[0]);
              }
            }}
          />

          {/* Botón para Procesar PDF con RAG Gemini */}
          <button 
            onClick={() => {
              setSelectedDocForRag(null);
              setShowPdfRagModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-3 rounded-2xl text-xs font-bold hover:opacity-95 transition-all shadow-md shadow-violet-600/20 active:scale-95 cursor-pointer"
            title="Procesar un archivo PDF local para extraer texto, generar embeddings con Gemini y consultar con RAG"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>RAG Gemini</span>
          </button>

          {/* Botón para Importar Archivo ZIP al expediente activo */}
          <button 
            onClick={() => {
              setShowZipImporter(true);
              setShowUploadForm(false);
            }}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Extraer e indexar documentos desde un archivo ZIP comprimido hacia el expediente activo"
          >
            <FileArchive className="w-4 h-4 text-indigo-600" />
            <span>Importar ZIP</span>
          </button>

          {/* Botón para Descarga desde SharePoint */}
          <button 
            onClick={() => setShowSharepointModal(true)}
            className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Descargar paquete documental desde SharePoint con código numérico"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>SharePoint Sync</span>
          </button>

          {/* Botón de Actualizar de Rama Judicial y Sincronización */}
          <button 
            onClick={() => {
              const activeExp = expedientes.find(e => e.id === activeExpedienteId);
              if (activeExp?.radicado) {
                setRamaRadicadoInput(activeExp.radicado);
              }
              setShowRamaJudicialModal(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            title="Actualizar y consultar portal oficial Rama Judicial"
          >
            <RefreshCw className="w-4 h-4 text-emerald-200" />
            <span>Actualizar de Rama Judicial</span>
          </button>

          {/* Botón para Crear Nuevo Expediente */}
          <button 
            onClick={() => setIsNewExpedienteModalOpen(true)}
            className="group flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 cursor-pointer"
            title="Crear o incorporar nuevo expediente judicial"
          >
            <Plus className="w-4 h-4 text-indigo-400 group-hover:rotate-90 transition-transform" />
            <span>Nuevo Expediente</span>
          </button>
        </div>
      </div>

      {/* Pestañas principales del DocumentManager: Expedientes/Vault vs Marcadores */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setManagerTab('vault')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            managerTab === 'vault'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Folder className="w-4 h-4 text-indigo-400" />
          <span>Bóveda de Expedientes y Documentos</span>
        </button>

        <button
          onClick={() => setManagerTab('bookmarks')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            managerTab === 'bookmarks'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bookmark className="w-4 h-4 text-amber-500" />
          <span>Marcadores y Fragmentos Guardados ({bookmarks.length})</span>
        </button>
      </div>

      {managerTab === 'bookmarks' ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-black text-slate-900">Marcadores de Fragmentos y Jurisprudencia</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fragmentos de sentencias, normas y respuestas del chat guardados durante sus investigaciones jurídicas.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={bookmarkSearchQuery}
                onChange={(e) => setBookmarkSearchQuery(e.target.value)}
                placeholder="Buscar en marcadores guardados..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Bookmark className="w-12 h-12 mx-auto opacity-30 text-amber-500" />
              <p className="text-sm font-bold text-slate-700">No hay marcadores guardados</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Haga clic en el botón "Guardar Marcador" debajo de cualquier respuesta del Asistente Jurídico en el chat para registrar fragmentos clave aquí.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBookmarks.map((bm) => (
                <div key={bm.id} className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all shadow-xs group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                        {bm.source}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(bm.createdAt).toLocaleDateString('es-CO')}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {bm.title}
                    </h3>

                    <p className="text-xs text-slate-600 bg-white p-4 rounded-2xl border border-slate-200/60 leading-relaxed font-serif italic">
                      "{bm.content}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bm.tags?.map(t => (
                        <span key={t} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${bm.title}\n\n${bm.content}\n\nFuente: ${bm.source}`);
                          setCopiedBookmarkId(bm.id);
                          setTimeout(() => setCopiedBookmarkId(null), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                      >
                        {copiedBookmarkId === bm.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedBookmarkId === bm.id ? 'Copiado' : 'Copiar Cita'}</span>
                      </button>

                      <button
                        onClick={() => BookmarkStorageService.removeBookmark(bm.id)}
                        className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Eliminar marcador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {/* 2. CATÁLOGO / SELECTOR DE EXPEDIENTES */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">Listado de Expedientes Judiciales</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Haga clic sobre cualquier expediente para ver exclusivamente sus documentos asociados.
            </p>
          </div>

          {/* Filtro por Categoría / Jurisdicción */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['TODOS', 'Laboral', 'Penal', 'Tutela', 'Civil'].map(cat => (
              <button
                key={cat}
                onClick={() => setExpedienteCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  expedienteCategoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'TODOS' ? 'Todos los Casos' : cat}
              </button>
            ))}

            {/* Pestaña / Botón de Archivados */}
            <button
              onClick={() => setExpedienteCategoryFilter('ARCHIVADOS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                expedienteCategoryFilter === 'ARCHIVADOS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
              title="Ver expedientes archivados que han sido retirados de la vista principal"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archivados ({archivedExpedientesCount})</span>
            </button>
          </div>
        </div>

        {/* Mensaje de confirmación temporal de archivado / restauración */}
        {archiveFeedbackMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{archiveFeedbackMessage}</span>
          </div>
        )}

        {/* Banner informativo cuando se encuentra en la vista de Archivados */}
        {expedienteCategoryFilter === 'ARCHIVADOS' && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Archive className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="block font-black text-amber-950">Vista de Expedientes Judiciales Archivados</strong>
                <span className="text-amber-800">
                  Estos procesos están ocultos por defecto en la vista principal. Sus piezas documentales y línea de tiempo se encuentran preservadas.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExpedienteCategoryFilter('TODOS')}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100/80 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              ← Volver a Expedientes Activos
            </button>
          </div>
        )}

        {/* Buscador de Expedientes */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={expedienteSearchQuery}
            onChange={(e) => setExpedienteSearchQuery(e.target.value)}
            placeholder="Buscar expediente por radicado, partes procesales o juzgado de origen..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-medium text-slate-800 placeholder:text-slate-400"
          />
          {expedienteSearchQuery && (
            <button
              onClick={() => setExpedienteSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-sm"
            >
              ×
            </button>
          )}
        </div>

        {/* Tarjetas Grid de Expedientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {filteredExpedientes.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-400">
              <Folder className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-sm font-bold text-slate-600">No se encontraron expedientes con ese criterio</p>
              <p className="text-xs text-slate-400 mt-1">Intente con otro término o cree un nuevo expediente</p>
            </div>
          ) : (
            filteredExpedientes.map((exp) => {
              const isSelected = exp.id === activeExpedienteId;
              const docCount = getDocCountForExpediente(exp.id);

              return (
                <div
                  key={exp.id}
                  onClick={() => handleSelectExpediente(exp.id)}
                  className={`relative p-5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? 'bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-slate-950/40 text-white'
                      : exp.isArchived
                        ? 'bg-slate-900/90 border-amber-900/40 hover:border-amber-700/60 text-slate-200 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-200 shadow-md'
                  }`}
                >
                  <div>
                    {/* Radicado y Estado */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded truncate max-w-[170px]" title={exp.radicado}>
                        {exp.radicado}
                      </span>
                      {exp.isArchived ? (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Archive className="w-2.5 h-2.5 text-amber-400" />
                          Archivado
                        </span>
                      ) : isSelected ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-white bg-indigo-600 px-2.5 py-0.5 rounded-full shadow-xs">
                          Activo
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full">
                          {exp.tipoProceso.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Título del Expediente */}
                    <h3 className={`font-bold text-sm leading-snug line-clamp-2 mb-2.5 transition-colors ${
                      isSelected ? 'text-white' : 'text-slate-100 group-hover:text-indigo-300'
                    }`}>
                      {exp.titulo}
                    </h3>

                    {/* Partes procesales */}
                    <div className="space-y-1 text-[11px] text-slate-400 mb-3">
                      <p className="truncate" title={`Dte: ${exp.demandante}`}>
                        <strong className="text-slate-300">Dte:</strong> {exp.demandante}
                      </p>
                      <p className="truncate" title={`Ddo: ${exp.demandado}`}>
                        <strong className="text-slate-300">Ddo:</strong> {exp.demandado}
                      </p>
                    </div>
                  </div>

                  {/* Pie de la tarjeta: Conteo abreviado de docs y acciones */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between mt-auto gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      docCount > 0 
                        ? (isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-300 border border-indigo-500/30')
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      <FileText className="w-3 h-3" />
                      {docCount} Docs
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExpedienteForDetails(exp);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-indigo-300 flex items-center gap-0.5 transition-colors px-1.5 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                        title="Ver hitos y cronología procesal"
                      >
                        <span>Hitos</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      {exp.isArchived ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreExpediente(exp.id);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                            title="Restaurar y reabrir expediente a la lista activa"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermanentDelete(exp);
                            }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar definitivamente este expediente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenArchiveModal(exp);
                          }}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                          title="Archivar este expediente judicial (pedirá confirmación)"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. FICHA DEL EXPEDIENTE ACTIVO SELECCIONADO */}
      {activeExpediente && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-7 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Scale className="w-3 h-3 text-indigo-300" />
                  Expediente en Foco
                </span>
                
                {/* Radicado con botón de copiado */}
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-xl border border-white/10 font-mono text-xs text-indigo-200">
                  <Hash className="w-3 h-3 text-indigo-400" />
                  <span>{activeExpediente.radicado}</span>
                  <button
                    onClick={() => handleCopyRadicado(activeExpediente.radicado)}
                    className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar radicado judicial"
                  >
                    {copiedRadicado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  activeExpediente.isArchived
                    ? 'text-amber-300 bg-amber-500/20 border-amber-500/30'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {activeExpediente.isArchived ? 'Expediente Archivado' : activeExpediente.estado}
                </span>
              </div>

              {activeExpediente.isArchived && (
                <div className="bg-amber-500/15 border border-amber-400/30 text-amber-200 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Expediente Archivado:</strong> {activeExpediente.archiveReason || 'Retirado de la vista principal'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestoreExpediente(activeExpediente.id)}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>Reabrir / Desarchivar</span>
                  </button>
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {activeExpediente.titulo}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs text-slate-300 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Demandante:</span>
                  <span className="font-semibold text-white">{activeExpediente.demandante}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Demandado:</span>
                  <span className="font-semibold text-white">{activeExpediente.demandado}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Despacho Actual:</span>
                  <span className="font-semibold text-white truncate block" title={activeExpediente.despacho}>
                    {activeExpediente.despacho}
                  </span>
                </div>
                {activeExpediente.temaJuridico && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Línea Doctrinal / Asunto:</span>
                    <span className="text-indigo-200">{activeExpediente.temaJuridico}</span>
                  </div>
                )}
                {activeExpediente.cuantia && (
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Cuantía Estimada:</span>
                    <span className="text-emerald-300 font-bold">{activeExpediente.cuantia}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones para el expediente seleccionado */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
              <button
                onClick={() => setShowTermsModal(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
                title="Tabla comparativa automática de términos procesales vencidos y próximos vencimientos según el CGP"
              >
                <Clock className="w-4 h-4 text-slate-950" />
                <span>Términos Procesales CGP</span>
              </button>

              <button
                onClick={() => setSelectedExpedienteForDetails(activeExpediente)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <CalendarDays className="w-4 h-4 text-indigo-300" />
                <span>Cronología e Hitos</span>
              </button>

              <button
                onClick={() => {
                  setShowUploadForm(true);
                  setShowZipImporter(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Documento</span>
              </button>

              <button
                onClick={() => {
                  setShowZipImporter(true);
                  setShowUploadForm(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <FileArchive className="w-4 h-4 text-amber-400" />
                <span>Importar ZIP a este Caso</span>
              </button>

              {activeExpediente.isArchived ? (
                <button
                  onClick={() => handleRestoreExpediente(activeExpediente.id)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  title="Restaurar y devolver este expediente al catálogo activo"
                >
                  <ArchiveRestore className="w-4 h-4" />
                  <span>Restaurar a Activos</span>
                </button>
              ) : (
                <button
                  onClick={() => handleOpenArchiveModal(activeExpediente)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  title="Archivar este expediente judicial (solicitará confirmación)"
                >
                  <Archive className="w-4 h-4 text-amber-400" />
                  <span>Archivar Expediente</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario de Carga Estándar / Individual abierto */}
      {showUploadForm && (
        <div className="animate-message mb-8">
          <DocumentUploadForm 
            onClose={() => setShowUploadForm(false)} 
            onUploadComplete={handleUploadComplete}
            onBatchUploadComplete={handleBatchUploadComplete}
            targetExpedienteId={activeExpedienteId}
          />
        </div>
      )}

      {/* Importador Masivo ZIP abierto */}
      {showZipImporter && (
        <div className="animate-message mb-8">
          <ZipDocumentImporter
            onClose={() => setShowZipImporter(false)}
            onImportComplete={handleBatchUploadComplete}
            targetExpedienteId={activeExpedienteId}
          />
        </div>
      )}

      {/* 4. TABLA DE DOCUMENTOS EXCLUSIVOS DEL EXPEDIENTE SELECCIONADO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Documentos del Expediente: <span className="text-indigo-600">{activeExpediente ? activeExpediente.titulo : 'Seleccionado'}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mostrando únicamente los documentos pertenecientes a este radicado ({activeExpediente?.radicado}).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={documentSearchQuery}
                onChange={(e) => setDocumentSearchQuery(e.target.value)}
                placeholder="Buscar documento en este expediente..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-medium text-slate-800"
              />
              {documentSearchQuery && (
                <button
                  onClick={() => setDocumentSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredDocuments.length} Docs
            </span>
          </div>
        </div>

        {/* Tabla de documentos */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {columnOrder.map((id, index) => (
                  <th 
                    key={id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-move select-none transition-colors hover:bg-indigo-50/50 ${draggedColumnIndex === index ? 'opacity-20 bg-indigo-100' : ''}`}
                    style={{ width: id === 'actions' ? '140px' : (id === 'date' ? '140px' : 'auto') }}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      {(String(id) === 'document' ? 'Documento del Expediente' : String(id) === 'status' ? 'Estado' : String(id) === 'date' ? 'Fecha' : 'Acciones')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={columnOrder.length} className="px-8 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
                    <p className="font-bold text-base text-slate-700">
                      {currentExpedienteDocuments.length === 0 
                        ? 'Este expediente aún no contiene documentos' 
                        : 'No se encontraron documentos con ese criterio de búsqueda'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {currentExpedienteDocuments.length === 0 
                        ? 'Incorpore la demanda inicial, autos interlocutorios, sentencias o importe un archivo ZIP para alimentar este caso.'
                        : 'Pruebe con otro nombre de archivo o borre el filtro de búsqueda.'}
                    </p>
                    {currentExpedienteDocuments.length === 0 && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setShowUploadForm(true);
                            setShowZipImporter(false);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Cargar Documento
                        </button>
                        <button
                          onClick={() => {
                            setShowZipImporter(true);
                            setShowUploadForm(false);
                          }}
                          className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5"
                        >
                          <FileArchive className="w-3.5 h-3.5 text-amber-600" />
                          Importar ZIP
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc, idx) => (
                  <tr key={doc.id} className={`transition-colors group ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-indigo-50/30`}>
                    {columnOrder.map((colId) => (
                      <td key={`${doc.id}-${colId}`} className="px-8 py-5 text-left">
                        {renderCell(doc, colId)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* 5. MODALES AUXILIARES */}

      {/* Modal de Detalle de Documento Individual */}
      {selectedDocForDetails && (
        <CaseDetailModal
          document={selectedDocForDetails}
          documents={documents.filter(d => d.expedienteId === selectedDocForDetails.expedienteId)}
          onClose={() => setSelectedDocForDetails(null)}
        />
      )}

      {/* Modal de Cronología e Hitos del Expediente Completo */}
      {selectedExpedienteForDetails && (
        <CaseDetailModal
          expediente={selectedExpedienteForDetails}
          documents={documents.filter(d => d.expedienteId === selectedExpedienteForDetails.id)}
          onClose={() => setSelectedExpedienteForDetails(null)}
        />
      )}

      {/* Modal de Creación de Nuevo Expediente */}
      <NewExpedienteModal
        isOpen={isNewExpedienteModalOpen}
        onClose={() => setIsNewExpedienteModalOpen(false)}
        onComplete={(newDocs) => {
          setIsNewExpedienteModalOpen(false);
        }}
      />

      {/* Modal de Procesamiento RAG y Extracción de PDF con Gemini */}
      <PdfRagProcessorModal
        isOpen={showPdfRagModal}
        targetDocument={selectedDocForRag}
        onClose={() => {
          setShowPdfRagModal(false);
          setSelectedDocForRag(null);
        }}
        onDocumentProcessed={(processed) => {
          setIndexedRagPdfs(pdfRagService.getProcessedDocuments());
        }}
      />

      {/* Modal de Confirmación y Archivo de Expediente Judicial */}
      <ArchiveExpedienteModal
        isOpen={showArchiveModal}
        expediente={expedienteToArchive}
        documentsCount={documents.length}
        onClose={() => {
          setShowArchiveModal(false);
          setExpedienteToArchive(null);
        }}
        onConfirmArchive={handleConfirmArchive}
      />

      {/* Modal de Tabla Comparativa de Términos Procesales CGP */}
      {activeExpediente && (
        <ProceduralTermsModal
          isOpen={showTermsModal}
          expediente={activeExpediente}
          documents={documents.filter(d => d.expedienteId === activeExpediente.id)}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {/* Modal de Consulta y Sincronización con la Rama Judicial (https://consultaprocesos.ramajudicial.gov.co) */}
      {showRamaJudicialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Consulta Oficial Rama Judicial</h2>
                  <p className="text-xs text-slate-500">Conexión con el portal oficial de procesos judiciales (Consulta por Radicación)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRamaJudicialModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                  Número de Radicación (23 Dígitos)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ramaRadicadoInput}
                    onChange={(e) => setRamaRadicadoInput(e.target.value)}
                    placeholder="Ej: 11001-31-05-015-2022-00342-01 o 05001-40-03-029-2024-01450-00"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={async () => {
                      if (!ramaRadicadoInput.trim()) {
                        setRamaErrorMsg('Ingrese un número de radicación válido.');
                        return;
                      }
                      setIsConsultingRama(true);
                      setRamaErrorMsg(null);
                      setRamaConsultaResult(null);

                      try {
                        const response = await apiFetch('/api/rama-judicial/sincronizar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            radicado: ramaRadicadoInput.trim(),
                            expedienteId: activeExpedienteId
                          })
                        });
                        const contentType = response.headers.get("content-type");
                        if (!contentType || !contentType.includes("application/json")) {
                          throw new Error("El servidor no devolvió una respuesta JSON válida (verifique conexión con base de datos o estado del servidor).");
                        }
                        const data = await response.json();
                        console.log("Respuesta completa de la Rama Judicial:", data);
                        console.log("[DocumentManagerAudit] Cuerpo de respuesta completo recibido desde /api/rama-judicial/sincronizar:", JSON.stringify(data, null, 2));

                        if (!response.ok || !data.success) {
                          throw new Error(data.error || 'Error consultando portal de la Rama Judicial.');
                        }

                        // Función auxiliar parseRamaDate(dateStr) que convierte formatos 'DD/MM/YYYY' y 'MMMM D, YYYY' (ej. 'July 28, 2025') a objetos Date nativos
                        const parseRamaDate = (dateStr: string): Date => {
                          if (!dateStr) return new Date(0);
                          const str = String(dateStr).trim();

                          // 1. Formato DD/MM/YYYY o DD-MM-YYYY
                          if (str.includes('/')) {
                            const parts = str.split('/');
                            if (parts.length === 3) {
                              const [d, m, y] = parts;
                              return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                            }
                          }

                          // 2. Formato MMMM D, YYYY (ej. 'July 28, 2025' o 'Julio 28, 2025')
                          const monthMap: Record<string, number> = {
                            january: 0, enero: 0, jan: 0,
                            february: 1, febrero: 1, feb: 1,
                            march: 2, marzo: 2, mar: 2,
                            april: 3, abril: 3, apr: 3, abr: 3,
                            may: 4, mayo: 4,
                            june: 5, junio: 5, jun: 5,
                            july: 6, julio: 6, jul: 6,
                            august: 7, agosto: 7, aug: 7, ago: 7,
                            september: 8, septiembre: 8, sep: 8,
                            october: 9, octubre: 9, oct: 9,
                            november: 10, noviembre: 10, nov: 10,
                            december: 11, diciembre: 11, dic: 11
                          };

                          for (const [monthName, monthIndex] of Object.entries(monthMap)) {
                            if (str.toLowerCase().includes(monthName)) {
                              const nums = str.match(/\d+/g);
                              if (nums && nums.length >= 2) {
                                let day = 1;
                                let year = new Date().getFullYear();
                                if (nums.length === 2) {
                                  day = parseInt(nums[0], 10);
                                  year = parseInt(nums[1], 10);
                                  if (year < 100) year += 2000;
                                } else if (nums.length >= 3) {
                                  day = parseInt(nums[0], 10);
                                  year = parseInt(nums[nums.length - 1], 10);
                                  if (year < 100) year += 2000;
                                }
                                return new Date(year, monthIndex, day);
                              }
                            }
                          }

                          if (str.includes('-')) {
                            const parts = str.split('-');
                            if (parts.length === 3) {
                              if (parts[0].length === 4) {
                                const [y, m, d] = parts;
                                return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                              } else {
                                const [d, m, y] = parts;
                                return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                              }
                            }
                          }

                          const parsed = new Date(str);
                          return isNaN(parsed.getTime()) ? new Date(0) : parsed;
                        };

                        if (data.nuevosDocumentos && Array.isArray(data.nuevosDocumentos)) {
                          data.nuevosDocumentos.forEach((doc: any, index: number) => {
                            console.log(`[DocumentManagerAudit] [Doc ${index + 1}] Nombre: ${doc.nombre || doc.actuacion} | Fecha cruda: ${doc.fecha} | Parseada:`, parseRamaDate(doc.fecha));
                          });
                          data.nuevosDocumentos.sort((a: any, b: any) => {
                            return parseRamaDate(b.fecha).getTime() - parseRamaDate(a.fecha).getTime();
                          });
                        }

                        setRamaConsultaResult(data);
                        setDocuments(DocumentStorageService.getDocuments());
                      } catch (err: any) {
                        setRamaErrorMsg(err.message);
                      } finally {
                        setIsConsultingRama(false);
                      }
                    }}
                    disabled={isConsultingRama}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                  >
                    {isConsultingRama ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>{isConsultingRama ? 'Consultando...' : 'Consultar y Sincronizar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  El sistema consultará los servidores judiciales, extraerá las últimas actuaciones y comparará los documentos nuevos con la bóveda actual.
                </p>
              </div>

              {ramaErrorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{ramaErrorMsg}</span>
                </div>
              )}

              {ramaConsultaResult && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg">
                        Sincronización Exitosa con Rama Judicial
                      </span>
                      <span className="text-xs font-mono text-emerald-800 font-bold">
                        {ramaConsultaResult.portalInfo.radicado}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      Despacho: {ramaConsultaResult.portalInfo.despacho}
                    </p>
                    <p className="text-xs text-slate-700">
                      Estado Procesal: <span className="font-bold text-slate-900">{ramaConsultaResult.portalInfo.estadoActual}</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Nuevos Documentos y Actuaciones Encontradas ({ramaConsultaResult.nuevosDocumentos.length})</span>
                    </h3>

                    {ramaConsultaResult.nuevosDocumentos && ramaConsultaResult.nuevosDocumentos.length > 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3">Fecha</th>
                              <th className="px-4 py-3">Actuación</th>
                              <th className="px-4 py-3">Documento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {ramaConsultaResult.nuevosDocumentos.map((doc: any, idx: number) => {
                              const isUnviewed = idx === 0; // Marcar la primera / más reciente como no vista previamente
                              return (
                                <tr key={idx} className={`transition-colors ${isUnviewed ? 'bg-emerald-50/60 font-black' : 'hover:bg-slate-50/80'}`}>
                                  <td className="px-4 py-3 font-mono text-slate-900 whitespace-nowrap font-bold">
                                    {doc.fecha}
                                    {isUnviewed && (
                                      <span className="ml-2 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                        No Visto
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className={`text-slate-900 ${isUnviewed ? 'font-black text-sm text-emerald-950' : 'font-bold'}`}>{doc.actuacion}</p>
                                    {doc.anotacion && (
                                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{doc.anotacion}</p>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 font-mono truncate max-w-[200px] ${isUnviewed ? 'font-black text-emerald-800' : 'text-indigo-600 font-semibold'}`} title={doc.nombre}>
                                    {doc.nombre}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                        No se detectaron documentos nuevos frente a la bóveda actual.
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setShowRamaJudicialModal(false)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Cerrar y Ver en Bóveda
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal de Vista Previa Ampliada del Documento en Tamaño Grande */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-message">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-900 truncate" title={selectedDocForPreview.name}>
                    {selectedDocForPreview.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    Tamaño: {Math.round((selectedDocForPreview.size || 0) / 1024)} KB | Tipo: {selectedDocForPreview.type.toUpperCase()} | Fecha: {new Date(selectedDocForPreview.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/60 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Contenido e Información Completa del Documento Judicial
                </h3>
                <div className="bg-slate-900 text-slate-100 p-6 rounded-xl font-mono text-xs leading-relaxed overflow-x-auto max-h-[55vh] whitespace-pre-wrap select-text">
                  {selectedDocForPreview.extractedContent || `[Documento judicial oficial indexado en bóveda de LegisAI] \n\nNombre del Archivo: ${selectedDocForPreview.name}\nExpediente ID: ${selectedDocForPreview.expedienteId}\nCuaderno: ${selectedDocForPreview.cuaderno || 'Principal'}\n\nContenido verificado y disponible para consulta RAG, análisis jurídico y validación con los términos procesales del CGP.`}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Visualización ampliada de documento
              </span>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Cerrar Vista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Descarga desde SharePoint con Código Numérico */}
      {showSharepointModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200 animate-message">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Descarga desde SharePoint
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Juzgado 07 Ejecución Sentencias (Antioquia)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSharepointModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {sharepointSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{sharepointSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Código Numérico de Acceso SharePoint
                  </label>
                  <input
                    type="text"
                    value={sharepointAccessCode}
                    onChange={(e) => setSharepointAccessCode(e.target.value)}
                    placeholder="Ingrese el código numérico (Ej: 2828)..."
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                  <p className="text-[11px] text-slate-500">
                    El sistema validará el código, descargará el paquete, normalizará las fechas (DD/MM/YYYY y MMMM D, YYYY) y actualizará la bóveda en orden descendente.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSharepointModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSharepointImport}
                    disabled={isSharepointDownloading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    {isSharepointDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{isSharepointDownloading ? 'Descargando...' : 'Iniciar Importación'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
