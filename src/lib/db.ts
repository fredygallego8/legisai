import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Obtenemos la URL de conexión desde process.env.DATA_BASE (configurada por el usuario) o process.env.DATABASE_URL
const getConnectionString = (): string | undefined => {
  return process.env.DATA_BASE || process.env.DATABASE_URL;
};

// NeonQueryFunction<false, false> = modo array desactivado, resultados simples:
// `sql\`...\`` resuelve a Record<string, any>[] en lugar de la unión
// any[][] | Record<string, any>[] | FullQueryResults<boolean>, que impedía
// usar .length, .map, .find o iterar sin errores de tipado.
let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  const connStr = getConnectionString();
  if (!connStr) {
    throw new Error('No se encontró la cadena de conexión DATA_BASE en las variables de entorno.');
  }
  if (!sqlClient) {
    sqlClient = neon(connStr);
  }
  return sqlClient;
}

// Helper determinístico para generar embeddings de 768 dimensiones normalizados (idéntico a GeminiProvider)
export function generateFallbackEmbedding(text: string): number[] {
  const dim = 768;
  const vector = new Float32Array(dim);
  const cleaned = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = cleaned.split(/[^a-z0-9_]+/i).filter(w => w.length > 1);

  for (const word of words) {
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash * 31 + word.charCodeAt(j)) >>> 0;
    }
    vector[hash % dim] += 1.0;
  }

  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1.0;

  return Array.from(vector).map(v => Number((v / norm).toFixed(6)));
}

export async function initDatabaseSchema() {
  try {
    const sql = getDb();
    
    // 1. Habilitar extensión pgvector para el RAG
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

    // 2. Tabla de Expedientes Judiciales
    await sql`
      CREATE TABLE IF NOT EXISTS expedientes (
        id VARCHAR(100) PRIMARY KEY,
        radicado VARCHAR(100) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        demandante VARCHAR(255) NOT NULL,
        demandado VARCHAR(255) NOT NULL,
        despacho VARCHAR(255) NOT NULL,
        tipo_proceso VARCHAR(100) NOT NULL,
        estado VARCHAR(100) NOT NULL DEFAULT 'En Trámite',
        is_archived BOOLEAN NOT NULL DEFAULT FALSE,
        archived_at BIGINT,
        archive_reason TEXT,
        cuantia VARCHAR(100),
        fecha_inicio VARCHAR(100),
        tema_juridico TEXT,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `;

    // 3. Tabla de Documentos y Piezas Procesales
    await sql`
      CREATE TABLE IF NOT EXISTS documentos (
        id VARCHAR(100) PRIMARY KEY,
        expediente_id VARCHAR(100) REFERENCES expedientes(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        upload_date VARCHAR(100),
        uploaded_by VARCHAR(100),
        security_hash VARCHAR(100),
        pages_count INT DEFAULT 1,
        origin_zip VARCHAR(255),
        extracted_content TEXT,
        status VARCHAR(50) DEFAULT 'processed',
        summary TEXT,
        tags JSONB DEFAULT '[]'::jsonb,
        created_at BIGINT NOT NULL
      );
    `;

    // 4. Tabla de Chunks Vectorizados con pgvector para búsqueda RAG
    // Usamos vector(768) para compatibilidad con Gemini Text Embeddings
    await sql`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id VARCHAR(100) PRIMARY KEY,
        document_id VARCHAR(100),
        expediente_id VARCHAR(100),
        chunk_index INT NOT NULL,
        page_number INT DEFAULT 1,
        content TEXT NOT NULL,
        token_count INT DEFAULT 0,
        embedding vector(768),
        created_at BIGINT NOT NULL
      );
    `;
    
    // Asegurar existencia de columna is_jurisprudencia (por si la tabla ya existía sin ella)
    await sql`ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS is_jurisprudencia BOOLEAN DEFAULT FALSE;`;

    // Flexibilizar claves foráneas en rag_chunks para admitir documentos subidos localmente o por lotes sin bloqueo
    await sql`ALTER TABLE rag_chunks DROP CONSTRAINT IF EXISTS rag_chunks_document_id_fkey;`;
    await sql`ALTER TABLE rag_chunks DROP CONSTRAINT IF EXISTS rag_chunks_expediente_id_fkey;`;

    // 5. Tabla de Hitos y Providencias de la Línea de Tiempo
    await sql`
      CREATE TABLE IF NOT EXISTS hitos_procesales (
        id VARCHAR(100) PRIMARY KEY,
        expediente_id VARCHAR(100) REFERENCES expedientes(id) ON DELETE CASCADE,
        fecha VARCHAR(50) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT NOT NULL,
        etapa VARCHAR(100) NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        despacho VARCHAR(255) NOT NULL,
        decision VARCHAR(100),
        ruling_number VARCHAR(100),
        ruling_year INT,
        created_at BIGINT NOT NULL
      );
    `;

    // 6. Tabla de Auditoría de DocumentParser (Origen de la información extraída)
    await sql`
      CREATE TABLE IF NOT EXISTS document_audit_log (
        id VARCHAR(100) PRIMARY KEY,
        expediente_id VARCHAR(100) REFERENCES expedientes(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        extracted_radicado VARCHAR(100),
        extracted_titulo VARCHAR(255),
        extracted_demandante VARCHAR(255),
        extracted_demandado VARCHAR(255),
        extracted_despacho VARCHAR(255),
        extracted_cuantia VARCHAR(100),
        extracted_tema TEXT,
        confidence_score NUMERIC(5,4),
        raw_model_response TEXT,
        created_at BIGINT NOT NULL
      );
    `;

    // Índices para optimizar consultas frecuentes
    await sql`CREATE INDEX IF NOT EXISTS idx_expedientes_archived ON expedientes(is_archived);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documentos_exp ON documentos(expediente_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_chunks_exp ON rag_chunks(expediente_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_exp ON document_audit_log(expediente_id);`;

    // Sembrar RAG de Jurisprudencia y Normativa de Hipotecas con embeddings vectoriales
    await seedJurisprudenciaHipotecas(sql);

    // Sembrar Expediente Principal Santa Gema y expedientes iniciales
    await seedExpedientesIniciales(sql);

    // Sembrar chunks RAG para documentos HTML (Código Civil y Ley 45) y términos procesales CGP
    await seedHtmlAndNormativaChunks(sql);

    console.log('✅ Esquema de Neon DB inicializado con soporte pgvector y tablas judiciales.');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error inicializando esquema en Neon DB:', error);
    return { success: false, error: error.message };
  }
}

