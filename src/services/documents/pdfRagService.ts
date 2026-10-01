import { apiFetch } from '../api/apiClient';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfChunk, ProcessedPdfDocument, RagQueryResult, RagRelevantChunk } from '../../types';

const RAG_STORAGE_KEY = 'legisai_processed_rag_pdfs';
const RAG_UPDATE_EVENT = 'legisai_rag_updated';

// Configurar worker de pdfjs en el navegador de forma segura
if (typeof window !== 'undefined') {
  try {
    // Usar worker CDN compatible con la versión instalada de pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Advertencia configurando worker de pdfjs:', e);
  }
}

/**
 * Servicio integral para extracción de texto de archivos PDF,
 * generación de embeddings y consultas RAG con la API de Gemini.
 */
class PdfRagService {
  // El SDK de Google ya NO se usa en el navegador: los embeddings y la
  // síntesis se piden al backend autenticado (/api/*), que es el único que
  // conoce la GEMINI_API_KEY.


  /**
   * Extrae el texto plano página por página de un archivo PDF
   */
  async extractTextFromPdf(
    file: File | ArrayBuffer, 
    fileName: string,
    onProgress?: (status: string, percent: number) => void
  ): Promise<{ fullText: string; pages: { pageNumber: number; text: string }[] }> {
    onProgress?.(`Cargando estructura binaria de ${fileName}...`, 10);
    
    let arrayBuffer: ArrayBuffer;
    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = file;
    }

    const pages: { pageNumber: number; text: string }[] = [];
    let fullText = '';

