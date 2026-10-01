
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  subscription: {
    plan: SubscriptionPlan;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
    validUntil: string;
  };
}

export interface AppError {
  code: string;
  message: string;
  suggestion: string;
  component: 'RAG' | 'GEMINI' | 'NETWORK' | 'FILES' | 'AUTH' | 'DATABASE';
  timestamp: string;
  technicalInfo?: string;
  targetCollection?: string;
  collectionId?: string;
  activeExpedienteId?: string;
}

export interface RagErrorLog {
  id: string;
  timestamp: string;
  errorCode: 'RAG_EMPTY' | string;
  activeExpedienteId: string;
  activeExpedienteRadicado?: string;
  failedIndexOrCollection: string;
  collectionId: string;
  vectorStoreEngine: string;
  querySnippet?: string;
  conversationId?: string;
}

export type RagHealthStatus = 'OPTIMAL' | 'WARNING' | 'ERROR';

export interface NeonDbDiagnostic {
  connected: boolean;
  latencyMs: number;
  database: string;
  engine: string;
  pgvector: boolean;
  pgvectorVersion?: string;
  databaseName?: string;
  dimensions?: number;
  chunksCount?: number;
  totalChunks: number;
  expedienteChunks: number;
  documentosCount?: number;
  expedientesCount?: number;
  status: RagHealthStatus;
  diagnosticMessage: string;
  timestamp: string;
  error?: string;
}

export interface RagHealthState {
  status: RagHealthStatus;
  latencyMs?: number;
  chunksCount?: number;
  message: string;
  details: string;
  lastChecked: string;
  collectionId: string;
  activeExpedienteId: string;
  matchesCount: number;
  neonDiagnostic?: NeonDbDiagnostic;
}

export interface ExecutiveSummaryData {
  radicado: string;
  corporacion: string;
  magistradoPonente: string;
  fecha: string;
  temaPrincipal: string;
  problemaJuridico: string;
  ratioDecidendi: string;
  puntosClave: string[];
  decision: string;
  normasAplicadas?: string[];
  obiterDicta?: string;
  precedentesCitados?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  sources?: string[];
  error?: AppError;
  executiveSummary?: ExecutiveSummaryData;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
}

export interface Expediente {
  id: string;
  radicado: string;
  titulo: string;
  demandante: string;
  demandado: string;
  despacho: string;
  tipoProceso: string;
  estado: string;
  isArchived?: boolean;
  archivedAt?: number;
  archiveReason?: string;
  cuantia?: string;
  fechaInicio: string;
  temaJuridico?: string;
  createdAt: number;
}

export interface LegalDocument {
  extractedContent?: string;
  id: string;
  userId: string;
  expedienteId?: string;
  name: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  type: string;
  size: number;
  createdAt: number;
  errorDetail?: AppError;
  originZip?: string;
  ragIndexed?: boolean;
  ragChunkCount?: number;
  extractedTextPreview?: string;
  cuaderno?: string;
}

export interface PdfChunk {
  id: string;
  documentId: string;
  documentName: string;
  expedienteId?: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  content?: string;
  embedding?: number[];
  tokenEstimate?: number;
}

export interface ProcessedPdfDocument {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  totalChunks: number;
  extractedChars: number;
  processedAt: number;
  embeddingModel: string;
  status: 'INDEXED' | 'PROCESSING' | 'ERROR';
  chunks: PdfChunk[];
  textPreview: string;
  summary?: string;
}

export interface RagRelevantChunk {
  chunk: PdfChunk;
  similarity: number;
  reRankedScore: number;
  pageNumber: number;
}

export interface RagQueryResult {
  query: string;
  answer: string;
  relevantChunks: RagRelevantChunk[];
  modelUsed: string;
  embeddingModel: string;
  latencyMs: number;
  timestamp: number;
  documentName?: string;
}

export enum AIProviderId {
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek'
}

export type SupremeCourtChamber = 'SALA_LABORAL' | 'SALA_PENAL' | 'SALA_CIVIL' | 'SALA_PLENA';

