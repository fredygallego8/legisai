import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileArchive, 
  Layers,
  Scale,
  FolderPlus,
  Hash,
  Building2,
  Users,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LegalDocument, Expediente } from '../../types';
import { ZipDocumentImporter } from './ZipDocumentImporter';
import { DocumentStorageService } from '../../services/documents/documentStorageService';
import { ExpedienteStorageService } from '../../services/expedientes/expedienteStorageService';

interface NewExpedienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (newDocs: LegalDocument[]) => void;
  defaultMode?: 'SINGLE' | 'ZIP' | 'METADATA';
}

export const NewExpedienteModal: React.FC<NewExpedienteModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  defaultMode = 'SINGLE'
}) => {
  const [activeTab, setActiveTab] = useState<'SINGLE' | 'ZIP' | 'METADATA'>(defaultMode);

  // Formulario Individual
  const [singleName, setSingleName] = useState('');
  const [singleRadicado, setSingleRadicado] = useState('');
  const [singleCorporacion, setSingleCorporacion] = useState('Corte Suprema de Justicia - Sala Laboral');
  const [singleCategory, setSingleCategory] = useState('Sentencia');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formulario de Carátula Digital
  const [metaRadicado, setMetaRadicado] = useState('');
  const [metaCorporacion, setMetaCorporacion] = useState('Tribunal Superior de Distrito Judicial');
  const [metaDemandante, setMetaDemandante] = useState('');
  const [metaDemandado, setMetaDemandado] = useState('');
  const [metaAsunto, setMetaAsunto] = useState('');
  const [metaTipoProceso, setMetaTipoProceso] = useState('Ordinario Laboral de Primera Instancia');

  if (!isOpen) return null;

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Si el usuario selecciona un ZIP en el modo normal, cambiar automáticamente a modo ZIP
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        setActiveTab('ZIP');
        return;
      }
      setSingleFile(file);
      if (!singleName) {
        setSingleName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) {
      setFormError('Por favor asigne un nombre o título al expediente.');
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      // Simular procesamiento de indexación en RAG
      await new Promise(r => setTimeout(r, 1000));

      const newExpId = `exp-${Date.now()}`;
      const rad = singleRadicado.trim() || `11001-31-05-015-2024-${Math.floor(10000 + Math.random() * 90000)}-01`;
      
      const newExpediente: Expediente = {
        id: newExpId,
        radicado: rad,
        titulo: singleName.trim(),
        demandante: 'Parte Demandante / Convocante',
        demandado: 'Parte Demandada / Vinculada',
        despacho: singleCorporacion,
        tipoProceso: singleCategory,
        estado: 'En Trámite',
        fechaInicio: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: Date.now()
      };
      ExpedienteStorageService.addExpediente(newExpediente);
      ExpedienteStorageService.setActiveExpedienteId(newExpId);

      const finalExt = singleFile ? singleFile.name.split('.').pop()?.toLowerCase() || 'pdf' : 'pdf';
      const docName = singleFile ? singleFile.name : `${singleName.replace(/\s+/g, '_')}.${finalExt}`;

      const newDoc: LegalDocument = {
        id: `doc-${Date.now()}`,
        userId: 'user-1',
        expedienteId: newExpId,
        name: docName,
        type: finalExt,
        size: singleFile ? singleFile.size : 1048576,
        status: 'READY',
        createdAt: Date.now(),
        originZip: undefined
      };

      DocumentStorageService.addDocument(newDoc);
      setUploadSuccess(true);

      setTimeout(() => {
        if (onComplete) onComplete([newDoc]);
        onClose();
      }, 1000);
    } catch (err: any) {
      setFormError('No fue posible indexar el documento.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaRadicado.trim() || !metaAsunto.trim()) {
      setFormError('El radicado y el asunto fáctico son obligatorios.');
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      await new Promise(r => setTimeout(r, 700));

      const newExpId = `exp-${Date.now()}`;
      const newExpediente: Expediente = {
        id: newExpId,
        radicado: metaRadicado.trim(),
        titulo: metaAsunto.trim(),
        demandante: metaDemandante.trim() || 'Parte Convocante',
        demandado: metaDemandado.trim() || 'Parte Convocada',
        despacho: metaCorporacion,
        tipoProceso: metaTipoProceso,
        estado: 'Radicado / Carátula Creada',
        fechaInicio: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: Date.now()
      };
      ExpedienteStorageService.addExpediente(newExpediente);
      ExpedienteStorageService.setActiveExpedienteId(newExpId);

      const cleanRadicado = metaRadicado.trim().replace(/[^a-zA-Z0-9-]/g, '_');
      const docName = `Expediente_${cleanRadicado}_${metaTipoProceso.split(' ')[0]}.pdf`;

      const newDoc: LegalDocument = {
        id: `doc-case-${Date.now()}`,
        userId: 'user-1',
        expedienteId: newExpId,
        name: docName,
        type: 'pdf',
        size: 524288,
        status: 'READY',
        createdAt: Date.now()
      };

      DocumentStorageService.addDocument(newDoc);
      setUploadSuccess(true);

      setTimeout(() => {
        if (onComplete) onComplete([newDoc]);
        onClose();
      }, 1000);
    } catch (err) {
      setFormError('Error al crear la carátula del expediente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleZipComplete = (newDocs: LegalDocument[]) => {
    const docs = Array.isArray(newDocs) ? newDocs : [];
    const newExpId = `exp-zip-${Date.now()}`;
    const zipName = docs[0]?.originZip 
      ? docs[0].originZip.replace(/\.zip$/i, '').replace(/_/g, ' ') 
      : 'Expediente Comprimido ZIP';

    const newExpediente: Expediente = {
      id: newExpId,
      radicado: `11001-31-00-001-2024-${Math.floor(10000 + Math.random() * 90000)}-01`,
      titulo: zipName,
      demandante: 'Parte Demandante',
      demandado: 'Parte Demandada',
      despacho: 'Tribunal Superior de Distrito Judicial',
      tipoProceso: 'Expediente Digital ZIP',
      estado: 'Documentos Indexados',
      fechaInicio: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: Date.now()
    };
    ExpedienteStorageService.addExpediente(newExpediente);
    ExpedienteStorageService.setActiveExpedienteId(newExpId);

    const docsWithExpediente = docs.map(d => ({ ...d, expedienteId: newExpId }));
    DocumentStorageService.addBatchDocuments(docsWithExpediente);
    if (onComplete) onComplete(docsWithExpediente);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        
        {/* Encabezado del Modal */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-300">
              <FolderPlus className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-slate-900 text-lg tracking-tight">Nuevo Expediente Judicial</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Ingesta RAG
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Incorpore providencias, demandas o paquetes de expedientes judiciales para análisis dogmático.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Modo de Creación */}
        <div className="px-8 pt-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <button
            type="button"
            onClick={() => { setActiveTab('SINGLE'); setFormError(null); }}
            className={`pb-3.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'SINGLE'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Cargar Documento / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('ZIP'); setFormError(null); }}
            className={`pb-3.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'ZIP'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileArchive className="w-4 h-4 text-indigo-600" />
            <span>Importar Paquete ZIP</span>
            <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full">
              Masivo
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('METADATA'); setFormError(null); }}
            className={`pb-3.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'METADATA'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Crear Carátula Digital</span>
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-8">
          {activeTab === 'ZIP' ? (
            <div className="space-y-4">
              <ZipDocumentImporter
                onClose={onClose}
                onImportComplete={handleZipComplete}
              />
            </div>
          ) : activeTab === 'SINGLE' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-6">
              {/* Zona de Carga de Archivo */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Archivo del Expediente o Providencia
                </label>
                
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50 rounded-2xl p-6 text-center transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.rtf,.xlsx,.zip"
                    onChange={handleFileSelection}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {singleFile ? (
                    <div className="flex items-center justify-center gap-3 text-indigo-700">
                      <FileText className="w-8 h-8" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{singleFile.name}</p>
                        <p className="text-xs text-slate-500">{(singleFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        Arrastre su archivo aquí o haga clic para examinar
                      </p>
                      <p className="text-xs text-slate-400">
                        Admite PDF, Word (.docx), TXT y archivos comprimidos ZIP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nombre o Título del Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleName}
                    onChange={e => setSingleName(e.target.value)}
                    placeholder="ej: Demanda_Laboral_Casacion_2024"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Número de Radicación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={singleRadicado}
                    onChange={e => setSingleRadicado(e.target.value)}
                    placeholder="ej: 11001-31-05-004-2021-00456-01"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Despacho / Corporación Judicial
                  </label>
                  <select
                    value={singleCorporacion}
                    onChange={e => setSingleCorporacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Corte Suprema de Justicia - Sala Laboral">Corte Suprema de Justicia - Sala Laboral</option>
                    <option value="Corte Suprema de Justicia - Sala Penal">Corte Suprema de Justicia - Sala Penal</option>
                    <option value="Corte Suprema de Justicia - Sala Civil">Corte Suprema de Justicia - Sala Civil</option>
                    <option value="Corte Constitucional de Colombia">Corte Constitucional de Colombia</option>
                    <option value="Consejo de Estado">Consejo de Estado</option>
                    <option value="Tribunal Superior de Distrito Judicial">Tribunal Superior de Distrito Judicial</option>
                    <option value="Juzgado del Circuito">Juzgado del Circuito</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Categoría para Búsqueda RAG
                  </label>
                  <select
                    value={singleCategory}
                    onChange={e => setSingleCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Sentencia">Sentencia / Jurisprudencia</option>
                    <option value="Demanda">Demanda / Memorial</option>
                    <option value="Normativa">Normativa / Ley</option>
                    <option value="Prueba">Prueba / Dictamen Pericial</option>
                    <option value="Expediente">Expediente General</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>¡Expediente incorporado e indexado con éxito en el repositorio!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadSuccess}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Indexando en RAG...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Guardar e Indexar Expediente
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Pestaña: Carátula Digital Sin Archivo Inicial */
            <form onSubmit={handleMetadataSubmit} className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Ficha Procesal Digital (23 Dígitos)</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    Permite abrir una carpeta de expediente digital en el despacho antes de adjuntar las providencias y anexos.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Número Único de Radicación (23 Dígitos) *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={metaRadicado}
                      onChange={e => setMetaRadicado(e.target.value)}
                      placeholder="11001310500420210045601"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 tracking-wider"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Parte Demandante / Accionante
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={metaDemandante}
                      onChange={e => setMetaDemandante(e.target.value)}
                      placeholder="ej: Carlos Alberto Morales"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Parte Demandada / Accionada
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={metaDemandado}
                      onChange={e => setMetaDemandado(e.target.value)}
                      placeholder="ej: Aseguradora Positiva S.A."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Tipo de Procedimiento Judicial
                  </label>
                  <select
                    value={metaTipoProceso}
                    onChange={e => setMetaTipoProceso(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Ordinario Laboral de Primera Instancia">Ordinario Laboral de Primera Instancia</option>
                    <option value="Recurso Extraordinario de Casación">Recurso Extraordinario de Casación</option>
                    <option value="Acción de Tutela">Acción de Tutela</option>
                    <option value="Verbal Civil Sumario">Verbal Civil Sumario</option>
                    <option value="Nulidad y Restablecimiento del Derecho">Nulidad y Restablecimiento del Derecho</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Corporación Judicial de Origen
                  </label>
                  <select
                    value={metaCorporacion}
                    onChange={e => setMetaCorporacion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Corte Suprema de Justicia - Sala Laboral">Corte Suprema de Justicia - Sala Laboral</option>
                    <option value="Tribunal Superior de Distrito Judicial">Tribunal Superior de Distrito Judicial</option>
                    <option value="Juzgado Laboral del Circuito">Juzgado Laboral del Circuito</option>
                    <option value="Corte Constitucional">Corte Constitucional</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Asunto Procesal o Pretensión Principal *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={metaAsunto}
                    onChange={e => setMetaAsunto(e.target.value)}
                    placeholder="ej: Demanda ordinaria por despido en estado de debilidad manifiesta y reconocimiento de indemnización por fuero de salud..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>¡Carátula del expediente creada correctamente!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadSuccess}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registrando expediente...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      Crear Expediente Digital
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewExpedienteModal;