    try {
      // pdfjs-dist v6 ya no acepta isEvalSupported (solo se usa para
      // renderizado, no para extracción de texto), así que se omite.
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true
      });

      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      onProgress?.(`Extrayendo texto de ${totalPages} páginas del expediente...`, 25);

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText.length > 0) {
          pages.push({ pageNumber: pageNum, text: pageText });
          fullText += `\n[PÁGINA ${pageNum}]\n${pageText}\n`;
        }

        const pct = 25 + Math.round((pageNum / totalPages) * 35);
        onProgress?.(`Leyendo página ${pageNum} de ${totalPages}...`, pct);
      }
    } catch (pdfErr) {
      console.warn("Fallo en extracción estándar de PDF.js, ejecutando extractor binario de respaldo:", pdfErr);
      // Extractor de respaldo directo sobre los bytes del PDF
      const fallbackExtraction = this.extractTextFromPdfBytes(arrayBuffer);
      if (fallbackExtraction.fullText.trim().length > 0) {
        return fallbackExtraction;
      }
      throw new Error(`No fue posible extraer texto del PDF "${fileName}". Verifique que no esté protegido contra lectura o cifrado.`);
    }

    // Si el texto extraído es muy pobre o escaneado
    if (pages.length === 0 || fullText.trim().length < 20) {
      // Intentar método binario de rescate
      const fallbackExtraction = this.extractTextFromPdfBytes(arrayBuffer);
      if (fallbackExtraction.fullText.trim().length > 30) {
        return fallbackExtraction;
      }
      throw new Error(`El archivo "${fileName}" parece contener imágenes escaneadas sin capa de texto OCR o está vacío.`);
    }

    onProgress?.(`Texto extraído exitosamente (${pages.length} páginas con texto)`, 60);
    return { fullText, pages };
  }

  /**
   * Extractor binario de respaldo para secuencias de texto en PDFs sin depender de worker
   */
  private extractTextFromPdfBytes(arrayBuffer: ArrayBuffer): { fullText: string; pages: { pageNumber: number; text: string }[] } {
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const rawString = decoder.decode(bytes);

    const pages: { pageNumber: number; text: string }[] = [];
    let fullText = '';

    // Buscar streams de texto y bloques BT ... ET
    const textMatches: string[] = [];
    const btRegex = /BT[\s\S]*?ET/g;
    let match;

    while ((match = btRegex.exec(rawString)) !== null) {
      const block = match[0];
      // Extraer strings entre paréntesis: (Texto) Tj o [(T)(e)(x)(t)(o)] TJ
      const strRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
      let strMatch;
      let blockText = '';
      while ((strMatch = strRegex.exec(block)) !== null) {
        blockText += strMatch[1] + ' ';
      }

      // Probar también formato de array [(...) ...] TJ
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjMatch;
      while ((tjMatch = tjArrayRegex.exec(block)) !== null) {
        const innerRegex = /\(([^)]+)\)/g;
        let innerMatch;
        while ((innerMatch = innerRegex.exec(tjMatch[1])) !== null) {
          blockText += innerMatch[1];
        }
        blockText += ' ';
      }

      if (blockText.trim().length > 3) {
        textMatches.push(blockText.trim());
      }
    }

    if (textMatches.length > 0) {
      const joined = textMatches.join('\n').replace(/\\([()\\])/g, '$1');
      pages.push({ pageNumber: 1, text: joined });
      fullText = joined;
    }

    return { fullText, pages };
  }

  /**
   * Divide el texto extraído en fragmentos semánticos (chunks) con solapamiento
   */
  createChunks(
    pages: { pageNumber: number; text: string }[], 
    documentId: string, 
    documentName: string,
    expedienteId?: string,
    targetChunkSize: number = 750,
    chunkOverlap: number = 150
  ): PdfChunk[] {
    const chunks: PdfChunk[] = [];
    let chunkCounter = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Si la página es menor al tamaño objetivo, crear un solo chunk
      if (pageText.length <= targetChunkSize) {
        chunkCounter++;
        chunks.push({
          id: `${documentId}-chunk-${chunkCounter}`,
          documentId,
          documentName,
          expedienteId,
          pageNumber: page.pageNumber,
          chunkIndex: chunkCounter,
          text: pageText,
          tokenEstimate: Math.ceil(pageText.length / 4)
        });
        continue;
      }

      // Dividir por párrafos o frases
      let startIdx = 0;
      while (startIdx < pageText.length) {
        let endIdx = Math.min(startIdx + targetChunkSize, pageText.length);

        // Si no estamos al final, intentar cortar en punto o fin de línea
        if (endIdx < pageText.length) {
          const punctuationIdx = pageText.lastIndexOf('. ', endIdx);
          if (punctuationIdx > startIdx + (targetChunkSize * 0.5)) {
            endIdx = punctuationIdx + 1;
          } else {
            const spaceIdx = pageText.lastIndexOf(' ', endIdx);
            if (spaceIdx > startIdx + (targetChunkSize * 0.5)) {
              endIdx = spaceIdx;
            }
          }
        }

        const chunkSegment = pageText.slice(startIdx, endIdx).trim();
        if (chunkSegment.length > 25) {
          chunkCounter++;
          chunks.push({
            id: `${documentId}-chunk-${chunkCounter}`,
            documentId,
            documentName,
            expedienteId,
            pageNumber: page.pageNumber,
            chunkIndex: chunkCounter,
            text: chunkSegment,
            tokenEstimate: Math.ceil(chunkSegment.length / 4)
          });
        }

        if (endIdx >= pageText.length) break;
        // Avanzar con solapamiento
        startIdx = Math.max(endIdx - chunkOverlap, startIdx + 50);
      }
    }

    return chunks;
  }

  /**
   * Genera el vector de embedding de un texto llamando al backend.
   *
   * Antes se hacía desde el navegador con el SDK de Google, lo que obligaba a
   * incrustar la API key en el bundle. Si el servidor falla, el error se
   * propaga: ya no se sustituye en silencio por un vector de hash local, que
   * no era comparable con los embeddings reales.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const res = await apiFetch('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `No se pudo generar el embedding (HTTP ${res.status}).`);
    }
    if (!Array.isArray(json.values) || json.values.length === 0) {
      throw new Error('El servidor no devolvió un embedding válido.');
    }
    return json.values;
  }

  /**
   * Calcula la similitud de coseno entre dos vectores numéricos
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);

    for (let i = 0; i < len; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Busca directamente fragmentos relevantes en los documentos almacenados localmente
   */
  searchLocalChunks(
    queryEmbedding: number[], 
    expedienteId?: string, 
    limit: number = 5
  ): RagRelevantChunk[] {
    const allDocs = this.getProcessedDocuments();
    if (!allDocs || allDocs.length === 0) return [];

    let targetChunks: PdfChunk[] = [];
    if (expedienteId) {
      targetChunks = allDocs
        .filter(d => (d as any).expedienteId === expedienteId || (d.chunks && d.chunks.some(c => (c as any).expedienteId === expedienteId)))
        .flatMap(d => d.chunks);
    }
    
    // Si no hay chunks con ese expedienteId o no se especificó, considerar todos
    if (targetChunks.length === 0) {
      targetChunks = allDocs.flatMap(d => d.chunks);
    }

    if (targetChunks.length === 0) return [];

    const scored = targetChunks
      .map(chunk => {
        const similarity = chunk.embedding ? this.calculateCosineSimilarity(queryEmbedding, chunk.embedding) : 0;
        return {
          chunk,
          similarity,
          reRankedScore: similarity,
          pageNumber: chunk.pageNumber
        };
      })
      .filter(s => s.similarity > 0.02)
      .sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit);
  }

  /**
   * Extractor de texto simple para HTML
   */
  private extractTextFromHtml(htmlText: string): string {
    return htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Procesa un archivo PDF completo cargado localmente:
   * 1. Extrae texto página a página
   * 2. Divide en chunks semánticos
   * 3. Genera embeddings con Gemini
   * 4. Almacena en la base vectorial local
   */
  async processLocalPdf(
    file: File, 
    expedienteId?: string,
    onProgress?: (step: string, percent: number) => void
  ): Promise<ProcessedPdfDocument> {
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const documentName = file.name;
    const isHtml = file.name.toLowerCase().endsWith('.html');

    onProgress?.(`Iniciando procesamiento de "${documentName}" (${(file.size / 1024 / 1024).toFixed(2)} MB)...`, 5);

    let fullText = '';
    let pages: { pageNumber: number; text: string }[] = [];

    if (isHtml) {
      const text = await file.text();
      fullText = this.extractTextFromHtml(text);
      pages = [{ pageNumber: 1, text: fullText }];
      
      // Validación de umbral mínimo para HTML
      const MIN_CHAR_THRESHOLD = 300;
      if (fullText.length < MIN_CHAR_THRESHOLD) {
        throw new Error(`El archivo HTML "${documentName}" no contiene suficiente contenido legible (${fullText.length} caracteres). Se requiere un mínimo de ${MIN_CHAR_THRESHOLD} caracteres para procesar el contexto.`);
      }
      
      onProgress?.(`Texto extraído y validado de HTML.`, 60);
    } else {
      // 1. Extraer texto PDF
      const extraction = await this.extractTextFromPdf(file, documentName, onProgress);
      fullText = extraction.fullText;
      pages = extraction.pages;
    }

    // 2. Fragmentar en chunks
    onProgress?.(`Segmentando texto en fragmentos semánticos contextuales...`, 65);
    const rawChunks = this.createChunks(pages, documentId, documentName, expedienteId);

    // 3. Generar embeddings
    onProgress?.(`Generando embeddings con Gemini (gemini-embedding-2-preview)...`, 75);
    const chunksWithEmbeddings: PdfChunk[] = [];

    const totalChunks = rawChunks.length;
    for (let i = 0; i < totalChunks; i++) {
      const chunk = rawChunks[i];
      const embedding = await this.generateEmbedding(chunk.text);
      chunksWithEmbeddings.push({
        ...chunk,
        embedding
      });

      if (i % 3 === 0 || i === totalChunks - 1) {
        const pct = 75 + Math.round(((i + 1) / totalChunks) * 20);
        onProgress?.(`Indexando embeddings: fragmento ${i + 1} de ${totalChunks}...`, pct);
      }
    }

    // 4. Crear documento procesado
    const processedDoc: ProcessedPdfDocument = {
      id: documentId,
      name: documentName,
      size: file.size,
      totalPages: pages.length,
      totalChunks: chunksWithEmbeddings.length,
      extractedChars: fullText.length,
      processedAt: Date.now(),
      embeddingModel: 'gemini-embedding-2-preview',
      status: 'INDEXED',
      chunks: chunksWithEmbeddings,
      textPreview: fullText.slice(0, 600).trim() + (fullText.length > 600 ? '...' : '')
    };

    // 5. Guardar en almacenamiento vectorial local
    this.saveProcessedDocument(processedDoc);

    // 6. Enviar chunks a Neon DB para persistencia en servidor
    try {
      await apiFetch('/api/rag/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chunks: chunksWithEmbeddings.map(c => ({
            ...c,
            content: c.text,
            tokenCount: c.tokenEstimate || Math.ceil(c.text.length / 4),
            expedienteId: c.expedienteId || expedienteId
          }))
        })
      });
    } catch (err) {
      console.error('Error al persistir chunks en Neon DB:', err);
    }
    
    onProgress?.(`¡Expediente "${documentName}" indexado y listo para consultas RAG!`, 100);

    return processedDoc;
  }

  /**
   * Ejecuta una consulta RAG contra los fragmentos indexados utilizando Gemini
   */
  async queryRag(
    query: string,
    documentId?: string,
    topK: number = 4
  ): Promise<RagQueryResult> {
    const startTime = Date.now();
    const allDocs = this.getProcessedDocuments();

    if (allDocs.length === 0) {
      throw new Error('No hay documentos PDF indexados en la base de datos RAG. Por favor cargue un archivo PDF primero.');
    }

    // Filtrar chunks por documento o considerar todos
    let targetChunks: PdfChunk[] = [];
    let docNameFilter = '';

    if (documentId) {
      const targetDoc = allDocs.find(d => d.id === documentId);
      if (targetDoc) {
        targetChunks = targetDoc.chunks;
        docNameFilter = targetDoc.name;
      }
    } else {
      targetChunks = allDocs.flatMap(d => d.chunks);
      docNameFilter = allDocs.length === 1 ? allDocs[0].name : `${allDocs.length} expedientes indexados`;
    }

    if (targetChunks.length === 0) {
      throw new Error('No se encontraron fragmentos indexados para este documento.');
    }

    // 1. Generar embedding de la consulta
    const queryEmbedding = await this.generateEmbedding(query);

    // 2. Calcular similitud coseno y ranking jurídico
    const rankedChunks: RagRelevantChunk[] = targetChunks.map(chunk => {
      const similarity = chunk.embedding ? this.calculateCosineSimilarity(queryEmbedding, chunk.embedding) : 0;
      
      // Bonificación de autoridad jurídica (Re-ranking)
      let authorityMultiplier = 1.0;
      const lower = chunk.text.toLowerCase();
      if (lower.includes('resuelve') || lower.includes('decide') || lower.includes('fallo') || lower.includes('administrando justicia')) {
        authorityMultiplier += 0.25;
      }
      if (lower.includes('ratio decidendi') || lower.includes('consideraciones') || lower.includes('la corte considera')) {
        authorityMultiplier += 0.20;
      }
      if (lower.includes('artículo') || lower.includes('ley ') || lower.includes('constitución')) {
        authorityMultiplier += 0.15;
      }
      if (lower.includes('pretensión') || lower.includes('demanda') || lower.includes('problema jurídico')) {
        authorityMultiplier += 0.15;
      }

      return {
        chunk,
        similarity: Math.max(0, Math.min(1, similarity)),
        reRankedScore: similarity * authorityMultiplier,
        pageNumber: chunk.pageNumber
      };
    });

    // Ordenar de mayor a menor relevancia ponderada
    rankedChunks.sort((a, b) => b.reRankedScore - a.reRankedScore);
    const topRelevant = rankedChunks.slice(0, topK);

    // 3. Construir contexto enriquecido para Gemini
    const contextSegments = topRelevant.map((item, idx) => {
      return `[DOCUMENTO: ${item.chunk.documentName} | PÁGINA ${item.pageNumber} | RELEVANCIA: ${(item.similarity * 100).toFixed(1)}%]\n${item.chunk.text}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `Eres un Magistrado Auxiliar y experto en Derecho Procesal, Constitucional y Jurisprudencia de Colombia que asiste al abogado litigante en la plataforma LegisAI.
Tu tarea es responder con rigor jurídico técnico y fundamentación exacta a la consulta del usuario, basándote PRIMORDIALMENTE en los fragmentos del expediente PDF recuperados mediante búsqueda vectorial (RAG).

REGLAS DE RESPUESTA:
1. Precisión y Cita de Páginas: Cita expresamente la página (ej: "Conforme a la Página 3 del expediente...") y cita textualmente las partes relevantes.
2. Identifica si es Demanda, Contestación, Providencia Judicial, Auto o Dictamen.
3. Resalta la Ratio Decidendi o regla decisiva del fragmento si aplica.
4. Si la respuesta no surge con certeza de los fragmentos disponibles en el PDF, dilo abiertamente y sugiere qué pieza procesal complementaria se requiere.
5. Formato: Utiliza Markdown estructurado (negritas, listas, citas en bloque).`;

    const userPrompt = `CONTEXTO DEL EXPEDIENTE PDF INDEXADO:
${contextSegments}

CONSULTA DEL ABOGADO:
${query}`;

    const answerRes = await apiFetch('/api/rag/answer', {
      method: 'POST',
      body: JSON.stringify({ userPrompt, systemInstruction: systemPrompt }),
    });
    const answerJson = await answerRes.json().catch(() => null);

    if (!answerRes.ok || !answerJson?.success || !answerJson.text?.trim()) {
      throw new Error(
        answerJson?.error || `No se pudo sintetizar la respuesta del RAG (HTTP ${answerRes.status}).`,
      );
    }

    const answer: string = answerJson.text;
    const modelUsed: string = answerJson.model || 'gemini';

    const latencyMs = Date.now() - startTime;

    return {
      query,
      answer,
      relevantChunks: topRelevant,
      modelUsed,
      embeddingModel: 'gemini-embedding-2-preview',
      latencyMs,
      timestamp: Date.now(),
      documentName: docNameFilter
    };
  }

  /**
   * Almacena un documento procesado en localStorage
   */
  saveProcessedDocument(doc: ProcessedPdfDocument): void {
    try {
      const existing = this.getProcessedDocuments();
      const updated = [doc, ...existing.filter(d => d.id !== doc.id)];
      localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(RAG_UPDATE_EVENT, { detail: updated }));
    } catch (err) {
      console.error('Error al guardar documento RAG en localStorage:', err);
    }
  }

  /**
   * Obtiene todos los documentos PDF procesados con embeddings
   */
  getProcessedDocuments(): ProcessedPdfDocument[] {
    try {
      const raw = localStorage.getItem(RAG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error al leer documentos RAG de localStorage:', e);
    }
    return [];
  }

  /**
   * Elimina un documento procesado del índice RAG
   */
  deleteProcessedDocument(docId: string): void {
    const existing = this.getProcessedDocuments();
    const updated = existing.filter(d => d.id !== docId);
    try {
      localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(RAG_UPDATE_EVENT, { detail: updated }));
    } catch (e) {
      console.error('Error al eliminar documento RAG:', e);
    }
  }

  /**
   * Suscribe a cambios en el almacén de documentos RAG
   */
  subscribe(callback: (docs: ProcessedPdfDocument[]) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail || this.getProcessedDocuments());
    };
    window.addEventListener(RAG_UPDATE_EVENT, handler);
    return () => window.removeEventListener(RAG_UPDATE_EVENT, handler);
  }

  /**
   * Crea un PDF de ejemplo procesado listo para demostración si no hay archivos cargados aún
   */
  async seedSamplePdfIfEmpty(): Promise<ProcessedPdfDocument | null> {
    const existing = this.getProcessedDocuments();
    if (existing.length > 0) return existing[0];

    // Los embeddings del corpus de ejemplo se generan con el mismo modelo que
    // las consultas; de lo contrario serían incomparables entre sí.
    const seedEmb = await Promise.all(
      [
        'corte suprema de justicia sala casacion laboral sentencia sl2845 2024 radicado 98124 magistrado gerardo botero zuluaga recurso casacion carlos restrepo',
        'problema juridico terminacion contrato trabajo obra labor exonera empleador autorizacion ministerio trabajo articulo 26 ley 361 de 1997 salud rehabilitacion',
        'ratio decidendi criterio jurisprudencial estabilidad ocupacional reforzada salud inspector del trabajo despido ineficaz reintegro',
        'analisis probatorio dictamen junta regional calificacion perdida capacidad laboral 38.5 conocimiento patronal carta despido consorcio vial',
        'decision judicial casa parcialmente tribunal declara ineficacia despido condena consorcio 180 dias salario indemnizacion reintegro',
        'normas aplicadas constitucion politica articulo 13 25 53 ley 361 articulo 26 codigo sustantivo trabajo sentencia su-049 2017 sl711 2021',
      ].map((text) => this.generateEmbedding(text)),
    );

    const sampleDoc: ProcessedPdfDocument = {
      id: 'pdf-sample-sl2845',
      name: 'Sentencia_Casacion_SL2845_2024.pdf',
      size: 3145728,
      totalPages: 14,
      totalChunks: 6,
      extractedChars: 12450,
      processedAt: Date.now() - 3600000,
      embeddingModel: 'gemini-embedding-2-preview',
      status: 'INDEXED',
      textPreview: 'CORTE SUPREMA DE JUSTICIA - SALA DE CASACIÓN LABORAL. M.P. DR. GERARDO BOTERO ZULUAGA. Radicación No. 98124. Proceso Ordinario Laboral de CARLOS RESTREPO contra CONSORCIO VIAL ANDINO. Tema: Estabilidad Ocupacional Reforzada por Salud y Cierre de Obra.',
      chunks: [
        {
          id: 'pdf-sample-sl2845-chunk-1',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 1,
          chunkIndex: 1,
          text: 'CORTE SUPREMA DE JUSTICIA - SALA DE CASACIÓN LABORAL. Sentencia SL2845-2024, Radicación 98124. Magistrado Ponente: Gerardo Botero Zuluaga. Bogotá D.C., dieciocho (18) de agosto de dos mil veinticuatro (2024). Resuelve la Corte el recurso extraordinario de casación interpuesto por el demandante Carlos Restrepo contra la sentencia del Tribunal Superior.',
          embedding: seedEmb[0],
          tokenEstimate: 75
        },
        {
          id: 'pdf-sample-sl2845-chunk-2',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 4,
          chunkIndex: 2,
          text: 'PROBLEMA JURÍDICO: Determinar si la terminación del contrato de trabajo por culminación de la obra o labor contratada exonera al empleador de solicitar la previa autorización del Ministerio del Trabajo consagrada en el artículo 26 de la Ley 361 de 1997, cuando el trabajador presenta limitaciones de salud conocidas con concepto desfavorable de rehabilitación.',
          embedding: seedEmb[1],
          tokenEstimate: 85
        },
        {
          id: 'pdf-sample-sl2845-chunk-3',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 8,
          chunkIndex: 3,
          text: 'RATIO DECIDENDI: La Sala reitera su criterio jurisprudencial pacífico: la llegada del plazo extintivo o la finalización de la obra convenida no constituyen causa objetiva suficiente para eludir la salvaguarda de la estabilidad laboral reforzada. Siempre que subsista una limitación física o estado de salud disminuido, el empleador está obligado a elevar la solicitud ante el Inspector del Trabajo para verificar la incompatibilidad real.',
          embedding: seedEmb[2],
          tokenEstimate: 95
        },
        {
          id: 'pdf-sample-sl2845-chunk-4',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 11,
          chunkIndex: 4,
          text: 'ANÁLISIS PROBATORIO: Se encuentra acreditado a folios 45 a 52 el dictamen de la Junta Regional de Calificación que fijó una pérdida de capacidad laboral del 38.5% de origen común. Asimismo, obran comunicaciones dirigidas a la gerencia del Consorcio Vial con anterioridad a la carta de despido, de donde surge la certeza del conocimiento patronal sobre el estado médico del trabajador.',
          embedding: seedEmb[3],
          tokenEstimate: 90
        },
        {
          id: 'pdf-sample-sl2845-chunk-5',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 13,
          chunkIndex: 5,
          text: 'DECISIÓN JUDICIAL: CASA PARCIALMENTE la sentencia proferida por la Sala Laboral del Tribunal Superior. En sede de instancia, REVOCA la absolución de primera instancia y en su lugar DECLARA la ineficacia del despido del señor Carlos Restrepo, CONDENA al Consorcio al pago de la indemnización sancionatoria de 180 días de salario (Art. 26 Ley 361/1997) y ordena el reintegro.',
          embedding: seedEmb[4],
          tokenEstimate: 95
        },
        {
          id: 'pdf-sample-sl2845-chunk-6',
          documentId: 'pdf-sample-sl2845',
          documentName: 'Sentencia_Casacion_SL2845_2024.pdf',
          pageNumber: 14,
          chunkIndex: 6,
          text: 'NORMAS APLICADAS Y PRECEDENTES: Artículos 13, 25 y 53 de la Constitución Política de Colombia; Artículo 26 de la Ley 361 de 1997; Artículos 64 y 65 del Código Sustantivo del Trabajo; Convenio 159 de la OIT; Sentencia SU-049 de 2017 y CSJ SL711-2021.',
          embedding: seedEmb[5],
          tokenEstimate: 80
        }
      ]
    };

    this.saveProcessedDocument(sampleDoc);
    return sampleDoc;
  }
}

export const pdfRagService = new PdfRagService();
