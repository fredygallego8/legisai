'use client';

import dynamic from 'next/dynamic';

/**
 * La SPA usa APIs del navegador (localStorage, window) en el arranque, así que
 * se monta solo en el cliente. El middleware ya ha validado la sesión.
 */
const LegisApp = dynamic(() => import('./LegisApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
          <span className="text-white font-black">AI</span>
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] animate-pulse">
          Cargando LegisAI…
        </p>
      </div>
    </div>
  ),
});

export default function LegisAppShell() {
  return <LegisApp />;
}
