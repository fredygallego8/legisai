import { Expediente } from '../../types';
import { NeonSyncService } from '../neon/neonSyncService';

const EXPEDIENTES_STORAGE_KEY = 'legisai_expedientes_vault';
const ACTIVE_EXPEDIENTE_STORAGE_KEY = 'legisai_active_expediente_id';
const EXPEDIENTES_UPDATE_EVENT = 'legisai_expedientes_updated';
const ACTIVE_EXPEDIENTE_UPDATE_EVENT = 'legisai_active_expediente_updated';

let hasAttemptedNeonSync = false;

export const INITIAL_EXPEDIENTES: Expediente[] = [
  {
    id: 'exp-1',
    radicado: '11001-31-05-015-2022-00342-01',
    titulo: 'Proceso Ordinario Laboral - Fuero de Salud y Reintegro',
    demandante: 'Dr. Carlos Eduardo Restrepo M.',
    demandado: 'Consorcio Vial Andino S.A.S.',
    despacho: 'Corte Suprema de Justicia - Sala de Casación Laboral',
    tipoProceso: 'Ordinario Laboral',
    estado: 'Sentencia de Casación Notificada',
    cuantia: '$148.500.000 COP',
    fechaInicio: '15 Ene 2022',
    temaJuridico: 'Estabilidad Laboral Reforzada (Art. 26 Ley 361 de 1997)',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60
  },
  {
    id: 'exp-2',
    radicado: '11001-02-30-000-2023-00512-00',
    titulo: 'Casación Penal - Prescripción y Suspensión de Términos',
    demandante: 'Fiscalía General de la Nación - Delegada ante Tribunal',
    demandado: 'Exsecretario de Infraestructura Municipal',
    despacho: 'Corte Suprema de Justicia - Sala de Casación Penal',
    tipoProceso: 'Casación Penal',
    estado: 'Sentencia de Fondo Notificada',
    cuantia: 'N/A (Proceso Penal)',
    fechaInicio: '10 Mar 2021',
    temaJuridico: 'Prescripción de la Acción Penal en Servidores Públicos (Ley 906 de 2004)',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40
  },
  {
    id: 'exp-3',
    radicado: '11001-03-15-000-2024-00120-00',
    titulo: 'Acción de Tutela - Debido Proceso Administrativo y MinTrabajo',
    demandante: 'María Fernanda Gómez Parra',
    demandado: 'Ministerio del Trabajo - Dirección Territorial Bogotá',
    despacho: 'Consejo de Estado - Sección Segunda',
    tipoProceso: 'Acción de Tutela',
    estado: 'En Trámite de Fallo',
    cuantia: 'Sin cuantía (Derecho Fundamental)',
    fechaInicio: '04 Jun 2024',
    temaJuridico: 'Silencio Administrativo y Tutela contra Acto de Trámite',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20
  },
  {
    id: 'exp-4',
    radicado: '05001-31-03-004-2023-00890-00',
    titulo: 'Responsabilidad Civil Contractual - Consorcio Hidroeléctrico',
    demandante: 'Seguros del Estado S.A.',
    demandado: 'Constructora Los Andes S.A.S.',
    despacho: 'Tribunal Superior de Medellín - Sala Civil',
    tipoProceso: 'Verbal de Mayor Cuantía',
    estado: 'En Práctica de Pruebas',
    cuantia: '$820.000.000 COP',
    fechaInicio: '18 Oct 2023',
    temaJuridico: 'Fuerza Mayor y Exclusiones de Póliza Todo Riesgo',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10
  },
  {
    id: 'exp-1789743909641',
    radicado: '05001-40-03-029-2024-01450-00',
    titulo: 'HIPOTECA SANTA GEMA - Proceso Ejecutivo Hipotecario',
    demandante: 'Cesar Augusto Giraldo García',
    demandado: 'Fredy Alonso Gallego Botero',
    despacho: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
    tipoProceso: 'Ejecutivo Hipotecario (Garantía Real)',
    estado: 'Terminado por Pago Total (Auto 18)',
    cuantia: 'COP 340.000.000',
    fechaInicio: '24 Ene 2024',
    temaJuridico: 'Ejecución Hipotecaria, Mandamiento de Pago, Medida Cautelar y Terminación por Pago Total (Art. 461 CGP)',
    createdAt: 1789743909642
  }
];

