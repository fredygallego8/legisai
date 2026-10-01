import { apiFetch } from '../../services/api/apiClient';
import React, { useState, useEffect } from 'react';
import { 
  X, Download, RefreshCw, Search, FileText, Globe, Layers, 
  CheckCircle2, AlertCircle, Database, ArrowUpDown, ChevronUp, ChevronDown 
} from 'lucide-react';

interface AuditDocItem {
  id: string;
  name: string;
  type: string;
  chunk_count: string | number;
}

interface RagAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReindexed?: () => void;
}

export const RagAuditModal: React.FC<RagAuditModalProps> = ({ isOpen, onClose, onReindexed }) => {
  const [data, setData] = useState<AuditDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pdf' | 'html'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/audit-rag');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setData(json.data);
        }
      }
    } catch (e) {
      console.error('Error cargando auditoría RAG:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrado y Ordenamiento por Chunks Vectorizados
  const filtered = data.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (item.id || '').toLowerCase().includes(search.toLowerCase());
    const typeLower = (item.type || '').toLowerCase();
    if (filterType === 'pdf') return matchesSearch && typeLower.includes('pdf');
    if (filterType === 'html') return matchesSearch && typeLower.includes('html');
    return matchesSearch;
  }).sort((a, b) => {
    const countA = parseInt(String(a.chunk_count), 10) || 0;
    const countB = parseInt(String(b.chunk_count), 10) || 0;
    if (sortOrder === 'desc') {
      return countB - countA;
    } else {
      return countA - countB;
    }
  });

  // Estadísticas calculadas
  let totalChunks = 0;
  let pdfChunks = 0;
  let htmlChunks = 0;

  data.forEach(item => {
    const c = parseInt(String(item.chunk_count), 10) || 0;
    totalChunks += c;
    const type = (item.type || '').toLowerCase();
    if (type.includes('pdf')) pdfChunks += c;
    else if (type.includes('html')) htmlChunks += c;
  });

  // Exportar a CSV
  const exportCSV = () => {
    const header = 'Document_ID,Nombre_Archivo,Tipo_Archivo,Cantidad_Chunks,Estado_Indexacion\n';
    const rows = filtered.map(item => {
      const count = parseInt(String(item.chunk_count), 10) || 0;
      const status = count > 0 ? 'INDEXADO' : 'PENDIENTE';
      return `"${item.id}","${(item.name || '').replace(/"/g, '""')}","${item.type}",${count},"${status}"`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_vectores_neon_rag_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar a JSON
  const exportJSON = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      resumen: {
        totalChunks,
        pdfChunks,
        htmlChunks,
        otrosChunks: totalChunks - pdfChunks - htmlChunks,
        totalDocumentos: data.length
      },
      documentos: filtered.map(item => ({
        id: item.id,
        nombre: item.name,
        tipo: item.type,
        chunksVectorizados: parseInt(String(item.chunk_count), 10) || 0,
        estado: (parseInt(String(item.chunk_count), 10) || 0) > 0 ? 'INDEXADO' : 'PENDIENTE'
      }))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_vectores_neon_rag_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerReindex = async () => {
    setReindexing(true);
    try {
      const res = await apiFetch('/api/admin/reindex', { method: 'POST' });
      if (res.ok) {
        await fetchAuditData();
        if (onReindexed) onReindexed();
      }
    } catch (e) {
      console.error('Error al forzar re-indexación:', e);
    } finally {
      setReindexing(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white">
        {/* Encabezado */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Auditoría de Indexación RAG en Neon DB
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  pgvector 768-dim
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Verificación de vectores indexados por documento judicial y tipo de extensión (.pdf vs .html)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Chunks */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950/30 border-b border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Total Chunks</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white">{totalChunks}</div>
            <span className="text-[10px] text-slate-400">vectores en Neon DB</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Chunks PDF (.pdf)</span>
              <FileText className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400">{pdfChunks}</div>
            <span className="text-[10px] text-slate-400">
              {totalChunks > 0 ? ((pdfChunks / totalChunks) * 100).toFixed(1) : 0}% del índice
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Chunks HTML (.html)</span>
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400">{htmlChunks}</div>
            <span className="text-[10px] text-slate-400">
              {totalChunks > 0 ? ((htmlChunks / totalChunks) * 100).toFixed(1) : 0}% del índice
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Otros Formatos</span>
              <Database className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400">
              {totalChunks - pdfChunks - htmlChunks}
            </div>
            <span className="text-[10px] text-slate-400">archivos complementarios</span>
          </div>
        </div>

        {/* Barra de Herramientas: Búsqueda, Filtro y Exportación */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por ID o nombre de documento..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('pdf')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === 'pdf' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                .PDF
              </button>
              <button
                onClick={() => setFilterType('html')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === 'html' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                .HTML
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleTriggerReindex}
              disabled={reindexing}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Re-indexar documentos sin chunks vectoriales"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{reindexing ? 'Indexando...' : 'Re-indexar'}</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Exportar a archivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Exportar a archivo JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Tabla Detallada */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Consultando chunks en Neon PostgreSQL...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No se encontraron documentos con los filtros seleccionados.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Doc ID</th>
                    <th className="p-3">Nombre del Documento</th>
                    <th className="p-3">Extensión</th>
                    <th 
                      onClick={toggleSortOrder}
                      className="p-3 text-right cursor-pointer hover:text-white transition-colors select-none group"
                      title="Haga clic para ordenar por cantidad de chunks (ascendente / descendente)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Chunks Vectorizados</span>
                        <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {sortOrder === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </div>
                      </div>
                    </th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filtered.map(doc => {
                    const count = parseInt(String(doc.chunk_count), 10) || 0;
                    const isIndexed = count > 0;
                    const typeLower = (doc.type || '').toLowerCase();
                    const isPdf = typeLower.includes('pdf');
                    const isHtml = typeLower.includes('html');

                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-slate-400">{doc.id}</td>
                        <td className="p-3 font-medium text-slate-100 flex items-center gap-2">
                          {isPdf ? (
                            <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : isHtml ? (
                            <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate max-w-sm" title={doc.name}>
                            {doc.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isPdf
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                                : isHtml
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            .{doc.type || 'bin'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-white">
                          {count}
                        </td>
                        <td className="p-3 text-center">
                          {isIndexed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              INDEXADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                              <AlertCircle className="w-3 h-3" />
                              PENDIENTE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Mostrando {filtered.length} de {data.length} documentos procesados</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
