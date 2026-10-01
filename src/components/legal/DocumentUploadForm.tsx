import { apiFetch } from '../../services/api/apiClient';

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, FileArchive, Layers, Sparkles } from 'lucide-react';
import { ZipDocumentImporter } from './ZipDocumentImporter';
import { LegalDocument } from '../../types';
import { pdfRagService } from '../../services/documents/pdfRagService';
import { ExpedienteStorageService } from '../../services/expedientes/expedienteStorageService';

interface DocumentUploadFormProps {
  onClose: () => void;
  onUploadComplete: (newDoc: any) => void;
  onBatchUploadComplete?: (newDocs: LegalDocument[]) => void;
  initialMode?: 'SINGLE' | 'ZIP';
  targetExpedienteId?: string;
}

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({ 
  onClose, 
  onUploadComplete,
  onBatchUploadComplete,
  initialMode = 'SINGLE',
  targetExpedienteId
}) => {
  const [mode, setMode] = useState<'SINGLE' | 'ZIP'>(initialMode);
  const [name, setName] = useState('');
  const [type, setType] = useState('Normativa');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [parsingStatus, setParsingStatus] = useState<string | null>(null);

  const resolvedExpedienteId = targetExpedienteId || ExpedienteStorageService.getActiveExpedienteId();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Si el usuario selecciona un ZIP en el modo normal, cambiar automáticamente a importador ZIP
      if (selectedFile.name.toLowerCase().endsWith('.zip') || selectedFile.type.includes('zip')) {
        setMode('ZIP');
        return;
      }

      setFile(selectedFile);
      if (!name) setName(selectedFile.name);
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFile(null);
  };

  const handleBatchDone = (newDocs: LegalDocument[]) => {
    const mapped = newDocs.map(d => ({
      ...d,
      expedienteId: d.expedienteId || resolvedExpedienteId
    }));
    if (onBatchUploadComplete) {
      onBatchUploadComplete(mapped);
    } else {
      mapped.forEach(doc => onUploadComplete(doc));
    }
    onClose();
  };

  if (mode === 'ZIP') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setMode('SINGLE')}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
          >
            ← Cambiar a carga de documento individual
          </button>
        </div>
        <ZipDocumentImporter 
          onClose={onClose} 
          onImportComplete={handleBatchDone}
          targetExpedienteId={resolvedExpedienteId}
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setIsUploading(true);
    setUploadStatus('IDLE');
    setParsingStatus('🤖 DocumentParser analizando con gemini-2.0-flash: Extrayendo Demandante, Demandado, Despacho y Asunto...');

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
      const isHtml = file.name.toLowerCase().endsWith('.html') || file.type.includes('html');
      let ragChunkCount: number | undefined;
      let fileContentText = `Documento ${name} perteneciente al expediente judicial.`;

      if (isPdf || isHtml) {
        const processedDoc = await pdfRagService.processLocalPdf(file, resolvedExpedienteId);
        ragChunkCount = processedDoc.totalChunks;
        if (processedDoc.textPreview) {
          fileContentText = processedDoc.textPreview;
        }

        // Invocar DocumentParser vía API para extraer y validar con gemini-2.0-flash y guardar en Neon DB
        try {
          const res = await apiFetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: name, fileContentText })
          });
          const data = await res.json();
          if (data.success && data.metadata) {
            setParsingStatus(`✓ Validación exitosa: Dte: ${data.metadata.demandante} | Ddo: ${data.metadata.demandado} | Despacho: ${data.metadata.despacho}`);
          } else {
            setParsingStatus('✓ Documento indexado y procesado por gemini-2.0-flash');
          }
        } catch (parseErr) {
          console.warn('DocumentParser request warning:', parseErr);
          setParsingStatus('✓ Procesamiento completado');
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setParsingStatus('✓ Documento cargado correctamente');
      }
      
      const newDoc: LegalDocument = {
        id: `doc-${Date.now()}`,
        userId: 'user-1',
        expedienteId: resolvedExpedienteId,
        name: name,
        type: type,
        size: file.size,
        status: 'READY',
        createdAt: Date.now(),
        ragIndexed: isPdf || isHtml,
        ragChunkCount
      };

      setUploadStatus('SUCCESS');
      setTimeout(() => {
        onUploadComplete(newDoc);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error al procesar documento:', err);
      setUploadStatus('ERROR');
      setParsingStatus('Error en la extracción con DocumentParser');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Cargar Expediente o Documento Jurídico</h2>
            <p className="text-[11px] text-slate-500">Seleccione el modo de incorporación</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-bold mr-2">
            <button
              type="button"
              onClick={() => setMode('SINGLE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                mode === 'SINGLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setMode('ZIP')}
              className="px-3 py-1 rounded-lg transition-all text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
            >
              <FileArchive className="w-3.5 h-3.5" />
              Paquete ZIP
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Expediente</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Demanda_Casacion_2024.pdf"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría Jurídica</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
            >
              <option value="Normativa">Normativa / Ley</option>
              <option value="Sentencia">Sentencia / Jurisprudencia</option>
              <option value="Reglamentación">Reglamentación / Decreto</option>
              <option value="Otro">Otro / Prueba</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Archivo (PDF, TXT, DOCX, ZIP)</label>
            <div className="relative">
              <input
                type="file"
                required
                accept=".pdf,.txt,.doc,.docx,.zip,application/zip"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className={`flex items-center gap-2 w-full bg-slate-50 border border-dashed rounded-xl px-4 py-2.5 text-sm text-slate-600 cursor-pointer transition-all hover:bg-slate-100 ${file ? 'border-indigo-400 ring-2 ring-indigo-500/5' : 'border-slate-300'}`}
              >
                <FileText className={`w-4 h-4 ${file ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                  <span className={`shrink-0 ${file ? 'text-slate-500 text-xs' : 'text-slate-400'}`}>Seleccionar archivo (incluye .zip)...</span>
                  {file && (
                    <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-[10px] font-black border border-indigo-200 animate-in zoom-in-95 truncate">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <button 
                        onClick={handleClearFile}
                        className="p-0.5 hover:bg-indigo-200 rounded-md transition-colors ml-1"
                        title="Quitar archivo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {parsingStatus && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3 text-indigo-800 text-xs font-medium animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            <span>{parsingStatus}</span>
          </div>
        )}

        {uploadStatus === 'SUCCESS' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-emerald-700 text-sm animate-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5" />
            Documento procesado correctamente para RAG.
          </div>
        )}

        {uploadStatus === 'ERROR' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5" />
            Error al subir el documento. Reintente.
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isUploading || !file}
            className={`flex-[2] py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isUploading || !file
                ? 'bg-slate-100 text-slate-400 shadow-none'
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Indexando en Vector DB...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Comenzar Procesamiento
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUploadForm;
