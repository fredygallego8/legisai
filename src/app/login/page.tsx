'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

function LoginInner() {
  const params = useSearchParams();
  const rd = params.get('rd') || '/';
  const error = params.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-5">
          <span className="text-white font-black text-xl">AI</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-1">LegisAI Colombia</h1>
        <p className="text-slate-500 text-sm mb-8">
          Acceso restringido al despacho. Autenticación con Google.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold">
            {error === 'forbidden'
              ? 'Esta cuenta de Google no tiene acceso a LegisAI.'
              : 'No se pudo completar el inicio de sesión.'}
          </div>
        )}

        <button
          onClick={() =>
            authClient.signIn.social({ provider: 'google', callbackURL: rd })
          }
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-600 hover:bg-slate-50 transition-all font-bold text-slate-800"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        <p className="mt-8 text-[10px] text-slate-400 leading-relaxed">
          Al ingresar autoriza el tratamiento de datos conforme a la Ley 1581 de
          2012 y el secreto profesional de la abogacía en Colombia.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
