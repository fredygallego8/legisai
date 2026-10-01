import React from 'react';
import { X, Scale, Sparkles } from 'lucide-react';
import { Expediente, LegalDocument } from '../../types';
import { ProceduralTermsTable } from './ProceduralTermsTable';

interface ProceduralTermsModalProps {
  expediente: Expediente;
  documents: LegalDocument[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToChat?: (prompt: string) => void;
}

export const ProceduralTermsModal: React.FC<ProceduralTermsModalProps> = ({
  expediente,
  documents,
  isOpen,
  onClose,
  onNavigateToChat
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-100 w-full max-w-7xl max-h-[94vh] rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Auditoría Procesal CGP • Ley 1564 de 2012
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {expediente.titulo}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            title="Cerrar tabla de términos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Modal con Scroll */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1">
          <ProceduralTermsTable 
            expediente={expediente} 
            documents={documents}
            onNavigateToChat={(prompt) => {
              if (onNavigateToChat) onNavigateToChat(prompt);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProceduralTermsModal;
