import { getDb } from './db';
import { nombresDeFicha } from './piiMasker';

/**
 * Ficha del expediente activo, leída de la base de datos.
 *
 * Devuelve dos cosas que deben venir del **mismo** registro: el contexto que ve el modelo y los
 * nombres de las partes que hay que enmascarar antes de mandárselo (Brecha 9 · C9.4). Si se
 * leyeran por separado, se correría el riesgo de enmascarar el nombre de un expediente y enviar
 * el de otro.
 */
export interface FichaExpediente {
  /** Contexto en texto para el modelo. Vacío si el expediente no existe o la base falla. */
  contexto: string;
  /** Nombres de las partes que el modelo no debe ver (demandante, demandado). */
  nombresPii: string[];
}

const FICHA_VACIA: FichaExpediente = { contexto: '', nombresPii: [] };

export async function buildExpedienteFicha(expedienteId: string): Promise<FichaExpediente> {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM expedientes WHERE id = ${expedienteId} LIMIT 1;`;
    if (!rows || rows.length === 0) return FICHA_VACIA;
    const exp: any = rows[0];
    const contexto = [
      `Título: ${exp.titulo}`,
      `Radicado: ${exp.radicado}`,
      `Demandante: ${exp.demandante}`,
      `Demandado: ${exp.demandado}`,
      `Despacho: ${exp.despacho}`,
      `Tipo de proceso: ${exp.tipo_proceso}`,
      `Estado procesal: ${exp.estado}`,
      `Cuantía: ${exp.cuantia || 'No especificada'}`,
      `Tema jurídico: ${exp.tema_juridico || 'No especificado'}`,
    ].join('\n');
    // Solo las partes: son las columnas de personas que existen en `expedientes`. El despacho no
    // es una persona (y `radicado`/cédulas los detecta el enmascarador por patrón).
    return { contexto, nombresPii: nombresDeFicha([exp.demandante, exp.demandado]) };
  } catch (dbErr: any) {
    console.warn('No se pudo recuperar el expediente para el chat:', dbErr.message);
    return FICHA_VACIA;
  }
}

/** Compatibilidad: solo el contexto en texto. */
export async function buildExpedienteContext(expedienteId: string): Promise<string> {
  return (await buildExpedienteFicha(expedienteId)).contexto;
}