export interface ResearchTopic {
  id: string;
  name: string;
  chamber: SupremeCourtChamber;
  chamberLabel: string;
  keywords: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface SupremeCourtAlert {
  id: string;
  topicId: string;
  topicName: string;
  providencia: string; // ej: SL2845-2024
  radicado: string;    // ej: 98124
  chamber: SupremeCourtChamber;
  chamberLabel: string;
  magistradoPonente: string;
  fecha: string;
  urgency: 'HIGH' | 'MEDIUM' | 'INFO';
  relevanceScore: number;
  temaPrincipal: string;
  sintesis: string;
  problemaJuridico: string;
  ratioDecidendi: string;
  decision: string;
  normasAplicadas: string[];
  puntosClave: string[];
  isRead: boolean;
  isBookmarked: boolean;
  impactOnPrecedent: 'CAMBIO_JURISPRUDENCIAL' | 'REITERACION' | 'PRECISION_DOCTRINAL';
}

export type MilestoneType = 
  | 'DEMANDA' 
  | 'AUTO_ADMISION' 
  | 'AUDIENCIA' 
  | 'DICTAMEN_PERICIAL' 
  | 'FALLO_PRIMERA_INSTANCIA' 
  | 'APELACION' 
  | 'FALLO_SEGUNDA_INSTANCIA' 
  | 'RECURSO_CASACION' 
  | 'SENTENCIA_CASACION' 
  | 'NOTIFICACION';

export interface CaseMilestone {
  id: string;
  date: string; // ISO format or display string: 'YYYY-MM-DD'
  displayDate: string; // '12 Mar 2023'
  title: string;
  type: MilestoneType;
  instance: 'Primera Instancia' | 'Segunda Instancia' | 'Corte Suprema' | 'Trámite Previo';
  authority: string; // ej: Juzgado 15 Laboral del Circuito de Bogotá
  description: string;
  rulingExcerpt?: string; // Criterio o fragmento relevante
  outcome?: 'FAVORABLE' | 'DESFAVORABLE' | 'EN_TRAMITE' | 'PARCIAL';
  linkedSentencia?: {
    providencia: string; // ej: Sentencia SL2845-2024
    radicado?: string;
    magistradoPonente?: string;
    chamber?: string;
    impactLabel?: string;
  };
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];
  isCritical?: boolean;
}

export interface LegalCaseDetails {
  documentId: string;
  radicado: string;
  expedienteTitulo: string;
  demandante: string;
  demandado: string;
  cuantia?: string;
  despachoActual: string;
  estadoProcesal: string;
  fechaInicio: string;
  temaJuridico: string;
  milestones: CaseMilestone[];
}

export type TermStatus = 'VENCIDO' | 'PROXIMO_A_VENCER' | 'CUMPLIDO' | 'PENDIENTE';

export interface ProceduralTerm {
  id: string;
  actName: string;
  documentOriginName?: string;
  documentOriginId?: string;
  legalBasisCgp: string;
  legalTermDays: number;
  termType: 'HABILES' | 'CALENDARIO';
  startDate: string;
  startDisplayDate: string;
  startEventDescription: string;
  dueDate: string;
  dueDisplayDate: string;
  status: TermStatus;
  daysRemainingOrOverdue: number; // Negativo si venció, positivo si faltan días
  consequence: string;
  completedDate?: string;
  completedDisplayDate?: string;
  actionTaken?: string;
  urgencyLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'SUCCESS';
  relevantParty: 'EJECUTADO' | 'EJECUTANTE' | 'DESPACHO' | 'PERITO' | 'TERCERO';
  cgpAnalysisNote?: string;
}

export interface ProceduralTermsComparativeSummary {
  expedienteId: string;
  expedienteTitulo: string;
  radicado: string;
  totalTerms: number;
  expiredCount: number;
  upcomingCount: number;
  completedCount: number;
  pendingCount: number;
  terms: ProceduralTerm[];
  generatedAt: string;
}

export interface ExpedienteRagMetric {
  expedienteId: string;
  radicado: string;
  titulo: string;
  tipoProceso: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  emptyQueries: number;
  successRate: number; // e.g. 98.4
  avgLatencyMs: number; // e.g. 38
  p95LatencyMs: number;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface LatencyDataPoint {
  timestamp: string;
  timeLabel: string;
  expedienteTitulo: string;
  expedienteId: string;
  neonLatencyMs: number;      // Búsqueda vectorial Neon DB pgvector (15-50ms)
  embeddingLatencyMs: number; // Generación de vector (80-160ms)
  generationLatencyMs: number; // Inferencia LLM (300-800ms)
  totalLatencyMs: number;     // Tiempo total
}

export interface QuerySuccessDataPoint {
  date: string;
  exitosas: number;
  vacias: number;
  errores: number;
  tasaExito: number; // Porcentaje 0-100
}

export interface RagAnalyticsSummary {
  period: string;
  totalQueries: number;
  globalSuccessRate: number;
  avgResponseTimeMs: number;
  avgNeonLatencyMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  expedientesMetrics: ExpedienteRagMetric[];
  latencyTimeSeries: LatencyDataPoint[];
  successRateTimeSeries: QuerySuccessDataPoint[];
}

export interface LegalBookmark {
  id: string;
  title: string;
  content: string;
  source: string;
  expedienteId?: string;
  expedienteRadicado?: string;
  createdAt: number;
  tags?: string[];
}