export const ExpedienteStorageService = {
  getExpedientes(): Expediente[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [...INITIAL_EXPEDIENTES];
      }
      const raw = localStorage.getItem(EXPEDIENTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const santaGemaIndex = parsed.findIndex((e: any) => e.id === 'exp-1789743909641');
          if (santaGemaIndex !== -1) {
            parsed[santaGemaIndex] = {
              ...parsed[santaGemaIndex],
              demandante: parsed[santaGemaIndex].demandante === 'Entidad Financiera Acreedora / Ejecutante Hipotecario' || parsed[santaGemaIndex].demandante === 'Banco Davivienda S.A.' ? 'Cesar Augusto Giraldo García' : parsed[santaGemaIndex].demandante,
              demandado: parsed[santaGemaIndex].demandado === 'Deudor Hipotecario / Titular Predio Santa Gema' || parsed[santaGemaIndex].demandado === 'Inversiones Santa Gema S.A.S.' ? 'Fredy Alonso Gallego Botero' : parsed[santaGemaIndex].demandado,
              despacho: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
              temaJuridico: 'Ejecución Hipotecaria, Mandamiento de Pago, Medida Cautelar y Terminación por Pago Total (Art. 461 CGP)'
            };
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error al cargar expedientes:', e);
    }
    try {
      localStorage.setItem(EXPEDIENTES_STORAGE_KEY, JSON.stringify(INITIAL_EXPEDIENTES));
    } catch (e) {}
    return INITIAL_EXPEDIENTES;
  },

  saveExpedientes(expedientes: Expediente[]): void {
    try {
      localStorage.setItem(EXPEDIENTES_STORAGE_KEY, JSON.stringify(expedientes));
      window.dispatchEvent(new CustomEvent(EXPEDIENTES_UPDATE_EVENT, { detail: expedientes }));
    } catch (e) {
      console.error('Error al guardar expedientes:', e);
    }
  },

  addExpediente(expediente: Expediente): void {
    const current = this.getExpedientes();
    const updated = [expediente, ...current.filter(e => e.id !== expediente.id)];
    this.saveExpedientes(updated);
    this.setActiveExpedienteId(expediente.id);
    NeonSyncService.saveExpedienteToDb(expediente).catch(console.error);
  },

  updateExpediente(expediente: Expediente): void {
    const current = this.getExpedientes();
    const updated = current.map(e => e.id === expediente.id ? expediente : e);
    this.saveExpedientes(updated);
    NeonSyncService.saveExpedienteToDb(expediente).catch(console.error);
  },

  archiveExpediente(expedienteId: string, reason?: string): void {
    const current = this.getExpedientes();
    const updated = current.map(e => {
      if (e.id === expedienteId) {
        return {
          ...e,
          isArchived: true,
          estado: 'Archivado',
          archivedAt: Date.now(),
          archiveReason: reason || 'Archivado por el usuario'
        };
      }
      return e;
    });
    this.saveExpedientes(updated);

    // Si el expediente archivado era el activo, cambiar el activo al primer expediente vigente
    if (this.getActiveExpedienteId() === expedienteId) {
      const activeCandidate = updated.find(e => !e.isArchived);
      if (activeCandidate) {
        this.setActiveExpedienteId(activeCandidate.id);
      }
    }

    NeonSyncService.archiveExpedienteInDb(expedienteId, reason || 'Archivado por el usuario').catch(console.error);
  },

  unarchiveExpediente(expedienteId: string): void {
    const current = this.getExpedientes();
    const updated = current.map(e => {
      if (e.id === expedienteId) {
        return {
          ...e,
          isArchived: false,
          estado: 'En Trámite',
          archivedAt: undefined,
          archiveReason: undefined
        };
      }
      return e;
    });
    this.saveExpedientes(updated);
    this.setActiveExpedienteId(expedienteId);
    NeonSyncService.restoreExpedienteInDb(expedienteId).catch(console.error);
  },

  deleteExpediente(expedienteId: string): void {
    // Por defecto en la práctica jurídica se archiva el expediente
    this.archiveExpediente(expedienteId);
  },

  permanentDeleteExpediente(expedienteId: string): void {
    const current = this.getExpedientes();
    const updated = current.filter(e => e.id !== expedienteId);
    this.saveExpedientes(updated);

    if (this.getActiveExpedienteId() === expedienteId) {
      const candidate = updated.find(e => !e.isArchived) || updated[0];
      if (candidate) {
        this.setActiveExpedienteId(candidate.id);
      } else {
        localStorage.removeItem(ACTIVE_EXPEDIENTE_STORAGE_KEY);
      }
    }
    NeonSyncService.deleteExpedienteFromDb(expedienteId).catch(console.error);
  },

  async syncWithNeonDb(): Promise<void> {
    if (hasAttemptedNeonSync) return;
    hasAttemptedNeonSync = true;
    try {
      const cloudExpedientes = await NeonSyncService.loadExpedientesFromDb(true);
      if (cloudExpedientes && cloudExpedientes.length > 0) {
        // Neon DB tiene expedientes guardados: actualizar caché local
        localStorage.setItem(EXPEDIENTES_STORAGE_KEY, JSON.stringify(cloudExpedientes));
        window.dispatchEvent(new CustomEvent(EXPEDIENTES_UPDATE_EVENT, { detail: cloudExpedientes }));
      } else {
        // Neon DB está vacío: sembrar con los expedientes iniciales
        const local = this.getExpedientes();
        for (const exp of local) {
          await NeonSyncService.saveExpedienteToDb(exp);
        }
      }
    } catch (e) {
      console.warn('Sincronización inicial con Neon DB omitida (offline/fallback).');
    }
  },

  getActiveExpedienteId(): string {
    try {
      const activeId = localStorage.getItem(ACTIVE_EXPEDIENTE_STORAGE_KEY);
      const all = this.getExpedientes();
      const nonArchived = all.filter(e => !e.isArchived);

      if (activeId && all.some(e => e.id === activeId && !e.isArchived)) {
        return activeId;
      }
      if (nonArchived.length > 0) {
        this.setActiveExpedienteId(nonArchived[0].id);
        return nonArchived[0].id;
      }
      if (all.length > 0) {
        return all[0].id;
      }
    } catch (e) {}
    return 'exp-1';
  },

  setActiveExpedienteId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_EXPEDIENTE_STORAGE_KEY, id);
      window.dispatchEvent(new CustomEvent(ACTIVE_EXPEDIENTE_UPDATE_EVENT, { detail: id }));
    } catch (e) {
      console.error('Error al guardar expediente activo:', e);
    }
  },

  getExpedienteById(id: string): Expediente | undefined {
    const all = this.getExpedientes();
    return all.find(e => e.id === id);
  },

  subscribe(callback: (expedientes: Expediente[]) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<Expediente[]>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      } else {
        callback(this.getExpedientes());
      }
    };
    window.addEventListener(EXPEDIENTES_UPDATE_EVENT, handler);
    return () => window.removeEventListener(EXPEDIENTES_UPDATE_EVENT, handler);
  },

  subscribeActive(callback: (activeId: string) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      } else {
        callback(this.getActiveExpedienteId());
      }
    };
    window.addEventListener(ACTIVE_EXPEDIENTE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(ACTIVE_EXPEDIENTE_UPDATE_EVENT, handler);
  }
};
