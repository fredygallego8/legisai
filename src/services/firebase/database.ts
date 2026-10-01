import { apiFetch } from '../api/apiClient';

/**
 * Implementación de búsqueda vectorial con metadatos extendidos y re-ranking jurídico.
 */

import { LegalDocument } from "../../types";
import { pdfRagService } from "../documents/pdfRagService";

export interface SearchResult {
  chunk: string;
  score: number; // Raw vector score (similitud de coseno)
  reRankedScore?: number; // Score final tras aplicar jerarquía normativa
  metadata: {
    authority: 'HIGH' | 'MEDIUM' | 'LOW';
    sourceType: 'CONSTITUTION' | 'LAW' | 'DECREE' | 'SENTENCE';
    year: number;
  };
}

/**
 * Aplica pesos basados en la jerarquía del derecho colombiano.
 * En Colombia, la Constitución es "norma de normas", seguida por jurisprudencia y leyes.
 */
const reRankResults = (results: SearchResult[]): SearchResult[] => {
  const authorityWeights = {
    HIGH: 1.5,
    MEDIUM: 1.2,
    LOW: 1.0
  };

  const sourceTypeWeights = {
    CONSTITUTION: 2.0, // Máxima prioridad
    SENTENCE: 1.8,    // Precedente vinculante (SU/C)
    LAW: 1.5,         // Legislación ordinaria
    DECREE: 1.2       // Actos administrativos
  };

  return results
    .map(res => {
      const aWeight = authorityWeights[res.metadata.authority] || 1.0;
      const sWeight = sourceTypeWeights[res.metadata.sourceType] || 1.0;
      // Cálculo del score final ponderado
      const reRankedScore = res.score * aWeight * sWeight;
      
      return {
        ...res,
        reRankedScore
      };
    })
    // Re-ordenar por el nuevo score ponderado de autoridad
    .sort((a, b) => (b.reRankedScore || 0) - (a.reRankedScore || 0));
};

export interface RagEngineResponse {
  success: boolean;
  results: SearchResult[];
  totalResults: number;
  collectionId?: string;
  collectionName?: string;
  expedienteId?: string;
  isJurisprudencia?: boolean;
  isCollectionEmpty?: boolean;
  isRagEmpty?: boolean;
  isConnectionLost?: boolean;
  error?: {
    code: string;
    message: string;
    expedienteId?: string;
    collectionId?: string;
    targetCollection?: string;
  };
}

