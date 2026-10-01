/**
 * Janitor de los hilos que deja `scripts/smoke-langgraph.ts`.
 *
 * El smoke corre contra la base real y, si el proveedor revienta a mitad del recorrido (503 de
 * Gemini, 429 de cuota, corte de luz), el `finally` internal no llega a borrar nada y quedan filas
 * `smoke-*` en `langgraph_checkpoints` de producción. Este script las quita.
 *
 * El filtro es `thread_id LIKE 'smoke-%'`: ese prefijo solo lo usa el smoke, nunca la app, así que
 * el borrado no puede tocar el hilo de ninguna persona. Aun así exige `--permitir-produccion`.
 *
 * Uso: bun --env-file=.env.smoke scripts/limpiar-hilos-smoke.ts --permitir-produccion
 */
import { getDb } from '../src/lib/db';

const PREFIJO = 'smoke-';
const url = String(process.env.DATABASE_URL || process.env.DATA_BASE || '');
const esProduccion = url.includes('ep-patient-base-b5opm55c');

if (!url) {
  console.error('Falta DATABASE_URL / DATA_BASE en el entorno (usa --env-file=.env.smoke).');
  process.exit(1);
}
if (esProduccion && !process.argv.includes('--permitir-produccion')) {
  console.error('Apunta a producción y borra filas: reejecuta con --permitir-produccion.');
  process.exit(1);
}

const antes = await getDb().query(
  `SELECT thread_id, COUNT(*)::int AS filas FROM langgraph_checkpoints
    WHERE thread_id LIKE $1 GROUP BY thread_id ORDER BY thread_id`,
  [`${PREFIJO}%`],
);

if (!antes.length) {
  console.log('No hay hilos de humo: nada que borrar.');
} else {
  for (const fila of antes) console.log(`  ${fila.thread_id}  (${fila.filas} checkpoints)`);
  const borrados = await getDb().query(
    'DELETE FROM langgraph_checkpoints WHERE thread_id LIKE $1 RETURNING id',
    [`${PREFIJO}%`],
  );
  console.log(`Borrados ${borrados.length} checkpoints de ${antes.length} hilos de humo.`);
}

const quedan = await getDb().query('SELECT COUNT(*)::int AS n FROM langgraph_checkpoints');
console.log(`Filas que quedan en langgraph_checkpoints: ${quedan[0]?.n ?? 0}`);
