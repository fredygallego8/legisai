import React, { useState, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { 
  FileArchive, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  FolderArchive,
  CheckSquare, 
  Square, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Layers,
  FileCheck,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  FileX2,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { LegalDocument } from '../../types';
import { 
  extractZipArchive, 
  importExtractedDocuments, 
  formatBytes, 
  ExtractedZipEntry, 
  ObservabilityLogEntry, 
  ZipExtractionMetrics,
  ALLOWED_EXTENSIONS
} from '../../services/zip/zipExtractionService';
import { ZipObservabilityConsole } from './ZipObservabilityConsole';

interface ZipDocumentImporterProps {
  onClose: () => void;
  onImportComplete: (newDocs: LegalDocument[]) => void;
  targetExpedienteId?: string;
}

export const ZipDocumentImporter: React.FC<ZipDocumentImporterProps> = ({
  onClose,
  onImportComplete,
  targetExpedienteId
}) => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  
  // Estados de extracción y descompresión del archivo ZIP
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStepText, setExtractionStepText] = useState<string>('');
  const [extractedEntries, setExtractedEntries] = useState<ExtractedZipEntry[]>([]);
  const [metrics, setMetrics] = useState<ZipExtractionMetrics | null>(null);
  const [logs, setLogs] = useState<ObservabilityLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtro de visualización de ficheros extraídos
  const [entryFilter, setEntryFilter] = useState<'ALL' | 'READY' | 'ISSUES'>('ALL');

  // Estados de importación e indexación RAG
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importCurrentDoc, setImportCurrentDoc] = useState<string>('');
  const [importStepText, setImportStepText] = useState<string>('');
  const [importProcessedCount, setImportProcessedCount] = useState<number>(0);
  const [importTotalCount, setImportTotalCount] = useState<number>(0);

  // Estados posteriores a la importación y tolerancia a fallos
  const [successfulDocs, setSuccessfulDocs] = useState<LegalDocument[]>([]);
  const [failedEntries, setFailedEntries] = useState<{ entry: ExtractedZipEntry; error: string }[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [sharepointCode, setSharepointCode] = useState<string>('');
  const [isSharepointDownloading, setIsSharepointDownloading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSharepointDownload = async () => {
    if (!sharepointCode.trim() || sharepointCode.trim().length < 2) {
      setErrorMessage('Por favor ingrese un código numérico válido para acceder a SharePoint.');
      return;
    }
    setIsSharepointDownloading(true);
    setErrorMessage(null);
    setExtractionProgress(10);
    setExtractionStepText('Conectando con SharePoint (Juzgado 07 Ejecución Sentencias)...');

    try {
      const sampleZip = new JSZip();
      sampleZip.file('00IndiceElectronico 6.xlsm', 'Índice electrónico oficial Juzgado 07 Ejecución');
      sampleZip.file('01EscritoDemanda.pdf', 'Demanda ejecutiva con radicado oficial');
      sampleZip.file('02AutoLibraMandamientoPago.pdf', 'Auto que libra mandamiento de pago');
      sampleZip.file('03OficioInstrumentos-ConstanciaNotificación.pdf', 'Oficio y constancia de notificación');
      sampleZip.file('04Memorial20250124ConstanciaNotificacion.pdf', 'Memorial constancia de notificación 2025-01-24');
      sampleZip.file('05Memroial20250212DocumentoRegistro.pdf', 'Memorial documento de registro 2025-02-12');
      sampleZip.file('06AutoOrdenaSeguirAdelanteEjecución.pdf', 'Auto ordena seguir adelante ejecución');
      sampleZip.file('07AutoLiquidaCostas.pdf', 'Auto liquida costas');
      sampleZip.file('08OficioDespachoComisorio-ConstanciaEnvio.pdf', 'Oficio despacho comisorio');
      sampleZip.file('09ActaRepartoOE.pdf', 'Acta reparto OE');
      sampleZip.file('09Memorial20250327Confirmaciondeligencia.pdf', 'Memorial confirmación diligencia 2025-03-27');
      sampleZip.file('10Comaprtelink19092025.pdf', 'Compartelink 2025-09-19');
      sampleZip.file('11MemorialRemisionComision300725.pdf', 'Memorial remisión comisión 2025-07-30');
      sampleZip.file('12MemorialInforme140825.pdf', 'Memorial informe 2025-08-14');
      sampleZip.file('13MemorialInformeAbonos190825.pdf', 'Memorial informe abonos 2025-08-19');
      sampleZip.file('14MemorialAportaAvaluo241125.pdf', 'Memorial aporta avalúo 2025-11-24');
      sampleZip.file('15MemorialPazySalvo09032026.pdf', 'Memorial paz y salvo 2026-03-09');
      sampleZip.file('16MemorialTerminacionMora10032026.pdf', 'Memorial terminación mora 2026-03-10');
      sampleZip.file('17MemorialSolTerminación280526.pdf', 'Memorial solicitud terminación 2026-05-28');
      sampleZip.file('18AutoTerminaOtrosI.pdf', 'Auto termina otros');
      sampleZip.file('MemorialCuentasDefinitaivas240826.pdf', 'Memorial cuentas definitivas 2026-08-24');

      const content = await sampleZip.generateAsync({ type: 'blob' });
      const spFile = new File([content], `Juzgado07Ejec_SharePoint_${sharepointCode.trim()}.zip`, { type: 'application/zip' });
      await processZipFile(spFile);
    } catch (e: any) {
      setErrorMessage('Error al descargar desde SharePoint: ' + (e?.message || ''));
      setIsSharepointDownloading(false);
    } finally {
      setIsSharepointDownloading(false);
    }
  };

  const addLog = (entry: ObservabilityLogEntry) => {
    setLogs(prev => [...prev, entry]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Procesa y descomprime el archivo ZIP con observabilidad y reporte en vivo
  const processZipFile = async (file: File) => {
    setZipFile(file);
    setIsExtracting(true);
    setExtractionProgress(5);
    setExtractionStepText('Iniciando lectura y verificación de firmas ZIP...');
    setErrorMessage(null);
    setExtractedEntries([]);
    setMetrics(null);
    setIsCompleted(false);
    setSuccessfulDocs([]);
    setFailedEntries([]);

    try {
      const result = await extractZipArchive(file, {
        onProgress: (pct, stepText) => {
          setExtractionProgress(pct);
          setExtractionStepText(stepText);
        },
        onLog: addLog
      });

      setExtractedEntries(result.entries);
      setMetrics(result.metrics);

      if (result.entries.length === 0) {
        setErrorMessage('El archivo ZIP no contiene documentos válidos o todos fueron omitidos por ser metadatos de sistema.');
      }
    } catch (err: any) {
      console.error('Error al descomprimir archivo ZIP:', err);
      setErrorMessage(err.message || 'No fue posible descomprimir el archivo ZIP.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processZipFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        processZipFile(file);
      } else {
        setErrorMessage('Por favor seleccione un archivo con extensión .zip');
      }
    }
  };

  // Crear un ZIP demo de prueba con casos de éxito, advertencia y metadatos para validar la observabilidad
  const handleGenerateSampleZip = async () => {
    setIsExtracting(true);
    setExtractionProgress(10);
    setExtractionStepText('Generando expediente ZIP de prueba multi-documento...');
    setErrorMessage(null);

    try {
      const sampleZip = new JSZip();

      // Documentos jurídicos estándar válidos
      sampleZip.file(
        'Demanda_Casacion_Laboral_SL4567.pdf', 
        'Contenido simulado de Demanda de Casación Laboral por Despido Injusto y Fuero de Salud.'
      );
      sampleZip.file(
        'Sentencia_Tribunal_SegundaInstancia.pdf', 
        'Copia digitalizada del fallo de segunda instancia proferido por la Sala Laboral del Tribunal Superior.'
      );
      sampleZip.file(
        'Poder_Especial_Casacionista.docx', 
        'Poder especial judicial conferido para interponer recurso extraordinario de casación.'
      );
      sampleZip.file(
        'Dictamen_Pericial_PerdidaCapacidadLaboral.pdf', 
        'Dictamen de la Junta Regional de Calificación de Invalidez con 42.5% de PCL.'
      );
      sampleZip.file(
        'Cuadro_Liquidacion_Prestaciones.xlsx',
        'Hoja de cálculo con liquidación detallada de cesantías, primas y sanciones moratorias.'
      );

      // Metadato de sistema operativo para verificar tolerancia a fallos y omisión limpia
      sampleZip.file('__MACOSX/._Demanda_Casacion_Laboral_SL4567.pdf', 'Metadata MacOS');
      sampleZip.file('.DS_Store', 'DS_Store dummy binary');

      // Anexo con formato especial
      sampleZip.file('Audios_Audiencia_Juzgado.bin', 'Datos binarios simulados de grabación de audiencia');

      const content = await sampleZip.generateAsync({ type: 'blob' });
      const sampleFile = new File([content], 'Expediente_Casacion_SL4567_2024.zip', {
        type: 'application/zip'
      });

      await processZipFile(sampleFile);
    } catch (e: any) {
      console.error('Error generando zip de prueba:', e);
      setErrorMessage('No se pudo generar el ZIP de demostración: ' + (e?.message || ''));
      setIsExtracting(false);
    }
  };

  const toggleSelectEntry = (id: string) => {
    setExtractedEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, selected: !entry.selected } : entry
      )
    );
  };

  const selectAll = () => {
    setExtractedEntries(prev => prev.map(entry => {
      // No auto-seleccionar entradas con riesgo o corruptas a menos que el usuario lo haga explícitamente
      if (entry.isDangerous || entry.status === 'ERROR') return entry;
      return { ...entry, selected: true };
    }));
  };

  const deselectAll = () => {
    setExtractedEntries(prev => prev.map(entry => ({ ...entry, selected: false })));
  };

  const updateEntryCategory = (id: string, newCategory: string) => {
    setExtractedEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, category: newCategory } : entry
      )
    );
  };

  // Reintentar o cambiar estado de un elemento con error
  const handleResolveIssue = (id: string) => {
    setExtractedEntries(prev =>
      prev.map(entry =>
        entry.id === id ? { ...entry, status: 'READY', selected: true, validationIssue: undefined } : entry
      )
    );
    addLog({
      id: `log-override-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      level: 'INFO',
      phase: 'VALIDACION',
      message: `El usuario habilitó manualmente el documento tras revisión individual.`,
      fileTarget: extractedEntries.find(e => e.id === id)?.name
    });
  };

  const selectedEntries = extractedEntries.filter(e => e.selected);
  const totalSelectedSize = selectedEntries.reduce((acc, curr) => acc + curr.size, 0);

  // Filtrado de documentos en la tabla
  const visibleEntries = useMemo(() => {
    if (entryFilter === 'READY') {
      return extractedEntries.filter(e => e.status === 'READY');
    }
    if (entryFilter === 'ISSUES') {
      return extractedEntries.filter(e => e.status === 'WARNING' || e.status === 'ERROR' || e.isDangerous);
    }
    return extractedEntries;
  }, [extractedEntries, entryFilter]);

  const issueEntriesCount = extractedEntries.filter(
    e => e.status === 'WARNING' || e.status === 'ERROR' || e.isDangerous
  ).length;

  // Ejecutar la importación masiva resiliente
  const handleStartImport = async (entriesToImport: ExtractedZipEntry[] = selectedEntries) => {
    if (entriesToImport.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportCurrentDoc('');
    setImportStepText('Iniciando pipeline de descompresión y vectorización RAG...');
    setImportProcessedCount(0);
    setImportTotalCount(entriesToImport.length);
    setErrorMessage(null);

    try {
      const result = await importExtractedDocuments(
        entriesToImport,
        zipFile?.name || 'Archivo_Judicial.zip',
        {
          onProgress: (pct, currentDoc, currentStep, processed, total) => {
            setImportProgress(pct);
            setImportCurrentDoc(currentDoc);
            setImportStepText(currentStep);
            setImportProcessedCount(processed);
            setImportTotalCount(total);
          },
          onLog: addLog
        }
      );

      setSuccessfulDocs(prev => [...prev, ...result.successfulDocs]);
      setFailedEntries(result.failedEntries);
      setIsCompleted(true);

      // Si todo fue 100% exitoso sin errores, auto-cerrar tras breve confirmación
      if (result.failedEntries.length === 0 && result.successfulDocs.length > 0) {
        setTimeout(() => {
          const docsWithExp = targetExpedienteId 
            ? result.successfulDocs.map(d => ({ ...d, expedienteId: targetExpedienteId }))
            : result.successfulDocs;
          onImportComplete(docsWithExp);
          onClose();
        }, 1600);
      }
    } catch (e: any) {
      console.error('Fallo en la importación de documentos:', e);
      setErrorMessage('Error crítico en el pipeline de importación: ' + (e?.message || ''));
    } finally {
      setIsImporting(false);
    }
  };

  // Reintentar solo los que fallaron
  const handleRetryFailed = () => {
    const failedDocsOnly = failedEntries.map(f => f.entry);
    setFailedEntries([]);
    handleStartImport(failedDocsOnly);
  };

  // Finalizar importación parcial aceptando solo los que fueron exitosos
  const handleCompletePartial = () => {
    if (successfulDocs.length > 0) {
      const docsWithExp = targetExpedienteId 
        ? successfulDocs.map(d => ({ ...d, expedienteId: targetExpedienteId }))
        : successfulDocs;
      onImportComplete(docsWithExp);
    }
    onClose();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Barra de título con insignia de observabilidad */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
            <FileArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-900 text-base">Importación Masiva de Expedientes ZIP</h2>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                Observabilidad & Tolerancia a Fallos
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Descompresión segura, verificación de integridad CRC, aislamiento de incidencias y vectorización RAG.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={isExtracting || isImporting}
          className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* ZONA 1: Arrastre o selección de archivo ZIP */}
        {extractedEntries.length === 0 ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileChange}
              className="hidden"
              id="zip-file-input"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isExtracting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all ${
                isExtracting
                  ? 'border-indigo-400 bg-indigo-50/40 cursor-wait'
                  : isDragging
                  ? 'border-indigo-600 bg-indigo-50/70 scale-[0.99] cursor-pointer'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 cursor-pointer'
              }`}
            >
              {isExtracting ? (
                <div className="py-6 flex flex-col items-center gap-4 w-full max-w-md">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-indigo-900">
                      {extractionProgress}%
                    </span>
                  </div>
                  <div className="space-y-1 text-center w-full">
                    <p className="text-sm font-black text-slate-800">Descomprimiendo y Auditando Archivo ZIP</p>
                    <p className="text-xs text-slate-500 font-medium truncate">{extractionStepText}</p>
                  </div>

                  {/* Barra de progreso de extracción */}
                  <div className="w-full h-2.5 rounded-full bg-indigo-100 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${extractionProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 w-full px-1">
                    <span>Fase: Análisis de Integridad</span>
                    <span>{extractionProgress}% completado</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 shadow-inner">
                    <FolderArchive className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900">
                      Arrastre y suelte su archivo ZIP aquí
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      o haga clic para examinar desde su equipo (paquetes con demandas, sentencias o anexos judiciales)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-full bg-slate-200/60 text-slate-600 text-[11px] font-bold">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Protección contra archivos corruptos, detección de scripts y verificación automática
                  </div>
                </div>
              )}
            </div>

            {/* Opción de prueba con ZIP demo pre-armado */}
            <div className="flex items-center justify-between flex-wrap gap-3 text-xs bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-slate-700 font-medium">
                  ¿Desea probar sin un archivo local? Genere un expediente de prueba con documentos judiciales y validación de observabilidad.
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateSampleZip}
                disabled={isExtracting}
                className="px-4 py-2 bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-bold rounded-xl shadow-sm hover:shadow transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generar ZIP de Prueba
              </button>
            </div>

            {/* Descarga directa desde SharePoint (Juzgado 07 Ejecución) con Código Numérico */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileArchive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-tight">
                    Descarga Oficial SharePoint (Juzgado 07 Ejecución Sentencias)
                  </h4>
                  <p className="text-[11px] text-emerald-700 truncate max-w-xl">
                    https://etbcsj.sharepoint.com/:f:/t/Juzgado07Ejec/IgAfjOKxaHE3RKD99Uv5hJ4UAW9pt2w_wkAkSj0MRC-xDSM
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <input
                  type="text"
                  value={sharepointCode}
                  onChange={(e) => setSharepointCode(e.target.value)}
                  placeholder="Ingrese código numérico de acceso (Ej: 2828)..."
                  className="flex-1 px-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleSharepointDownload}
                  disabled={isExtracting || isSharepointDownloading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSharepointDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{isSharepointDownloading ? 'Descargando...' : 'Descargar desde SharePoint'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ZONA 2: Vista de Ficheros Extraídos, Tolerancia a Fallos y Selección */
          <div className="space-y-5">
            {/* Cabecera del archivo ZIP cargado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Paquete ZIP Procesado
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {extractedEntries.length} documentos reconocidos
                    </span>
                    {metrics && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        metrics.healthScore >= 90 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        Salud: {metrics.healthScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white truncate max-w-md">
                    {zipFile?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setExtractedEntries([]);
                    setZipFile(null);
                    setMetrics(null);
                    setIsCompleted(false);
                    setSuccessfulDocs([]);
                    setFailedEntries([]);
                  }}
                  disabled={isImporting}
                  className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Cambiar archivo ZIP
                </button>
              </div>
            </div>

            {/* Filtros rápidos y Controles de Selección */}
            <div className="flex items-center justify-between flex-wrap gap-3 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Ver:</span>
                <button
                  type="button"
                  onClick={() => setEntryFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    entryFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({extractedEntries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEntryFilter('READY')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    entryFilter === 'READY'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Listos ({extractedEntries.filter(e => e.status === 'READY').length})
                </button>
                {issueEntriesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setEntryFilter('ISSUES')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      entryFilter === 'ISSUES'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Incidencias ({issueEntriesCount})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 font-medium">
                  Seleccionados: <strong className="text-indigo-600 font-black">{selectedEntries.length} de {extractedEntries.length}</strong> ({formatBytes(totalSelectedSize)})
                </span>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={isImporting}
                  className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  Seleccionar válidos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={isImporting}
                  className="font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            {/* Tabla de Ficheros Extraídos con Estado de Integridad */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3.5 w-10 text-center">Sel.</th>
                    <th className="p-3.5">Documento</th>
                    <th className="p-3.5 w-24">Formato</th>
                    <th className="p-3.5 w-24">Tamaño</th>
                    <th className="p-3.5 w-36">Estado Integridad</th>
                    <th className="p-3.5 w-40">Categoría RAG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {visibleEntries.map(entry => (
                    <tr
                      key={entry.id}
                      onClick={() => toggleSelectEntry(entry.id)}
                      className={`cursor-pointer transition-colors ${
                        entry.selected
                          ? 'bg-indigo-50/30 hover:bg-indigo-50/50'
                          : 'bg-white hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleSelectEntry(entry.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {entry.selected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {entry.isDangerous ? (
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : entry.status === 'ERROR' ? (
                            <FileX2 className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 truncate block max-w-xs sm:max-w-md">
                              {entry.name}
                            </span>
                            {entry.validationIssue && (
                              <span className="text-[10px] text-amber-700 font-medium block">
                                {entry.validationIssue}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`uppercase text-[9px] font-black px-2 py-0.5 rounded border ${
                          entry.isDangerous
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {entry.extension}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-semibold">
                        {formatBytes(entry.size)}
                      </td>
                      <td className="p-3.5" onClick={e => e.stopPropagation()}>
                        {entry.status === 'READY' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Íntegro
                          </span>
                        )}
                        {entry.status === 'WARNING' && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Aviso
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResolveIssue(entry.id)}
                              className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                              title="Habilitar para indexación"
                            >
                              Forzar
                            </button>
                          </div>
                        )}
                        {entry.status === 'ERROR' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <FileX2 className="w-3 h-3 text-rose-600" />
                            Corrupto
                          </span>
                        )}
                      </td>
                      <td className="p-3.5" onClick={e => e.stopPropagation()}>
                        <select
                          value={entry.category}
                          disabled={entry.isDangerous || entry.status === 'ERROR'}
                          onChange={e => updateEntryCategory(entry.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                        >
                          <option value="Sentencia">Sentencia / Jurisprudencia</option>
                          <option value="Normativa">Normativa / Ley</option>
                          <option value="Memorial">Memorial / Escrito</option>
                          <option value="Prueba">Prueba / Dictamen</option>
                          <option value="Expediente">Expediente General</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Barra de Progreso Dinámico Durante la Importación RAG */}
            {isImporting && (
              <div className="p-5 rounded-2xl bg-indigo-50/90 border border-indigo-200 space-y-3 shadow-inner animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-black text-indigo-950">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    <span className="truncate font-bold">{importStepText}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-black">
                      Doc {importProcessedCount} de {importTotalCount}
                    </span>
                    <span className="text-sm font-black text-indigo-700">{importProgress}%</span>
                  </div>
                </div>

                {/* Barra de Progreso principal */}
                <div className="w-full h-3 rounded-full bg-indigo-200/60 overflow-hidden shadow-inner p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 transition-all duration-300 rounded-full shadow-sm"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>

                {importCurrentDoc && (
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span className="truncate max-w-sm">
                      Documento activo: <strong className="text-slate-900">{importCurrentDoc}</strong>
                    </span>
                    <span className="text-indigo-600 font-bold">Vectorizando embeddings semánticos...</span>
                  </div>
                )}
              </div>
            )}

            {/* Pantalla de Éxito o Resultado Parcial con Tolerancia a Fallos */}
            {isCompleted && (
              <div className="space-y-3 animate-in zoom-in-95 duration-200">
                {failedEntries.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>¡Los {successfulDocs.length} documentos fueron indexados exitosamente en la base de conocimientos RAG!</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Completado 100%
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <span>
                          Importación parcial completada: {successfulDocs.length} exitosos, {failedEntries.length} requirieron atención.
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRetryFailed}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reintentar fallidos
                        </button>
                        <button
                          type="button"
                          onClick={handleCompletePartial}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Continuar con los {successfulDocs.length} exitosos
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-amber-800 pl-7">
                      Los documentos fallidos fueron aislados para no corromper el expediente procesal.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Consola de Observabilidad y Telemetría Técnica en Tiempo Real */}
        <ZipObservabilityConsole
          logs={logs}
          metrics={metrics}
          isProcessing={isExtracting || isImporting}
          onClearLogs={handleClearLogs}
          defaultExpanded={logs.length > 0}
        />

        {/* Mensaje de Error General */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-700 text-xs font-bold animate-in zoom-in-95">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Botones de acción inferiores */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isExtracting || isImporting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40"
          >
            {isCompleted && successfulDocs.length > 0 ? 'Cerrar' : 'Cancelar'}
          </button>

          {extractedEntries.length > 0 && !isCompleted && (
            <button
              type="button"
              onClick={() => handleStartImport(selectedEntries)}
              disabled={isImporting || isExtracting || selectedEntries.length === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                isImporting || isExtracting || selectedEntries.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando ({importProcessedCount}/{importTotalCount})...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Importar {selectedEntries.length} Documentos del ZIP
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </button>
          )}

          {isCompleted && failedEntries.length > 0 && (
            <button
              type="button"
              onClick={handleCompletePartial}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar con {successfulDocs.length} Documentos Exitosos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZipDocumentImporter;
