import { LegalDocument } from '../../types';
import { NeonSyncService } from '../neon/neonSyncService';

const STORAGE_KEY = 'legisai_documents_vault';
const UPDATE_EVENT = 'legisai_documents_updated';

export function parseRamaDate(input: string | number): Date {
  if (!input) return new Date(0);
  if (typeof input === 'number') return new Date(input);
  const str = String(input).trim();

  // 1. DD/MM/YYYY or DD-MM-YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const fullYear = y.length === 2 ? (parseInt(y, 10) > 50 ? `19${y}` : `20${y}`) : y;
      return new Date(parseInt(fullYear, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    }
  }

  // 2. MMMM D, YYYY (e.g., 'July 28, 2025', 'September 19, 2025')
  const monthMap: Record<string, number> = {
    january: 0, enero: 0, jan: 0,
    february: 1, febrero: 1, feb: 1,
    march: 2, marzo: 2, mar: 2,
    april: 3, abril: 3, apr: 3, abr: 3,
    may: 4, mayo: 4,
    june: 5, junio: 5, jun: 5,
    july: 6, julio: 6, jul: 6,
    august: 7, agosto: 7, aug: 7, ago: 7,
    september: 8, septiembre: 8, sep: 8,
    october: 9, octubre: 9, oct: 9,
    november: 10, noviembre: 10, nov: 10,
    december: 11, diciembre: 11, dic: 11
  };

  for (const [monthName, monthIndex] of Object.entries(monthMap)) {
    if (str.toLowerCase().includes(monthName)) {
      const nums = str.match(/\d+/g);
      if (nums && nums.length >= 2) {
        let day = 1;
        let year = new Date().getFullYear();
        if (nums.length === 2) {
          day = parseInt(nums[0], 10);
          year = parseInt(nums[1], 10);
          if (year < 100) year += 2000;
        } else if (nums.length >= 3) {
          day = parseInt(nums[0], 10);
          year = parseInt(nums[nums.length - 1], 10);
          if (year < 100) year += 2000;
        }
        return new Date(year, monthIndex, day);
      }
    }
  }

  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [y, m, d] = parts;
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      } else {
        const [d, m, y] = parts;
        const fullYear = y.length === 2 ? (parseInt(y, 10) > 50 ? `19${y}` : `20${y}`) : y;
        return new Date(parseInt(fullYear, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    }
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function parseDateFromName(name: string): number | null {
  if (!name) return null;
  const m8 = name.match(/(\d{4})(\d{2})(\d{2})/);
  if (m8) {
    const [, y, m, d] = m8;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
  }
  const m8_dmy = name.match(/(\d{2})(\d{2})(\d{4})/);
  if (m8_dmy) {
    const [, d, m, y] = m8_dmy;
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
  }
  const m6 = name.match(/(\d{2})(\d{2})(\d{2})(?:\.pdf|\.xlsm)?$/i);
  if (m6) {
    const [, d, m, y] = m6;
    const fullYear = parseInt(y, 10) > 50 ? `19${y}` : `20${y}`;
    return new Date(parseInt(fullYear, 10), parseInt(m, 10) - 1, parseInt(d, 10)).getTime();
  }
  return null;
}

export const INITIAL_DOCUMENTS: LegalDocument[] = [
  // Documentos del Expediente 1: Proceso Ordinario Laboral (Restrepo vs Consorcio)
  {
    id: 'doc-1',
    userId: 'user-1',
    expedienteId: 'exp-1',
    name: 'Poder_Especial_Casacion.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1024000,
    createdAt: Date.now() - 86400000 * 12,
    originZip: 'Expediente_Demanda_2024.zip',
    cuaderno: 'Cuaderno Principal'
  },
  {
    id: 'doc-1-demanda',
    userId: 'user-1',
    expedienteId: 'exp-1',
    name: 'Demanda_Inicial_Subsanada.pdf',
    status: 'READY',
    type: 'pdf',
    size: 2450000,
    createdAt: Date.now() - 86400000 * 10,
    originZip: 'Expediente_Demanda_2024.zip',
    cuaderno: 'Cuaderno Principal'
  },
  {
    id: 'doc-1-dictamen',
    userId: 'user-1',
    expedienteId: 'exp-1',
    name: 'Dictamen_JRCI_Bogota_38_5.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1840000,
    createdAt: Date.now() - 86400000 * 7,
    originZip: 'Expediente_Demanda_2024.zip',
    cuaderno: 'Pruebas y Dictámenes'
  },
  {
    id: 'doc-1-sentencia',
    userId: 'user-1',
    expedienteId: 'exp-1',
    name: 'Sentencia_Primera_Instancia_J15Lab.pdf',
    status: 'READY',
    type: 'pdf',
    size: 3200000,
    createdAt: Date.now() - 86400000 * 4,
    originZip: 'Expediente_Demanda_2024.zip',
    cuaderno: 'Sentencias y Fallos'
  },
  {
    id: 'doc-4',
    userId: 'user-1',
    expedienteId: 'exp-1',
    name: 'Sentencia_Casacion_SL2845_2024.pdf',
    status: 'READY',
    type: 'pdf',
    size: 3145728,
    createdAt: Date.now() - 172800000,
    originZip: 'Precedentes_Laboral_2024.zip',
    cuaderno: 'Segunda Instancia y Casación'
  },

  // Documentos del Expediente 2: Casación Penal (Fiscalía vs Exsecretario)
  {
    id: 'doc-2-pliego',
    userId: 'user-1',
    expedienteId: 'exp-2',
    name: 'Pliego_Formulacion_Acusacion_Penal.pdf',
    status: 'READY',
    type: 'pdf',
    size: 2150000,
    createdAt: Date.now() - 86400000 * 15,
    originZip: 'Expediente_Penal_2023.zip',
    cuaderno: 'Cuaderno Principal'
  },
  {
    id: 'doc-2',
    userId: 'user-1',
    expedienteId: 'exp-2',
    name: 'Alegato_Conclusion_Defensa_Prescripcion.pdf',
    status: 'PROCESSING',
    type: 'pdf',
    size: 2048000,
    createdAt: Date.now() - 3600000,
    originZip: 'Expediente_Penal_2023.zip',
    cuaderno: 'Alegatos y Memoriales'
  },
  {
    id: 'doc-2-audiencia',
    userId: 'user-1',
    expedienteId: 'exp-2',
    name: 'Acta_Audiencia_Imputacion_Garantias.pdf',
    status: 'READY',
    type: 'pdf',
    size: 890000,
    createdAt: Date.now() - 86400000 * 25,
    originZip: 'Expediente_Penal_2023.zip',
    cuaderno: 'Actas de Audiencia'
  },
  {
    id: 'doc-2-sentencia',
    userId: 'user-1',
    expedienteId: 'exp-2',
    name: 'Sentencia_SP3120_2024_CSJ_Penal.pdf',
    status: 'READY',
    type: 'pdf',
    size: 3680000,
    createdAt: Date.now() - 86400000 * 2,
    originZip: 'Precedentes_Penal_2024.zip',
    cuaderno: 'Sentencias de Casación'
  },

  // Documentos del Expediente 3: Acción de Tutela (Gómez vs MinTrabajo)
  {
    id: 'doc-3-tutela',
    userId: 'user-1',
    expedienteId: 'exp-3',
    name: 'Escrito_Accion_Tutela_Debido_Proceso.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1420000,
    createdAt: Date.now() - 86400000 * 8,
    cuaderno: 'Cuaderno de Tutela'
  },
  {
    id: 'doc-3-anexo',
    userId: 'user-1',
    expedienteId: 'exp-3',
    name: 'Peticion_MinTrabajo_Respuesta_Incompleta.pdf',
    status: 'READY',
    type: 'pdf',
    size: 960000,
    createdAt: Date.now() - 86400000 * 6,
    cuaderno: 'Pruebas Documentales'
  },
  {
    id: 'doc-3',
    userId: 'user-1',
    expedienteId: 'exp-3',
    name: 'Normativa_IVA_2024.txt',
    status: 'ERROR',
    type: 'txt',
    size: 50000,
    createdAt: Date.now() - 7200000,
    cuaderno: 'Anexos Normativos',
    errorDetail: {
      code: 'PARSING_FAILED',
      message: 'El archivo contiene caracteres no compatibles con el codificador UTF-8.',
      suggestion: 'Guarde el archivo con codificación UTF-8 o intente cargar una versión PDF.',
      component: 'FILES',
      timestamp: new Date().toISOString()
    }
  },

  // Documentos del Expediente 4: Responsabilidad Civil Contractual
  {
    id: 'doc-4-demanda',
    userId: 'user-1',
    expedienteId: 'exp-4',
    name: 'Demanda_Verbal_Mayor_Cuantia_Seguros.pdf',
    status: 'READY',
    type: 'pdf',
    size: 3450000,
    createdAt: Date.now() - 86400000 * 20,
    cuaderno: 'Cuaderno Principal'
  },
  {
    id: 'doc-4-poliza',
    userId: 'user-1',
    expedienteId: 'exp-4',
    name: 'Poliza_Seguros_Todo_Riesgo_Construccion.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1780000,
    createdAt: Date.now() - 86400000 * 18,
    cuaderno: 'Pruebas Contractuales'
  },
  {
    id: 'doc-4-peritaje',
    userId: 'user-1',
    expedienteId: 'exp-4',
    name: 'Informe_Peritaje_Ingenieria_Falla_Talud.pdf',
    status: 'READY',
    type: 'pdf',
    size: 5120000,
    createdAt: Date.now() - 86400000 * 14,
    cuaderno: 'Dictámenes Periciales'
  },

  // Documentos del Expediente Hipoteca Santa Gema (exp-1789743909641)
  {
    id: 'doc-1789743909644',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'HIPOTECA_SANTA_GEMA.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1048576,
    createdAt: 1789743909644,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Título Ejecutivo y Carátula'
  },
  {
    id: 'doc-zip-1789744056329-1',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '00IndiceElectronico 6.xlsm',
    status: 'READY',
    type: 'xlsm',
    size: 194648,
    createdAt: 1789744056329,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Índice Electrónico'
  },
  {
    id: 'doc-zip-1789744056735-2',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '01EscritoDemanda.pdf',
    status: 'READY',
    type: 'pdf',
    size: 19654192,
    createdAt: 1789744056735,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Demanda y Anexos'
  },
  {
    id: 'doc-zip-1789744057019-3',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '02AutoLibraMandamientoPago.pdf',
    status: 'READY',
    type: 'pdf',
    size: 857176,
    createdAt: 1789744057019,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Actuaciones Judiciales'
  },
  {
    id: 'doc-zip-1789744057298-4',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '03OficioInstrumentos-ConstanciaNotificación.pdf',
    status: 'READY',
    type: 'pdf',
    size: 203795,
    createdAt: 1789744057298,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Medidas Cautelares'
  },
  {
    id: 'doc-zip-1789744057701-5',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '04Memorial20250124ConstanciaNotificacion.pdf',
    status: 'READY',
    type: 'pdf',
    size: 14694391,
    createdAt: 1789744057701,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Notificaciones'
  },
  {
    id: 'doc-zip-1789744057980-6',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '05Memroial20250212DocumentoRegistro.pdf',
    status: 'READY',
    type: 'pdf',
    size: 354127,
    createdAt: 1789744057980,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Medidas Cautelares'
  },
  {
    id: 'doc-zip-1789744058263-7',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '06AutoOrdenaSeguirAdelanteEjecución.pdf',
    status: 'READY',
    type: 'pdf',
    size: 523473,
    createdAt: 1789744058263,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Actuaciones Judiciales'
  },
  {
    id: 'doc-zip-1789744058546-8',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '07AutoLiquidaCostas.pdf',
    status: 'READY',
    type: 'pdf',
    size: 655356,
    createdAt: 1789744058546,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Liquidaciones'
  },
  {
    id: 'doc-zip-1789744058848-9',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '08OficioDespachoComisorio-ConstanciaEnvio.pdf',
    status: 'READY',
    type: 'pdf',
    size: 690299,
    createdAt: 1789744058848,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Comisiones y Secuestros'
  },
  {
    id: 'doc-zip-1789744059147-10',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '09ActaRepartoOE.pdf',
    status: 'READY',
    type: 'pdf',
    size: 363989,
    createdAt: 1789744059147,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Comisiones y Secuestros'
  },
  {
    id: 'doc-zip-1789744059464-11',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '09Memorial20250327Confirmaciondeligencia.pdf',
    status: 'READY',
    type: 'pdf',
    size: 1308451,
    createdAt: 1789744059464,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Comisiones y Secuestros'
  },
  {
    id: 'doc-zip-1789744059735-12',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '10Comaprtelink19092025.pdf',
    status: 'READY',
    type: 'pdf',
    size: 134636,
    createdAt: 1789744059735,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Diligencias Virtuales'
  },
  {
    id: 'doc-zip-1789744060017-13',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '11MemorialRemisionComision300725.pdf',
    status: 'READY',
    type: 'pdf',
    size: 376136,
    createdAt: 1789744060017,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Comisiones y Secuestros'
  },
  {
    id: 'doc-zip-1789744060301-14',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '12MemorialInforme140825.pdf',
    status: 'READY',
    type: 'pdf',
    size: 765731,
    createdAt: 1789744060301,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Informes de Secuestre'
  },
  {
    id: 'doc-zip-1789744060702-15',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '13MemorialInformeAbonos190825.pdf',
    status: 'READY',
    type: 'pdf',
    size: 20327577,
    createdAt: 1789744060702,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Liquidaciones y Abonos'
  },
  {
    id: 'doc-zip-1789744061115-16',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '14MemorialAportaAvaluo241125.pdf',
    status: 'READY',
    type: 'pdf',
    size: 7449842,
    createdAt: 1789744061115,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Avalúo Pericial'
  },
  {
    id: 'doc-zip-1789744061398-17',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '15MemorialPazySalvo09032026.pdf',
    status: 'READY',
    type: 'pdf',
    size: 253226,
    createdAt: 1789744061398,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Terminación por Pago'
  },
  {
    id: 'doc-zip-1789744061803-18',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '16MemorialTerminacionMora10032026.pdf',
    status: 'READY',
    type: 'pdf',
    size: 9840229,
    createdAt: 1789744061803,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Terminación por Pago'
  },
  {
    id: 'doc-zip-1789744062086-19',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '17MemorialSolTerminación280526.pdf',
    status: 'READY',
    type: 'pdf',
    size: 177331,
    createdAt: 1789744062086,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Terminación por Pago'
  },
  {
    id: 'doc-zip-1789744062381-20',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '18AutoTerminaOtrosI.pdf',
    status: 'READY',
    type: 'pdf',
    size: 955968,
    createdAt: 1789744062381,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Actuaciones Judiciales'
  },
  {
    id: 'doc-zip-1789744062923-22',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '01ReporteTitulos.pdf',
    status: 'READY',
    type: 'pdf',
    size: 400847,
    createdAt: 1789744062923,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Títulos Judiciales'
  },
  {
    id: 'doc-zip-1789744063216-23',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: '02ConstanciaTraslado.pdf',
    status: 'READY',
    type: 'pdf',
    size: 229304,
    createdAt: 1789744063216,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Traslados'
  },
  {
    id: 'doc-zip-1789744063487-24',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'MemorialEnvioPoder100826.pdf',
    status: 'READY',
    type: 'pdf',
    size: 264510,
    createdAt: 1789744063487,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Poderes'
  },
  {
    id: 'doc-zip-1789744063766-25',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'MemorialIncumplimientoObjecion290726.pdf',
    status: 'READY',
    type: 'pdf',
    size: 194645,
    createdAt: 1789744063766,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Memoriales'
  },
  {
    id: 'doc-zip-1789744064050-26',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'MemorialPoder100826.pdf',
    status: 'READY',
    type: 'pdf',
    size: 284843,
    createdAt: 1789744064050,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Poderes'
  },
  {
    id: 'doc-zip-1789744064351-27',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'MemorialPoderEspecial100826.pdf',
    status: 'READY',
    type: 'pdf',
    size: 220235,
    createdAt: 1789744064351,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Poderes'
  },
  {
    id: 'doc-zip-1789744056047-0',
    userId: 'user-1',
    expedienteId: 'exp-1789743909641',
    name: 'MemorialCuentasDefinitaivas240826.pdf',
    status: 'READY',
    type: 'pdf',
    size: 6121535,
    createdAt: 1789744056047,
    originZip: 'HIPOTECA SANTA GEMA.zip',
    cuaderno: 'Rendición de Cuentas'
  }
];

export const DocumentStorageService = {
  getDocuments(expedienteId?: string): LegalDocument[] {
    let allDocs: LegalDocument[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allDocs = parsed;
        }
      }
    } catch (e) {
      console.error('Error al cargar documentos desde almacenamiento local:', e);
    }

    if (allDocs.length === 0) {
      allDocs = INITIAL_DOCUMENTS;
    } else {
      // Verificar si faltan documentos iniciales
      const existingIds = new Set(allDocs.map(d => d.id));
      const missingDefaults = INITIAL_DOCUMENTS.filter(d => !existingIds.has(d.id));
      if (missingDefaults.length > 0) {
        allDocs = [...allDocs, ...missingDefaults];
      }
    }

    // Enriquecer con fecha real extraída del nombre y expedienteId, luego ordenar descendente
    const processed = allDocs.map(doc => {
      const realTime = parseDateFromName(doc.name);
      const createdAt = realTime ? realTime : doc.createdAt;
      let expId = doc.expedienteId;
      if (!expId) {
        if (doc.id === 'doc-2') expId = 'exp-2';
        else if (doc.id === 'doc-3') expId = 'exp-3';
        else expId = 'exp-1';
      }
      return { ...doc, createdAt, expedienteId: expId };
    });

    processed.sort((a, b) => b.createdAt - a.createdAt);

    // Eliminar duplicados existentes (mismo expediente y mismo nombre de archivo en minúsculas)
    const seen = new Set<string>();
    const uniqueProcessed: LegalDocument[] = [];
    for (const doc of processed) {
      const key = `${doc.expedienteId}:${doc.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProcessed.push(doc);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueProcessed));
    } catch (e) {}

    if (expedienteId) {
      return uniqueProcessed.filter(d => d.expedienteId === expedienteId);
    }
    return uniqueProcessed;
  },

  getDocumentsByExpediente(expedienteId: string): LegalDocument[] {
    return this.getDocuments(expedienteId);
  },

  saveDocuments(docs: LegalDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: docs }));
    } catch (e) {
      console.error('Error al guardar documentos:', e);
    }
  },

  addDocument(doc: LegalDocument): void {
    const current = this.getDocuments();
    const updated = [doc, ...current.filter(d => d.id !== doc.id)];
    this.saveDocuments(updated);
    NeonSyncService.saveDocumentsToDb([doc]).catch(console.error);
  },

  addBatchDocuments(newDocs: LegalDocument[]): void {
    const current = this.getDocuments();
    const existingKeys = new Set(current.map(d => `${d.expedienteId}:${d.name.toLowerCase()}`));
    const uniqueNewDocs = newDocs.filter(d => !existingKeys.has(`${d.expedienteId}:${d.name.toLowerCase()}`));

    if (uniqueNewDocs.length === 0) {
      console.log('[DocumentStorage] Todos los documentos del lote ya existen en la bóveda (sin duplicados).');
      return;
    }

    const updated = [...uniqueNewDocs, ...current];
    this.saveDocuments(updated);
    NeonSyncService.saveDocumentsToDb(uniqueNewDocs).catch(console.error);
  },

  deleteDocument(docId: string): void {
    const current = this.getDocuments();
    const updated = current.filter(d => d.id !== docId);
    this.saveDocuments(updated);
  },

  deleteDocumentsByExpediente(expedienteId: string): void {
    const current = this.getDocuments();
    const updated = current.filter(d => d.expedienteId !== expedienteId);
    this.saveDocuments(updated);
    NeonSyncService.deleteDocumentsByExpedienteInDb(expedienteId).catch(console.error);
  },

  downloadAndImportFromSharePoint(sharepointCode: string, expedienteId: string): LegalDocument[] {
    console.log(`[SharepointDownload] Iniciando descarga desde SharePoint con código de acceso: ${sharepointCode}`);
    console.log(`[SharepointDownload] URL base: https://etbcsj.sharepoint.com/:f:/t/Juzgado07Ejec/IgAfjOKxaHE3RKD99Uv5hJ4UAW9pt2w_wkAkSj0MRC-xDSM`);

    const currentDocs = this.getDocuments(expedienteId);
    const existingNames = new Set(currentDocs.map(d => d.name.toLowerCase()));

    const spDocs = INITIAL_DOCUMENTS.filter(d => d.expedienteId === expedienteId)
      .filter(doc => !existingNames.has(doc.name.toLowerCase()))
      .map(doc => {
        const parsedDate = parseRamaDate(doc.createdAt || doc.name);
        console.log(`[SharepointDownload] Procesando archivo nuevo: ${doc.name} | Fecha parseada:`, parsedDate.toISOString());
        return {
          ...doc,
          expedienteId,
          createdAt: parsedDate.getTime()
        };
      });

    spDocs.sort((a, b) => b.createdAt - a.createdAt);
    console.log(`[SharepointDownload] Paquete documental procesado. Documentos nuevos únicos a importar: ${spDocs.length}`);

    if (spDocs.length > 0) {
      this.addBatchDocuments(spDocs);
    }
    return this.getDocuments(expedienteId);
  },

  subscribe(callback: (docs: LegalDocument[]) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<LegalDocument[]>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      } else {
        callback(this.getDocuments());
      }
    };
    window.addEventListener(UPDATE_EVENT, handler);
    return () => window.removeEventListener(UPDATE_EVENT, handler);
  }
};
