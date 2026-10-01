import { apiFetch } from '../api/apiClient';
import { Expediente, LegalDocument } from '../../types';

export interface NeonDbHealth {
  connected: boolean;
  database?: string;
  expedientesCount?: number;
  documentosCount?: number;
  chunksCount?: number;
  pgvector?: boolean;
  error?: string;
}

export const NeonSyncService = {
  async checkHealth(): Promise<NeonDbHealth> {
    try {
      const response = await apiFetch('/api/health/db');
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      return {
        connected: false,
        error: err.message || 'No se pudo conectar al endpoint de Neon DB'
      };
    }
  },

  async loadExpedientesFromDb(includeArchived: boolean = true): Promise<Expediente[] | null> {
    try {
      const res = await apiFetch(`/api/expedientes?includeArchived=${includeArchived}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.expedientes)) {
        return data.expedientes;
      }
      return null;
    } catch (e) {
      console.warn('Neon DB no disponible para leer expedientes, usando caché local.');
      return null;
    }
  },

  async saveExpedienteToDb(exp: Expediente): Promise<boolean> {
    try {
      const res = await apiFetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exp)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async archiveExpedienteInDb(id: string, reason: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/expedientes/${id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async restoreExpedienteInDb(id: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/expedientes/${id}/restore`, {
        method: 'PUT'
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async deleteExpedienteFromDb(id: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/expedientes/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async saveDocumentsToDb(docs: LegalDocument[]): Promise<boolean> {
    try {
      const res = await apiFetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docs)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async deleteDocumentsByExpedienteInDb(expedienteId: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/documentos/${expedienteId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  async searchPgVector(queryEmbedding: number[], expedienteId?: string, limit: number = 5) {
    try {
      const res = await apiFetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryEmbedding, expedienteId, limit })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.results || null;
    } catch (e) {
      return null;
    }
  }
};
