import Link from 'next/link';

export default function NoAutorizadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Acceso denegado</h1>
        <p className="text-slate-500 text-sm mb-6">
          Tu cuenta de Google no está en la lista de usuarios autorizados de este
          despacho.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
        >
          Volver
        </Link>
      </div>
    </div>
  );
}
