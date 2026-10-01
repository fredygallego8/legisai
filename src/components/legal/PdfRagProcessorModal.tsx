import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  Layers, 
  BookOpen, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  FileCode, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  Cpu, 
  FileCheck, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { pdfRagService } from '../../services/documents/pdfRagService';
import { DocumentStorageService } from '../../services/documents/documentStorageService';
import { ProcessedPdfDocument, RagQueryResult, LegalDocument } from '../../types';

interface PdfRagProcessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDocument?: LegalDocument | null;
  onDocumentProcessed?: (processedDoc: ProcessedPdfDocument) => void;
}

export const PdfRagProcessorModal: React.FC<PdfRagProcessorModalProps> = ({
  isOpen,
  onClose,
  targetDocument,
  onDocumentProcessed
}) => {
  const [activeTab, setActiveTab] = useState<'PROCESS' | 'QUERY'>('PROCESS');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processedDocs, setProcessedDocs] = useState<ProcessedPdfDocument[]>(() => pdfRagService.getProcessedDocuments());
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  
  // Consulta RAG
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<RagQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChunkDetails, setShowChunkDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar documentos indexados al abrir y suscribirse
  useEffect(() => {
    const docs = pdfRagService.getProcessedDocuments();
    setProcessedDocs(docs);
    if (docs.length > 0 && !selectedDocId) {
      setSelectedDocId(docs[0].id);
    }

    const unsubscribe = pdfRagService.subscribe(updated => {
      setProcessedDocs(updated);
      if (updated.length > 0 && !selectedDocId) {
        setSelectedDocId(updated[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedDocId]);

  // Si se pasa un documento específico al abrir el modal
  useEffect(() => {
    if (targetDocument && targetDocument.type === 'pdf') {
      const match = processedDocs.find(d => d.name.toLowerCase() === targetDocument.name.toLowerCase());
      if (match) {
        setSelectedDocId(match.id);
        setActiveTab('QUERY');
      }
    }
  }, [targetDocument, processedDocs]);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const isPdf = dropped.type.includes('pdf') || dropped.name.toLowerCase().endsWith('.pdf');
      const isHtml = dropped.type.includes('html') || dropped.name.toLowerCase().endsWith('.html');
      
      if (isPdf || isHtml) {
        setFile(dropped);
        setProcessingError(null);
      } else {
        setProcessingError('Por favor seleccione un archivo en formato PDF (.pdf) o HTML (.html)');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const isPdf = selected.type.includes('pdf') || selected.name.toLowerCase().endsWith('.pdf');
      const isHtml = selected.type.includes('html') || selected.name.toLowerCase().endsWith('.html');
      
      if (isPdf || isHtml) {
        setFile(selected);
        setProcessingError(null);
      } else {
        setProcessingError('Por favor seleccione un archivo en formato PDF (.pdf) o HTML (.html)');
      }
    }
  };

  const handleStartProcessing = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProcessingError(null);
    setProgressPercent(5);
    setProgressMsg('Iniciando lectura del PDF local...');

    // Intentar obtener expedienteId si targetDocument existe
    const expedienteId = (targetDocument as any)?.expedienteId;

    try {
      const processed = await pdfRagService.processLocalPdf(file, expedienteId, (msg, pct) => {
        setProgressMsg(msg);
        setProgressPercent(pct);
      });

      // Actualizar o incorporar a la lista principal de documentos de DocumentManager
      const existingDoc = DocumentStorageService.getDocuments().find(
        d => d.name.toLowerCase() === file.name.toLowerCase()
      );

      if (existingDoc) {
        DocumentStorageService.addDocument({
          ...existingDoc,
          ragIndexed: true,
          ragChunkCount: processed.totalChunks,
          status: 'READY'
        });
      } else {
        const newLegalDoc: LegalDocument = {
          id: processed.id,
          userId: 'user-1',
          name: processed.name,
          type: 'pdf',
          size: processed.size,
          status: 'READY',
          createdAt: Date.now(),
          ragIndexed: true,
          ragChunkCount: processed.totalChunks
        };
        DocumentStorageService.addDocument(newLegalDoc);
      }

      onDocumentProcessed?.(processed);
      setSelectedDocId(processed.id);
      setIsProcessing(false);
      // Cambiar a la pestaña de consulta para que el usuario pueda preguntar inmediatamente
      setActiveTab('QUERY');
    } catch (err: any) {
      console.error('Error procesando PDF para RAG:', err);
      setIsProcessing(false);
      setProcessingError(err.message || 'Error al procesar el archivo PDF.');
    }
  };

  const handleLoadSamplePdf = () => {
    setIsProcessing(true);
    setProgressPercent(20);
    setProgressMsg('Indexando expediente de prueba de Casación Laboral...');

    setTimeout(async () => {
      try {
        // Genera los embeddings del corpus de ejemplo en el servidor.
        const sample = await pdfRagService.seedSamplePdfIfEmpty();
        if (sample) {
          setSelectedDocId(sample.id);
          const docs = pdfRagService.getProcessedDocuments();
          setProcessedDocs(docs);
          setActiveTab('QUERY');
        }
      } catch (err: any) {
        console.error('No se pudo indexar el expediente de ejemplo:', err);
        setQueryError(err?.message || 'No se pudo indexar el expediente de ejemplo.');
      } finally {
        setIsProcessing(false);
      }
    }, 600);
  };

  const handleExecuteRagQuery = async (customQuery?: string) => {
    const q = (customQuery || query).trim();
    if (!q || isQuerying) return;

    setIsQuerying(true);
    setQueryError(null);
    if (customQuery) setQuery(customQuery);

    try {
      const result = await pdfRagService.queryRag(q, selectedDocId || undefined);
      setQueryResult(result);
    } catch (err: any) {
      console.error('Error en consulta RAG:', err);
      setQueryError(err.message || 'Error al ejecutar la consulta RAG.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!queryResult) return;
    navigator.clipboard.writeText(queryResult.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteIndexedDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pdfRagService.deleteProcessedDocument(id);
    if (selectedDocId === id) {
      setSelectedDocId('');
      setQueryResult(null);
    }
  };

  const selectedDocObj = processedDocs.find(d => d.id === selectedDocId);

  const quickQuestions = [
    "¿Cuál es la Ratio Decidendi o regla vinculante del fallo?",
    "¿Cuál es el problema jurídico formulado?",
    "¿Qué resolvió el juez o tribunal en la decisión final?",
    "¿Cuáles son las normas constitucionales y leyes aplicadas?",
    "¿Qué pruebas periciales o documentales fueron analizadas?"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header con gradiente elegante */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">RAG de Expedientes PDF con Gemini</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  gemini-embedding-2-preview
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Extracción de texto, generación de vectores y consultas fundamentadas con precedentes jurídicos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de pestañas */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-8 pt-3">
          <button
            onClick={() => setActiveTab('PROCESS')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'PROCESS'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Cargar y Procesar PDF</span>
            {processedDocs.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {processedDocs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('QUERY')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'QUERY'
                ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>2. Consulta RAG con Gemini</span>
            {processedDocs.length > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-200">
                Listo
              </span>
            )}
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'PROCESS' && (
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* Zona de Carga Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  file
                    ? 'border-indigo-500 bg-indigo-50/30'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf,.html,text/html"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>

                {file ? (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-indigo-600 font-semibold">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Archivo PDF listo para extracción
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2">Haga clic o arrastre otro PDF si desea cambiarlo</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-800">
                      Arrastre y suelte aquí el archivo PDF del expediente
                    </p>
                    <p className="text-xs text-slate-500">
                      o haga clic para seleccionar un documento local desde su equipo
                    </p>
                    <span className="inline-block mt-2 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                      Soporta sentencias, demandas, autos, dictámenes y poderes (PDF)
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de acción para procesar */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleLoadSamplePdf}
                  disabled={isProcessing}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-200 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-indigo-600" />
                  Probar con PDF de ejemplo (Sentencia Casación)
                </button>

                <button
                  type="button"
                  onClick={handleStartProcessing}
                  disabled={!file || isProcessing}
                  className="bg-indigo-600 text-white px-7 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando Expediente...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extraer Texto y Generar Embeddings
                    </>
                  )}
                </button>
              </div>

              {/* Barra de progreso interactiva */}
              {isProcessing && (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      {progressMsg}
                    </span>
                    <span className="text-indigo-600 font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] text-slate-400 font-semibold text-center">
                    <div className={progressPercent >= 10 ? 'text-indigo-600 font-bold' : ''}>1. Binario PDF</div>
                    <div className={progressPercent >= 30 ? 'text-indigo-600 font-bold' : ''}>2. Extracción Páginas</div>
                    <div className={progressPercent >= 65 ? 'text-indigo-600 font-bold' : ''}>3. Chunks Semánticos</div>
                    <div className={progressPercent >= 85 ? 'text-indigo-600 font-bold' : ''}>4. Embeddings Gemini</div>
                  </div>
                </div>
              )}

              {/* Mensaje de error si falla */}
              {processingError && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error en el procesamiento del PDF</p>
                    <p className="mt-0.5 text-rose-700">{processingError}</p>
                  </div>
                </div>
              )}

              {/* Lista de Expedientes PDF Ya Indexados */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Expedientes Indexados en la Base RAG ({processedDocs.length})
                  </h3>
                  {processedDocs.length > 0 && (
                    <button
                      onClick={() => setActiveTab('QUERY')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      Ir a consultas RAG <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {processedDocs.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    No hay ningún PDF indexado todavía. Cargue un archivo o pruebe con el expediente de ejemplo.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {processedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setActiveTab('QUERY');
                        }}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 ${
                          selectedDocId === doc.id
                            ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/10'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                            <FileCheck className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 truncate max-w-md">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500 font-medium">
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {doc.totalChunks} Chunks Indexados
                              </span>
                              <span>• {doc.totalPages} Páginas</span>
                              <span>• {(doc.extractedChars / 1000).toFixed(1)}k caracteres</span>
                              <span>• {doc.embeddingModel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocId(doc.id);
                              setActiveTab('QUERY');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                          >
                            Consultar RAG
                          </button>
                          <button
                            onClick={(e) => handleDeleteIndexedDoc(doc.id, e)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Eliminar índice vectorial"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'QUERY' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Selector de Expediente y Estado del Motor */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Expediente Base para la Consulta RAG:
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="bg-white border border-slate-200 font-bold text-sm text-slate-900 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  >
                    <option value="">Todos los expedientes indexados ({processedDocs.length})</option>
                    {processedDocs.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.totalChunks} chunks • {d.totalPages} págs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>Gemini 3.8 Flash + Embeddings 2</span>
                </div>
              </div>

              {/* Botones de Preguntas Rápidas */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3 text-indigo-500" /> Preguntas frecuentes de litigio sobre el expediente:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExecuteRagQuery(q)}
                      disabled={isQuerying}
                      className="text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 transition-all font-medium text-left active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barra de entrada de la consulta */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteRagQuery()}
                      placeholder="Formula una pregunta jurídica sobre el contenido del PDF..."
                      className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm text-slate-900 shadow-sm"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleExecuteRagQuery()}
                    disabled={!query.trim() || isQuerying}
                    className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    {isQuerying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Consultar RAG
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de error en consulta */}
              {queryError && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Error en la consulta RAG</p>
                    <p className="mt-0.5 text-rose-700">{queryError}</p>
                  </div>
                </div>
              )}

              {/* Tarjeta de Respuesta RAG Generada */}
              {queryResult && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Encabezado del resultado */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                        ⚖️
                      </span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Respuesta Fundamentada de Gemini
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Basada en {queryResult.relevantChunks.length} fragmentos semánticos recuperados ({queryResult.latencyMs} ms)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyAnswer}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowChunkDetails(!showChunkDetails)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>{showChunkDetails ? 'Ocultar Fragmentos' : 'Ver Citas del PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo de la respuesta */}
                  <div className="prose prose-sm text-slate-800 leading-relaxed font-sans max-w-none whitespace-pre-wrap">
                    {queryResult.answer}
                  </div>

                  {/* Detalle de Fragmentos Citados del PDF (Chunks con Similitud) */}
                  {showChunkDetails && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Fragmentos Recuperados del PDF (Búsqueda Vectorial por Coseno):
                      </h5>
                      <div className="grid gap-3">
                        {queryResult.relevantChunks.map((c, i) => (
                          <div
                            key={i}
                            className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span className="text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded font-mono">
                                📄 Página {c.pageNumber} • {c.chunk.documentName}
                              </span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Coincidencia: {(c.similarity * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-slate-100 font-serif leading-relaxed">
                              "{c.chunk.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Privacidad Local: El PDF se procesa de forma segura en su sesión.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