export const performVectorSearchWithMetadata = async (
  queryEmbedding: number[], 
  options: { expedienteId?: string, buscarJurisprudencia?: boolean, collectionName?: string, query?: string } = {}
): Promise<RagEngineResponse> => {
  const collectionId = options.expedienteId || (options.buscarJurisprudencia ? 'exp-jurisprudencia-hipotecas-colombia' : 'general_corpus');
  const collectionName = options.collectionName || (options.buscarJurisprudencia 
    ? 'Jurisprudencia y Marco Normativo de Altas Cortes' 
    : options.expedienteId 
      ? `Expediente [ID: ${options.expedienteId}]` 
      : 'Acervo General RAG');

  console.log(`[RAG Engine Query] Consultando base de conocimiento: "${collectionName}" (ID: ${collectionId})`);
  let connectionLost = false;

  // El servicio de IA en Python es la vía preferida: recupera en híbrido (vectorial + léxica con
  // fusión por rango recíproco) y rerankea con el cross-encoder, cosas que esta función no hace.
  // Necesita el texto de la consulta, no el embedding, así que solo se usa si viene `query`.
  //
  // Si no está habilitado, o falla, se cae a la búsqueda por coseno de siempre en lugar de dejar al
  // usuario sin respuesta: es una degradación visible en logs, no un error en la interfaz.
  const servicioActivo =
    String(process.env.AI_SERVICE_ENABLED ?? '').toLowerCase() === 'true';
  const puedeUsarServicio = servicioActivo && typeof options.query === 'string' && options.query.trim().length > 0;

  try {
    const response = await apiFetch(
      puedeUsarServicio ? '/api/rag/search-ia' : '/api/rag/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          puedeUsarServicio
            ? {
                query: options.query,
                top_k: 5,
                // `hibrida` y no `vector`: es la que fusiona las dos vías.
                modo: 'hibrida',
                rerank: true,
                ...(options.expedienteId ? { expediente_id: options.expedienteId } : {}),
                ...(options.buscarJurisprudencia === undefined
                  ? {}
                  : { jurisprudencia: options.buscarJurisprudencia }),
              }
            : {
                queryEmbedding,
                expedienteId: options.expedienteId,
                buscarJurisprudencia: options.buscarJurisprudencia,
                limit: 5
              }
        )
      }
    );

    if (response.ok && puedeUsarServicio) {
      const data = await response.json();
      const resultados = Array.isArray(data.results) ? data.results : [];
      const vacio = resultados.length === 0;

      const formateados: SearchResult[] = resultados.map((r: any) => ({
        chunk: r.content,
        score: typeof r.score === 'number' ? r.score : 0.8,
        metadata: {
          authority: options.buscarJurisprudencia ? 'HIGH' : 'MEDIUM',
          sourceType: options.buscarJurisprudencia ? 'LAW' : 'SENTENCE',
          year: 2024,
        },
      }));

      return {
        success: true,
        results: reRankResults(formateados),
        totalResults: formateados.length,
        collectionId,
        collectionName,
        expedienteId: options.expedienteId,
        isJurisprudencia: options.buscarJurisprudencia,
        isCollectionEmpty: vacio,
        isRagEmpty: vacio,
        isConnectionLost: false,
      };
    }

    // Si se pidió el servicio y respondió con error (503 por token o por base caída, 500 por un
    // fallo suyo), se reintenta por la vía antigua. La diferencia entre ambas rutas no es de
    // resultados sino de calidad: la de Python es híbrida y rerankea. Mejor eso cuando funciona,
    // pero no vale perder la respuesta del usuario porque el servicio esté caído.
    if (!response.ok && puedeUsarServicio) {
      console.warn(
        `[RAG Engine] El servicio de IA respondió ${response.status}; se reintenta con la búsqueda por coseno.`
      );
      return performVectorSearchWithMetadata(queryEmbedding, {
        ...options,
        query: undefined,
      });
    }

    if (response.ok) {
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const isCollectionEmpty = Boolean(data.isCollectionEmpty || results.length === 0);

      if (results.length > 0) {
        const formattedResults: SearchResult[] = results.map((r: any) => ({
          chunk: r.content,
          score: r.similarity || 0.8,
          metadata: { 
            authority: r.is_jurisprudencia ? 'HIGH' : 'MEDIUM', 
            sourceType: r.is_jurisprudencia ? 'LAW' : 'SENTENCE', 
            year: 2024 
          }
        }));

        return {
          success: true,
          results: formattedResults,
          totalResults: formattedResults.length,
          collectionId,
          collectionName,
          expedienteId: options.expedienteId,
          isJurisprudencia: options.buscarJurisprudencia,
          isCollectionEmpty: false,
          isRagEmpty: false,
          isConnectionLost: false
        };
      }

      // Si no arrojó resultados en Neon DB, consultar vector store local como salvaguarda
      try {
        const localMatches = pdfRagService.searchLocalChunks(queryEmbedding, options.expedienteId, 5);
        if (localMatches && localMatches.length > 0) {
          const formattedLocal: SearchResult[] = localMatches.map(m => ({
            chunk: `[DOCUMENTO: ${m.chunk.documentName} | PÁGINA ${m.pageNumber}]:\n${m.chunk.text}`,
            score: m.similarity,
            metadata: { authority: 'MEDIUM', sourceType: 'LAW', year: 2024 }
          }));

          return {
            success: true,
            results: formattedLocal,
            totalResults: formattedLocal.length,
            collectionId,
            collectionName,
            expedienteId: options.expedienteId,
            isJurisprudencia: options.buscarJurisprudencia,
            isCollectionEmpty: false,
            isRagEmpty: false,
            isConnectionLost: false
          };
        }
      } catch (localErr) {
        console.warn("Fallo en vector store local:", localErr);
      }

      // Si la colección no contiene ningún fragmento indexado, emitir estado RAG_EMPTY estructurado
      return {
        success: false,
        results: [],
        totalResults: 0,
        collectionId,
        collectionName,
        expedienteId: options.expedienteId,
        isJurisprudencia: options.buscarJurisprudencia,
        isCollectionEmpty: true,
        isRagEmpty: true,
        isConnectionLost: false,
        error: {
          code: 'RAG_EMPTY',
          message: `La base de conocimiento "${collectionName}" no arrojó fragmentos vectoriales para el expediente relacionado [ID: ${options.expedienteId || collectionId}].`,
          expedienteId: options.expedienteId,
          collectionId,
          targetCollection: collectionName
        }
      };
    } else {
      connectionLost = true;
      console.warn(`[RAG Connection Error] El servidor respondió con estado ${response.status}`);
    }
  } catch (err: any) {
    connectionLost = true;
    console.warn("Error de conexión con el motor RAG Neon DB:", err);
  }

  // Fallback final local con pdfRagService
  try {
    const localMatches = pdfRagService.searchLocalChunks(queryEmbedding, options.expedienteId, 5);
    if (localMatches && localMatches.length > 0) {
      return {
        success: true,
        results: localMatches.map(m => ({
          chunk: `[DOCUMENTO: ${m.chunk.documentName} | PÁGINA ${m.pageNumber}]:\n${m.chunk.text}`,
          score: m.similarity,
          metadata: { authority: 'MEDIUM', sourceType: 'LAW', year: 2024 }
        })),
        totalResults: localMatches.length,
        collectionId,
        collectionName,
        expedienteId: options.expedienteId,
        isJurisprudencia: options.buscarJurisprudencia,
        isCollectionEmpty: false,
        isRagEmpty: false,
        isConnectionLost: connectionLost
      };
    }
  } catch (localErr) {
    console.warn("Aviso en búsqueda vectorial local:", localErr);
  }

  return {
    success: false,
    results: [],
    totalResults: 0,
    collectionId,
    collectionName,
    expedienteId: options.expedienteId,
    isJurisprudencia: options.buscarJurisprudencia,
    isCollectionEmpty: !connectionLost,
    isRagEmpty: !connectionLost,
    isConnectionLost: connectionLost,
    error: {
      code: connectionLost ? 'RAG_CONNECTION_LOST' : 'RAG_EMPTY',
      message: connectionLost
        ? `Se ha perdido la conexión con la base de conocimientos asociada al expediente activo [ID: ${options.expedienteId || collectionId}].`
        : `No fue posible consultar la base de conocimiento "${collectionName}". Cero fragmentos para el expediente relacionado [ID: ${options.expedienteId || collectionId}].`,
      expedienteId: options.expedienteId,
      collectionId,
      targetCollection: collectionName
    }
  };
};

export const performVectorSearch = async (
  queryEmbedding: number[], 
  options: { expedienteId?: string, buscarJurisprudencia?: boolean } = {}
): Promise<SearchResult[]> => {
  const resp = await performVectorSearchWithMetadata(queryEmbedding, options);
  return resp.results;
};

export const saveDocumentMetadata = async (doc: Partial<LegalDocument>) => {
  console.log("Indexando documento con metadatos de autoridad:", doc.name);
};