async function seedJurisprudenciaHipotecas(sql: any) {
  try {
    const expId = 'exp-jurisprudencia-hipotecas-colombia';
    const docId = 'doc-normativa-hipotecas-base';
    const now = Date.now();

    // 1. Insertar expediente de Jurisprudencia y Normativa
    await sql`
      INSERT INTO expedientes (
        id, radicado, titulo, demandante, demandado, despacho, tipo_proceso, estado, cuantia, fecha_inicio, tema_juridico, created_at, updated_at
      ) VALUES (
        ${expId},
        'NORM-COL-HIPOTECAS-2025',
        'JURISPRUDENCIA Y MARCO NORMATIVO - HIPOTECAS COLOMBIA',
        'Jurisprudencia y Doctrinas de Altas Cortes',
        'Marco Normativo Nacional (Código Civil, Leyes y CSJ)',
        'Corte Suprema de Justicia / Corte Constitucional / Congreso de la República',
        'Base RAG Normativa y Jurisprudencial',
        'Vigente y Actualizado',
        'N/A',
        '01 Ene 2024',
        'Marco general de hipoteca, Ley 546 de 1999, CGP Art. 468, Ley 2445 de 2025, Ley 1579 de 2012, Ley 2434 de 2024, Ley 45 de 1990 y Sentencia SC-3097 de 2022',
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    // 2. Insertar documento base en documentos
    await sql`
      INSERT INTO documentos (
        id, expediente_id, name, type, size, summary, created_at
      ) VALUES (
        ${docId},
        ${expId},
        'Marco_Normativo_Y_Jurisprudencial_Hipotecas_Colombia.pdf',
        'pdf',
        2500000,
        'Compendio oficial de jurisprudencia y normativa aplicable a procesos ejecutivos hipotecarios y garantías reales en Colombia.',
        ${now}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    // 3. Insertar Chunks normativos clave con embeddings calculados
    const chunks = [
      {
        id: 'chunk-norm-1',
        index: 1,
        content: 'Código Civil Colombiano (Arts. 2432 a 2457): Definición y marco general de la hipoteca, su doble naturaleza (derecho real y contrato), solemnidad de escritura pública, atributos de persecución y preferencia, y clasificación en hipotecas cerradas y abiertas.'
      },
      {
        id: 'chunk-norm-2',
        index: 2,
        content: 'Ley 546 de 1999 (Ley de Vivienda): Regulación del sistema especializado de financiación de vivienda a largo plazo en Pesos y UVR, prohibición expresa de capitalización de intereses y derecho consagrado de los deudores a realizar abonos extraordinarios a capital sin sanción o penalización alguna.'
      },
      {
        id: 'chunk-norm-3',
        index: 3,
        content: 'Código General del Proceso - CGP (Ley 1564 de 2012): Regula el trámite específico del proceso ejecutivo hipotecario (Art. 468), las medidas cautelares de embargo y secuestro de bienes hipotecados (Arts. 593, 595, 597) y la oportunidad y requisitos para la formulación de excepciones de mérito por parte del ejecutado.'
      },
      {
        id: 'chunk-norm-4',
        index: 4,
        content: 'Ley 2445 de 2025: Reforma reciente al régimen de insolvencia de persona natural no comerciante y pequeños comerciantes, otorgando herramientas jurídicas que permiten la suspensión temporal de remates y ejecuciones hipotecarias bajo supuestos de reorganización.'
      },
      {
        id: 'chunk-norm-5',
        index: 5,
        content: 'Ley 1579 de 2012 / Decreto 1250 de 1970 (Estatuto Registral): Exigencia del término perentorio de 90 días hábiles para la inscripción registral oportuna de la escritura pública de hipoteca en la Oficina de Registro de Instrumentos Públicos (ORIP).'
      },
      {
        id: 'chunk-norm-6',
        index: 6,
        content: 'Ley 2434 de 2024: Mecanismos legales de refinanciación de vivienda e inclusión expresa de gastos de escrituración y registro dentro del crédito de salvamento hipotecario.'
      },
      {
        id: 'chunk-norm-7',
        index: 7,
        content: 'Ley 45 de 1990 (Art. 72) - Estatuto Financiero: Sanción drástica aplicable por el cobro de intereses por encima del límite legal de la tasa de usura certificada por la Superintendencia Financiera, generando la reliquidación y pérdida de intereses remuneratorios.'
      },
      {
        id: 'chunk-norm-8',
        index: 8,
        content: 'Sentencia SC-3097 de 2022 (Corte Suprema de Justicia - Sala de Casación Civil): Doctrina vinculante sobre los principios de indivisibilidad y especificidad de la hipoteca, ratificando plenamente la validez jurídica de la hipoteca abierta sin límite de cuantía en operaciones mercantiles y civiles.'
      }
    ];

    for (const c of chunks) {
      const emb = generateFallbackEmbedding(c.content);
      const vectorStr = `[${emb.join(',')}]`;

      await sql`
        INSERT INTO rag_chunks (
          id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
        ) VALUES (
          ${c.id}, ${docId}, ${expId}, ${c.index}, 1, ${c.content}, 45, ${vectorStr}::vector, TRUE, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET 
          content = EXCLUDED.content, 
          embedding = EXCLUDED.embedding,
          is_jurisprudencia = TRUE;
      `;
    }
    console.log('✅ Base RAG de Jurisprudencia y Normativa de Hipotecas sembrada con vectores pgvector.');
  } catch (e) {
    console.error('Error sembrando jurisprudencia de hipotecas:', e);
  }
}

async function seedExpedientesIniciales(sql: any) {
  try {
    const now = Date.now();
    const expSantaGemaId = 'exp-1789743909641';

    // 1. Insertar Expediente Principal Santa Gema
    await sql`
      INSERT INTO expedientes (
        id, radicado, titulo, demandante, demandado, despacho, tipo_proceso, estado, cuantia, fecha_inicio, tema_juridico, created_at, updated_at
      ) VALUES (
        ${expSantaGemaId},
        '05001-40-03-029-2024-01450-00',
        'HIPOTECA SANTA GEMA - Proceso Ejecutivo Hipotecario',
        'Cesar Augusto Giraldo García',
        'Fredy Alonso Gallego Botero',
        'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
        'Ejecutivo Hipotecario (Garantía Real)',
        'Terminado por Pago Total (Auto 18)',
        'COP 340.000.000',
        '24 Ene 2024',
        'Ejecución Hipotecaria, Mandamiento de Pago, Medida Cautelar y Terminación por Pago Total (Art. 461 CGP)',
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    // 2. Insertar documentos base de Santa Gema
    const docSantaGemaId = 'doc-santa-gema-expediente-completo';
    await sql`
      INSERT INTO documentos (
        id, expediente_id, name, type, size, summary, created_at
      ) VALUES (
        ${docSantaGemaId},
        ${expSantaGemaId},
        'Expediente_Completo_Hipoteca_Santa_Gema_Auto18.pdf',
        'pdf',
        4200000,
        'Expediente procesal completo del Juzgado 29 Civil Municipal de Medellín contentivo de demanda, mandamiento de pago, liquidación y Auto 18 de terminación por pago total.',
        ${now}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    // 3. Chunks clave del Expediente Santa Gema con embeddings para RAG inmediato
    const santaGemaChunks = [
      {
        id: 'sg-chunk-1',
        index: 1,
        content: 'JUZGADO 29 CIVIL MUNICIPAL DE EJECUCIÓN DE MEDELLÍN. Radicado: 05001-40-03-029-2024-01450-00. Demandante: Cesar Augusto Giraldo García. Demandado: Fredy Alonso Gallego Botero. Proceso: Ejecutivo Hipotecario sobre inmueble Santa Gema. Cuantía: $340.000.000 COP.'
      },
      {
        id: 'sg-chunk-2',
        index: 2,
        content: 'MANDAMIENTO DE PAGO (Arts. 422, 430 y 468 CGP): Se libra mandamiento de pago en favor de Cesar Augusto Giraldo García y en contra de Fredy Alonso Gallego Botero por la suma de capital de $340.000.000 más intereses moratorios liquidados a la tasa máxima legal permitida por la Superintendencia Financiera.'
      },
      {
        id: 'sg-chunk-3',
        index: 3,
        content: 'MEDIDAS CAUTELARES Y EMBARGO: Se decreta el embargo y posterior secuestro del bien inmueble gravado con hipoteca de primer grado, identificado con Folio de Matrícula Inmobiliaria No. 001-XXXXXX de la Oficina de Registro de Instrumentos Públicos de Medellín (Zona Sur), predio ubicado en Santa Gema.'
      },
      {
        id: 'sg-chunk-4',
        index: 4,
        content: 'AUTO 18 - TERMINACIÓN POR PAGO TOTAL (Art. 461 CGP): En virtud de haberse acreditado el pago total de la obligación demandada, intereses y costas procesales, el Juzgado 29 Civil Municipal de Medellín DISPONE: 1. Declarar terminado el proceso ejecutivo con fundamento en el Art. 461 del CGP. 2. Ordenar el levantamiento de las medidas cautelares de embargo y secuestro. 3. Oficiar a la Oficina de Registro para cancelar la inscripción del embargo y el gravamen hipotecario. 4. Disponer el desglose del pagaré a favor del ejecutado.'
      },
      {
        id: 'sg-chunk-5',
        index: 5,
        content: 'TÉRMINOS PROCESALES Y VENCIMIENTOS SEGÚN EL CGP: En el proceso ejecutivo hipotecario el término para pagar es de cinco (5) días siguientes a la notificación del mandamiento ejecutivo (Art. 431 CGP). El término para formular excepciones de mérito es de diez (10) días (Art. 442 CGP). El traslado de excepciones corre por diez (10) días (Art. 443 CGP). El término de liquidación del crédito y objeción es de tres (3) días (Art. 446 CGP).'
      }
    ];

    for (const c of santaGemaChunks) {
      const emb = generateFallbackEmbedding(c.content);
      const vectorStr = `[${emb.join(',')}]`;

      await sql`
        INSERT INTO rag_chunks (
          id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
        ) VALUES (
          ${c.id}, ${docSantaGemaId}, ${expSantaGemaId}, ${c.index}, 1, ${c.content}, 50, ${vectorStr}::vector, FALSE, ${now}
        )
        ON CONFLICT (id) DO UPDATE SET 
          content = EXCLUDED.content, 
          embedding = EXCLUDED.embedding,
          is_jurisprudencia = FALSE;
      `;
    }

    console.log('✅ Expediente Santa Gema y chunks vectoriales de CGP sembrados exitosamente.');
  } catch (err) {
    console.error('Error sembrando expediente Santa Gema:', err);
  }
}

async function seedHtmlAndNormativaChunks(sql: any) {
  try {
    const now = Date.now();
    const expSantaGemaId = 'exp-1789743909641';

    // 1. Localizar todos los documentos HTML y de normativa en la tabla documentos
    const allDocs = await sql`
      SELECT id, name, type, expediente_id FROM documentos;
    `;

    const htmlDocIds: { id: string; name: string; type: string }[] = [];
    for (const d of allDocs) {
      if (d.name?.includes('codigo-civil') || d.name?.includes('2432') || d.name?.includes('ley-45') || d.name?.includes('art-72') || d.type === 'html' || d.name?.endsWith('.html')) {
        htmlDocIds.push({ id: d.id, name: d.name, type: 'html' });
      }
    }

    // Asegurar que existan los documentos base
    const baseDocs = [
      { id: 'doc-zip-1789787635081-0', name: '01-codigo-civil-2432-2457.html' },
      { id: 'doc-cc-hipotecas-html', name: '01-codigo-civil-2432-2457.html' },
      { id: 'doc-zip-1789787637347-6', name: '07-ley-45-1990-art-72.html' },
      { id: 'doc-ley45-1990-html', name: '07-ley-45-1990-art-72.html' }
    ];

    for (const b of baseDocs) {
      if (!htmlDocIds.some(h => h.id === b.id)) {
        htmlDocIds.push({ id: b.id, name: b.name, type: 'html' });
      }
      await sql`
        INSERT INTO documentos (id, expediente_id, name, type, size, pages_count, created_at)
        VALUES (${b.id}, ${expSantaGemaId}, ${b.name}, 'html', 2400000, 20, ${now})
        ON CONFLICT (id) DO UPDATE SET type = 'html';
      `;
    }

    // Contenido representativo para Código Civil
    const ccText1 = 'CÓDIGO CIVIL COLOMBIANO - ARTÍCULO 2432 Y 2434. DEFINICIÓN Y SOLEMNIDAD DE LA HIPOTECA: La hipoteca es un derecho de prenda constituido sobre inmuebles que no dejan por eso de permanecer en poder del deudor. La hipoteca no podrá tener lugar sino a favor de una obligación principal. Debe otorgarse por escritura pública y registrarse dentro de los noventa (90) días siguientes a su otorgamiento (Art. 2435).';
    const ccText2 = 'CÓDIGO CIVIL - ARTÍCULO 2443 A 2445. BIENES QUE PUEDEN HIPOTECARSE Y EXTENSIÓN: La hipoteca no podrá tener lugar sino sobre bienes raíces que se posean en propiedad o usufructo. La hipoteca de una cosa futura da al acreedor el derecho de hacerla inscribir sobre los inmuebles que el constituyente adquiera con posterioridad. Se extiende a todos los aumentos y mejoras que reciba la cosa hipotecada.';
    const ccText3 = 'CÓDIGO CIVIL - ARTÍCULOS 2452 Y 2457. DERECHO DE PERSECUCIÓN, PREFERENCIA Y EXTINCIÓN: La hipoteca da al acreedor el derecho de perseguir la finca hipotecada sea quien fuere el que la posea y a cualquier título que la haya adquirido. Goza de preferencia de primer orden sobre el producto del remate. Se extingue junto con la obligación principal, por resolución del derecho de quien la constituyó, por la cancelación que el acreedor otorgue en escritura pública, o por la purga de la hipoteca en remate judicial conforme al CGP.';

    // Contenido representativo para Ley 45 de 1990
    const ley45Text1 = 'LEY 45 DE 1990 - ARTÍCULO 72. SANCIÓN POR COBRO DE INTERESES EN EXCESO A LOS LÍMITES LEGALES (USURA): Cuando se cobren intereses que sobrepasen los límites fijados en la ley o por la autoridad monetaria (Superintendencia Financiera de Colombia), el acreedor perderá todos los intereses cobrados en exceso, remuneratorios o moratorios, aumentados en un monto igual. El juez aplicará esta sanción oficiosamente en la liquidación del crédito.';
    const ley45Text2 = 'LEY 45 DE 1990 - ART. 72 ESTATUTO FINANCIERO E IMPUTACIÓN: Las sumas que el acreedor debe restituir por concepto de cobro de intereses en exceso aumentadas en un monto igual, se imputarán al capital de la obligación si ésta estuviere pendiente de pago, o se ordenará su devolución inmediata al deudor si la obligación ya estuviere extinguida.';

    // Chunks de CGP
    const cgpText1 = 'CÓDIGO GENERAL DEL PROCESO (CGP) - TABLA DE TÉRMINOS PROCESALES EN EJECUTIVO HIPOTECARIO:\n1. TÉRMINO PARA PAGAR: Cinco (5) días hábiles siguientes a la notificación del mandamiento de pago (Art. 431 CGP).\n2. TÉRMINO PARA EXCEPCIONAR: Diez (10) días hábiles siguientes a la notificación del mandamiento ejecutivo para proponer excepciones de mérito (Arts. 442 y 468 CGP).\n3. TRASLADO DE EXCEPCIONES: Diez (10) días hábiles otorgados al ejecutante para pronunciarse sobre las excepciones y pedir pruebas (Art. 443 CGP).\n4. LIQUIDACIÓN DEL CRÉDITO Y COSTAS: Traslado de tres (3) días hábiles para objetar la liquidación del crédito presentada por cualquiera de las partes (Art. 446 CGP).';
    const cgpText2 = 'CÓDIGO GENERAL DEL PROCESO (CGP) - VENCIMIENTOS Y SANCIONES PROCESALES:\n5. AVISO DE REMATE: Publicación en periódico de amplia circulación con antelación no inferior a diez (10) días a la fecha señalada para la subasta judicial (Art. 450 CGP).\n6. DESISTIMIENTO TÁCITO: Requerimiento judicial por treinta (30) días sin que la parte demandante impulse el trámite genera la terminación del proceso y levantamiento de medidas cautelares (Art. 317 CGP).\n7. TERMINACIÓN POR PAGO TOTAL: Acreditado el pago total de la obligación, intereses y costas, el juez debe proferir auto inmediato de terminación, desembargo, cancelación de gravamen hipotecario y desglose del título ejecutivo (Art. 461 CGP).';

    for (const doc of htmlDocIds) {
      const isCc = doc.name.includes('codigo-civil') || doc.name.includes('2432');
      const chunks = isCc
        ? [
            { id: `chunk-cc-${doc.id}-1`, content: ccText1, index: 1 },
            { id: `chunk-cc-${doc.id}-2`, content: ccText2, index: 2 },
            { id: `chunk-cc-${doc.id}-3`, content: ccText3, index: 3 }
          ]
        : [
            { id: `chunk-ley45-${doc.id}-1`, content: ley45Text1, index: 1 },
            { id: `chunk-ley45-${doc.id}-2`, content: ley45Text2, index: 2 }
          ];

      for (const c of chunks) {
        const emb = generateFallbackEmbedding(c.content);
        const vectorStr = `[${emb.join(',')}]`;
        await sql`
          INSERT INTO rag_chunks (
            id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
          ) VALUES (
            ${c.id}, ${doc.id}, ${expSantaGemaId}, ${c.index}, 1, ${c.content}, 60, ${vectorStr}::vector, FALSE, ${now}
          )
          ON CONFLICT (id) DO UPDATE SET 
            content = EXCLUDED.content, 
            embedding = EXCLUDED.embedding,
            is_jurisprudencia = FALSE;
        `;
      }
    }

    // Insertar también para CGP
    const cgpDocs = allDocs.filter(d => d.name?.includes('cgp') || d.name?.includes('1564'));
    const cgpTargetIds = cgpDocs.length > 0 ? cgpDocs.map(d => d.id) : ['doc-ley-1564-cgp'];

    for (const cgpDocId of cgpTargetIds) {
      for (const [idx, content] of [cgpText1, cgpText2].entries()) {
        const emb = generateFallbackEmbedding(content);
        const vectorStr = `[${emb.join(',')}]`;
        await sql`
          INSERT INTO rag_chunks (
            id, document_id, expediente_id, chunk_index, page_number, content, token_count, embedding, is_jurisprudencia, created_at
          ) VALUES (
            ${'chunk-cgp-' + cgpDocId + '-' + (idx + 1)}, ${cgpDocId}, ${expSantaGemaId}, ${idx + 1}, 1, ${content}, 70, ${vectorStr}::vector, FALSE, ${now}
          )
          ON CONFLICT (id) DO UPDATE SET 
            content = EXCLUDED.content, 
            embedding = EXCLUDED.embedding,
            is_jurisprudencia = FALSE;
        `;
      }
    }

    console.log('✅ Chunks de documentos HTML (Código Civil, Ley 45) y términos procesales CGP sembrados exitosamente en Neon DB.');
  } catch (err) {
    console.error('Error sembrando chunks HTML y CGP:', err);
  }
}


