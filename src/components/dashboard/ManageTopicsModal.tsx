import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Tag, Scale, Check, 
  Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import { ResearchTopic, SupremeCourtChamber } from '../../types';

interface ManageTopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: ResearchTopic[];
  onSaveTopic: (topic: ResearchTopic) => void;
  onDeleteTopic: (id: string) => void;
  onToggleTopic: (id: string) => void;
}

export const ManageTopicsModal: React.FC<ManageTopicsModalProps> = ({
  isOpen,
  onClose,
  topics,
  onSaveTopic,
  onDeleteTopic,
  onToggleTopic
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [chamber, setChamber] = useState<SupremeCourtChamber>('SALA_LABORAL');
  const [description, setDescription] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');

  if (!isOpen) return null;

  const getChamberLabel = (c: SupremeCourtChamber) => {
    switch (c) {
      case 'SALA_LABORAL': return 'Sala de Casación Laboral';
      case 'SALA_PENAL': return 'Sala de Casación Penal';
      case 'SALA_CIVIL': return 'Sala de Casación Civil y Agraria';
      case 'SALA_PLENA': return 'Sala Plena de la Corte Suprema';
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const newTopic: ResearchTopic = {
      id: `topic-${Date.now()}`,
      name: name.trim(),
      chamber,
      chamberLabel: getChamberLabel(chamber),
      description: description.trim() || `Monitoreo de providencias en ${getChamberLabel(chamber)}`,
      keywords: keywords.length > 0 ? keywords : [name.trim().toLowerCase()],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSaveTopic(newTopic);
    setName('');
    setDescription('');
    setKeywordsInput('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Temas de Investigación Guardados
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                La IA analiza diariamente las providencias de la Corte Suprema según estos temas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Create Button or Form */}
          {!isCreating ? (
            <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">¿Desea monitorear una nueva línea jurisprudencial?</h4>
                  <p className="text-[11px] text-indigo-700/80">
                    Defina palabras clave y la Sala correspondiente para recibir alertas tempranas.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Tema</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600" /> Agregar Tema de Litigio o Investigación
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-medium"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nombre del Tema o Institución Jurídica *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Prueba Ilícita y Regla de Exclusión en Casación Penal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Sala de la Corte Suprema *
                  </label>
                  <select
                    value={chamber}
                    onChange={(e) => setChamber(e.target.value as SupremeCourtChamber)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                  >
                    <option value="SALA_LABORAL">Sala de Casación Laboral</option>
                    <option value="SALA_PENAL">Sala de Casación Penal</option>
                    <option value="SALA_CIVIL">Sala de Casación Civil y Agraria</option>
                    <option value="SALA_PLENA">Sala Plena</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Palabras Clave (Separadas por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="prueba ilícita, exclusión, vicio probatorio"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Descripción u Objetivo del Seguimiento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Finalidad del seguimiento jurisprudencial para los expedientes en curso"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-100"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Tema</span>
                </button>
              </div>
            </form>
          )}

          {/* List of saved topics */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Temas Activos ({topics.length})
            </h4>

            {topics.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">No tiene temas de investigación configurados.</p>
              </div>
            ) : (
              topics.map(topic => (
                <div 
                  key={topic.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    topic.isActive 
                      ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-200' 
                      : 'bg-slate-50 border-slate-200/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          topic.chamber === 'SALA_LABORAL'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : topic.chamber === 'SALA_PENAL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {topic.chamberLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Agregado: {topic.createdAt}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 leading-tight">
                        {topic.name}
                      </h5>

                      {topic.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {topic.description}
                        </p>
                      )}

                      {/* Keywords */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {topic.keywords.map((kw, i) => (
                          <span 
                            key={i} 
                            className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleTopic(topic.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          topic.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                        title={topic.isActive ? 'Tema activo en alertas' : 'Tema pausado'}
                      >
                        {topic.isActive ? 'Activo' : 'Pausado'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteTopic(topic.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar tema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Los temas se cruzan con el repositorio jurisprudencial de la Corte Suprema de Justicia.
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
