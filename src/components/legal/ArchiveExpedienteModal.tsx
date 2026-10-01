import React, { useState } from 'react';
import { 
  Archive, 
  AlertTriangle, 
  X, 
  FileText, 
  Scale, 
  ShieldCheck, 
  Check,
  Building2,
  Calendar
} from 'lucide-react';
import { Expediente } from '../../types';

interface ArchiveExpedienteModalProps {
  isOpen: boolean;
  expediente: Expediente | null;
  documentsCount: number;
  onClose: () => void;
  onConfirmArchive: (expedienteId: string, reason: string) => void;
}

const PRESET_REASONS = [
  'Eliminación o retiro solicitado por el usuario',
  'Sentencia ejecutoriada / Proceso judicial concluido',
  'Desistimiento de la demanda o arreglo directo',
  'Conciliación prejudicial o judicial lograda',
  'Falta de jurisdicción o remisión a otro despacho'
];

export const ArchiveExpedienteModal: React.FC<ArchiveExpedienteModalProps> = ({
  isOpen,
  expediente,
  documentsCount,
  onClose,
  onConfirmArchive
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  if (!isOpen || !expediente) return null;

  const handleConfirm = () => {
    const finalReason = useCustom && customReason.trim() ? customReason.trim() : selectedReason;
    onConfirmArchive(expediente.id, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con alerta de archivado */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Confirmación de Archivado
              </span>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                ¿Archivar este expediente judicial?
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-amber-100/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo informativo */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Al archivar este proceso, su estado cambiará a <strong className="text-slate-800">"Archivado"</strong> y <strong className="text-slate-800">no aparecerá por defecto en el catálogo principal</strong> de expedientes vigentes. Toda su información y piezas procesales se conservan intactas.
          </p>

          {/* Tarjeta resumen del expediente */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {expediente.radicado}
              </span>
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                <FileText className="w-3 h-3 text-indigo-600" />
                {documentsCount} Docs
              </span>
            </div>

            <h4 className="font-bold text-slate-900 leading-snug">
              {expediente.titulo}
            </h4>

            <div className="text-[11px] text-slate-500 grid grid-cols-1 gap-1 pt-1 border-t border-slate-200/60">
              <p className="truncate">
                <strong className="text-slate-700">Dte:</strong> {expediente.demandante}
              </p>
              <p className="truncate">
                <strong className="text-slate-700">Ddo:</strong> {expediente.demandado}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                <strong>Despacho:</strong> {expediente.despacho}
              </p>
            </div>
          </div>

          {/* Motivo de archivo */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Motivo o Causal del Archivo
            </label>
            
            <div className="space-y-1.5">
              {PRESET_REASONS.map((reason) => (
                <label 
                  key={reason}
                  onClick={() => {
                    setSelectedReason(reason);
                    setUseCustom(false);
                  }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    !useCustom && selectedReason === reason
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="archiveReason"
                    checked={!useCustom && selectedReason === reason}
                    onChange={() => {
                      setSelectedReason(reason);
                      setUseCustom(false);
                    }}
                    className="accent-amber-600 w-3.5 h-3.5"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              <label 
                onClick={() => setUseCustom(true)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  useCustom
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="archiveReason"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="accent-amber-600 w-3.5 h-3.5"
                />
                <span>Otro motivo específico...</span>
              </label>

              {useCustom && (
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Escriba la razón de archivo de este expediente..."
                  rows={2}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              )}
            </div>
          </div>

          {/* Garantía de trazabilidad */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              Podrá consultar los expedientes archivados o restaurarlos en cualquier momento utilizando el filtro <strong>"Archivados"</strong>.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Confirmar y Archivar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
