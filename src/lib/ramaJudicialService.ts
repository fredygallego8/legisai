import { getDb } from './db';

/**
 * Consulta a la Rama Judicial (https://consultaprocesos.ramajudicial.gov.co).
 *
 * NOTA IMPORTANTE — comportamiento cambiado respecto al portal anterior:
 * la versión anterior, si la consulta al portal no devolvía datos (y nunca los
 * devuelve: es una SPA que no expone HTML con las actuaciones), devolvía SIETE
 * actuaciones procesales inventadas, con nombres de archivo, fechas y
 * descriptores fijos, junto a demandante y demandado ficticios, y las
 * presentaba como "consulta oficial" con success: true.
 *
 * Eso se ha eliminado. Ahora, si no se puede obtener información real del
 * portal, la operación FALLA de forma explícita. Un expediente judicial no
 * puede rellenarse con datos inventados.
 */
export class RamaJudicialCrawlerService {
  static extraerFechaDeNombre(nombre: string): string {
    const match8 = nombre.match(/(\d{2})(\d{2})(\d{4})/);
    if (match8) {
      const [, d, m, y] = match8;
      return `${y}-${m}-${d}`;
    }
    const match6 = nombre.match(/(\d{2})(\d{2})(\d{2})(?:\.pdf)?$/i);
    if (match6) {
      const [, d, m, y] = match6;
      const fullYear = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
      return `${fullYear}-${m}-${d}`;
    }
    return '';
  }

  /**
   * Consulta el portal. Lanza si no se obtiene información real.
   */
  static async consultarRadicado(radicado: string): Promise<any> {
    const cleanRadicado = radicado.trim();
    if (!cleanRadicado || cleanRadicado.length < 10) {
      throw new Error(
        'El número de radicado debe tener al menos 10 dígitos (Ej: 11001-31-05-015-2022-00342-01).',
      );
    }

    const portalUrl = 'https://consultaprocesos.ramajudicial.gov.co/Procesos/NumeroRadicacion';

    let reachable = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `${portalUrl}?numero=${encodeURIComponent(cleanRadicado)}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'LegisAI-Crawler/3.0',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      reachable = res.ok;
    } catch {
      reachable = false;
    }

    throw new Error(
      reachable
        ? 'El portal de la Rama Judicial respondió, pero es una aplicación de página única ' +
          'que no expone las actuaciones en el HTML. No se ha podido extraer información real ' +
          'del radicado. Configura una integración oficial (o un scraper de los endpoints ' +
          'internos del portal) antes de usar esta función. No se devuelven datos de ejemplo.'
        : 'No se pudo contactar con el portal de la Rama Judicial.',
    );
  }

  /**
   * Sincroniza y compara con el expediente almacenado.
   * Versión sin dependencias de framework: la capa HTTP vive en el route handler.
   */
  static async sincronizarYCompararConExpediente(input: {
    radicado?: string;
    expedienteId?: string;
  }) {
    const { radicado, expedienteId } = input;
    if (!radicado) {
      throw Object.assign(new Error('El número de radicado es obligatorio.'), { status: 400 });
    }

    // Lanza si no hay datos reales disponibles.
    const resultadoPortal = await RamaJudicialCrawlerService.consultarRadicado(radicado);

    const sql = getDb();

    let expedienteRow: any = null;
    if (expedienteId) {
      const rows = await sql`SELECT * FROM expedientes WHERE id = ${expedienteId};`;
      if (rows.length > 0) expedienteRow = rows[0];
    }
    if (!expedienteRow) {
      const rowsByRadicado = await sql`SELECT * FROM expedientes WHERE radicado = ${radicado};`;
      if (rowsByRadicado.length > 0) expedienteRow = rowsByRadicado[0];
    }

    let targetExpId = expedienteRow?.id;
    if (!targetExpId) {
      targetExpId = `exp-${Date.now()}`;
      const now = Date.now();
      // Columnas según el esquema real (server/db.ts): despacho, no juzgado.
      await sql`
        INSERT INTO expedientes (
          id, radicado, titulo, demandante, demandado, despacho, tipo_proceso,
          estado, is_archived, created_at, updated_at
        ) VALUES (
          ${targetExpId}, ${radicado}, ${resultadoPortal.despacho || 'Sin título'},
          'Por determinar', 'Por determinar', ${resultadoPortal.despacho || 'Sin despacho'},
          ${resultadoPortal.tipoProceso || 'Por determinar'}, 'En Trámite', false, ${now}, ${now}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    const documentosActuales = await sql`
      SELECT id, name, type, pages_count, created_at
      FROM documentos
      WHERE expediente_id = ${targetExpId};
    `;

    const nuevosDocumentosSincronizados: any[] = [];
    for (const act of resultadoPortal.actuacionesRecientes || []) {
      const docInfo = act.documentoGenerado;
      const docId = `doc-portal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const realTimestamp = new Date(act.fecha).getTime() || Date.now();

      await sql`
        INSERT INTO documentos (id, expediente_id, name, type, size, pages_count, extracted_content, created_at)
        VALUES (${docId}, ${targetExpId}, ${docInfo.nombre}, ${docInfo.tipo}, ${docInfo.size}, 3, ${docInfo.contenidoTextoExtracto}, ${realTimestamp})
        ON CONFLICT (id) DO NOTHING;
      `;

      nuevosDocumentosSincronizados.push({
        id: docId,
        nombre: docInfo.nombre,
        fecha: act.fecha,
        actuacion: act.actuacion,
        anotacion: act.anotacion,
      });
    }

    return {
      success: true,
      expedienteId: targetExpId,
      radicado,
      portalInfo: resultadoPortal,
      documentosActualesCount: documentosActuales.length,
      nuevosDocumentos: nuevosDocumentosSincronizados,
      comparacion: {
        totalDocumentosAnteriores: documentosActuales.length,
        totalDocumentosNuevosPortal: nuevosDocumentosSincronizados.length,
        cambiosDetectados: [],
        sugerenciaLegal:
          'Revise las nuevas actuaciones incorporadas y actualice la línea de tiempo procesal.',
      },
    };
  }
}
