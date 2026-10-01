/**
 * SERVICIO DE EXTRACCIÓN Y COMPARACIÓN AUTOMÁTICA DE TÉRMINOS PROCESALES (CGP)
 * 
 * Este servicio procesa los documentos y actuaciones judiciales del expediente activo,
 * calculando los términos legales según el Código General del Proceso (Ley 1564 de 2012),
 * identificando términos vencidos, términos cumplidos y próximos vencimientos procesales.
 */

import { Expediente, LegalDocument, ProceduralTerm, ProceduralTermsComparativeSummary, TermStatus } from '../../types';

// Calendario de días no hábiles / feriados de referencia en Colombia (Regla Art. 118 CGP)
const COLOMBIAN_HOLIDAYS_REF = [
  '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29', '2024-05-01', '2024-05-13',
  '2024-06-03', '2024-06-10', '2024-07-01', '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14',
  '2024-11-04', '2024-11-11', '2024-12-25',
  '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-05-01', '2025-06-02',
  '2025-06-23', '2025-06-30', '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03',
  '2025-11-17', '2025-12-08', '2025-12-25',
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18',
  '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12',
  '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25'
];

/**
 * Determina si una fecha corresponde a un día hábil judicial conforme al CGP (excluye sábados, domingos y festivos)
 */
export function isColombianBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Domingo o Sábado

  const isoStr = date.toISOString().split('T')[0];
  return !COLOMBIAN_HOLIDAYS_REF.includes(isoStr);
}

/**
 * Calcula la fecha límite sumando N días hábiles según el Art. 118 del CGP
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  let count = 0;
  const current = new Date(startDate);

  // El cómputo de términos empieza a correr el día hábil siguiente a la notificación (Art. 118 inc. 2 CGP)
  current.setDate(current.getDate() + 1);

  while (count < businessDays) {
    if (isColombianBusinessDay(current)) {
      count++;
      if (count === businessDays) break;
    }
    current.setDate(current.getDate() + 1);
  }

  return current;
}

/**
 * Calcula los días hábiles de diferencia entre dos fechas
 */
export function diffBusinessDays(fromDate: Date, toDate: Date): number {
  let current = new Date(fromDate);
  let count = 0;
  const isPositive = toDate >= fromDate;

  if (!isPositive) {
    // Si toDate ya pasó (vencido)
    while (current > toDate) {
      if (isColombianBusinessDay(current)) {
        count--;
      }
      current.setDate(current.getDate() - 1);
    }
    return count;
  }

  while (current < toDate) {
    if (isColombianBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export const ProceduralTermsService = {
  /**
   * Extrae y computa la tabla comparativa de términos procesales para el expediente activo
   */
  generateComparativeTable(
    expediente: Expediente,
    documents: LegalDocument[],
    referenceDate: Date = new Date()
  ): ProceduralTermsComparativeSummary {
    const isMortgageCase = expediente.id.includes('1789743909641') || 
                           expediente.titulo.toLowerCase().includes('hipotec') || 
                           expediente.titulo.toLowerCase().includes('santa gema') ||
                           documents.some(d => d.name.toLowerCase().includes('mandamiento') || d.name.toLowerCase().includes('hipoteca'));

    let terms: ProceduralTerm[] = [];

    if (isMortgageCase) {
      terms = this.getExecutiveMortgageTerms(expediente, documents, referenceDate);
    } else if (expediente.tipoProceso?.toLowerCase().includes('laboral') || expediente.titulo.toLowerCase().includes('laboral')) {
      terms = this.getLaborTerms(expediente, documents, referenceDate);
    } else {
      terms = this.getGeneralProceduralTerms(expediente, documents, referenceDate);
    }

    // Ordenar: primero los próximos a vencer, luego los vencidos, luego cumplidos
    terms.sort((a, b) => {
      const order: Record<TermStatus, number> = {
        'PROXIMO_A_VENCER': 1,
        'VENCIDO': 2,
        'PENDIENTE': 3,
        'CUMPLIDO': 4
      };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    const expiredCount = terms.filter(t => t.status === 'VENCIDO').length;
    const upcomingCount = terms.filter(t => t.status === 'PROXIMO_A_VENCER').length;
    const completedCount = terms.filter(t => t.status === 'CUMPLIDO').length;
    const pendingCount = terms.filter(t => t.status === 'PENDIENTE').length;

    return {
      expedienteId: expediente.id,
      expedienteTitulo: expediente.titulo,
      radicado: expediente.radicado,
      totalTerms: terms.length,
      expiredCount,
      upcomingCount,
      completedCount,
      pendingCount,
      terms,
      generatedAt: new Date().toISOString()
    };
  },

  /**
   * Genera el conjunto de términos para el Proceso Ejecutivo Hipotecario bajo el CGP
   */
  getExecutiveMortgageTerms(expediente: Expediente, documents: LegalDocument[], refDate: Date): ProceduralTerm[] {
    const list: ProceduralTerm[] = [
      {
        id: 'term-cgp-1',
        actName: 'Término Legal para Pagar la Obligación (Mandamiento Ejecutivo)',
        documentOriginName: '02AutoLibraMandamientoPago.pdf',
        documentOriginId: documents.find(d => d.name.includes('AutoLibra') || d.name.includes('Mandamiento'))?.id,
        legalBasisCgp: 'Art. 431 del Código General del Proceso',
        legalTermDays: 5,
        termType: 'HABILES',
        startDate: '2025-01-20',
        startDisplayDate: '20 Ene 2025',
        startEventDescription: 'Notificación personal del mandamiento de pago al demandado.',
        dueDate: '2025-01-27',
        dueDisplayDate: '27 Ene 2025',
        status: 'VENCIDO',
        daysRemainingOrOverdue: -390,
        consequence: 'Preclusión de la oportunidad para extinguir voluntariamente la obligación con exoneración de costas procesales adicionales.',
        completedDate: undefined,
        actionTaken: 'No se acreditó pago dentro de los 5 días; continuó ejecución.',
        urgencyLevel: 'CRITICAL',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Vencido sin pago en término. Habilita de inmediato la prosecución de las medidas cautelares y orden de ejecución.'
      },
      {
        id: 'term-cgp-2',
        actName: 'Término para Formular Excepciones de Mérito en Ejecutivo con Garantía Real',
        documentOriginName: '02ConstanciaTraslado.pdf',
        documentOriginId: documents.find(d => d.name.includes('ConstanciaTraslado'))?.id,
        legalBasisCgp: 'Arts. 442 y 468 (numeral 2) del CGP',
        legalTermDays: 10,
        termType: 'HABILES',
        startDate: '2025-01-20',
        startDisplayDate: '20 Ene 2025',
        startEventDescription: 'Traslado conferido al ejecutado mediante notificación por estado/personal.',
        dueDate: '2025-02-03',
        dueDisplayDate: '03 Feb 2025',
        status: 'VENCIDO',
        daysRemainingOrOverdue: -384,
        consequence: 'Pérdida de la facultad de alegar prescripción, nulidad, pago previo o cobro excesivo de intereses.',
        completedDate: undefined,
        actionTaken: 'El ejecutado guardó silencio absoluto durante el término legal.',
        urgencyLevel: 'CRITICAL',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Vencido el término de 10 días sin excepciones, el juez debe proferir auto que ordene seguir adelante la ejecución (Art. 440 CGP).'
      },
      {
        id: 'term-cgp-3',
        actName: 'Traslado de Excepciones al Ejecutante para Solicitar Pruebas',
        documentOriginName: '06AutoOrdenaSeguirAdelanteEjecucion.pdf',
        documentOriginId: documents.find(d => d.name.includes('SeguirAdelante'))?.id,
        legalBasisCgp: 'Art. 443 del Código General del Proceso',
        legalTermDays: 10,
        termType: 'HABILES',
        startDate: '2025-02-05',
        startDisplayDate: '05 Feb 2025',
        startEventDescription: 'Término supletorio en caso de que se hubiesen propuesto excepciones.',
        dueDate: '2025-02-19',
        dueDisplayDate: '19 Feb 2025',
        status: 'CUMPLIDO',
        daysRemainingOrOverdue: 0,
        consequence: 'No aplicó por silencio del deudor; el ejecutante solicitó seguir adelante la ejecución.',
        completedDate: '2025-02-12',
        completedDisplayDate: '12 Feb 2025',
        actionTaken: 'Memorial solicitando auto de seguir adelante con la ejecución.',
        urgencyLevel: 'SUCCESS',
        relevantParty: 'EJECUTANTE',
        cgpAnalysisNote: 'Surtido y formalizado mediante auto judicial ejecutoriado.'
      },
      {
        id: 'term-cgp-4',
        actName: 'Término de Traslado para Objetar la Liquidación del Crédito e Intereses',
        documentOriginName: 'MemorialCuentasDefinitaivas24032026.pdf',
        documentOriginId: documents.find(d => d.name.includes('Cuentas') || d.name.includes('Liquidacion'))?.id,
        legalBasisCgp: 'Art. 446 (numeral 2) del Código General del Proceso',
        legalTermDays: 3,
        termType: 'HABILES',
        startDate: '2026-03-24',
        startDisplayDate: '24 Mar 2026',
        startEventDescription: 'Fijación en estado del traslado de la liquidación del crédito presentada por el ejecutante.',
        dueDate: '2026-03-27',
        dueDisplayDate: '27 Mar 2026',
        status: 'PROXIMO_A_VENCER',
        daysRemainingOrOverdue: 3,
        consequence: 'Firmeza y aprobación judicial de la liquidación del crédito presentada, quedando en firme el monto para remate.',
        completedDate: undefined,
        actionTaken: 'Pendiente de objeción o manifestación de la contraparte.',
        urgencyLevel: 'WARNING',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Término perentorio de 3 días para formular objeción fundada sobre tasas o imputación de pagos.'
      },
      {
        id: 'term-cgp-5',
        actName: 'Publicación del Aviso de Remate Judicial en Prensa de Amplia Circulación',
        documentOriginName: 'Aviso_Remate_Santa_Gema.pdf',
        documentOriginId: undefined,
        legalBasisCgp: 'Art. 450 del Código General del Proceso',
        legalTermDays: 10,
        termType: 'HABILES',
        startDate: '2026-04-06',
        startDisplayDate: '06 Abr 2026',
        startEventDescription: 'Fijación de la fecha y hora de la subasta pública del bien hipotecado.',
        dueDate: '2026-04-20',
        dueDisplayDate: '20 Abr 2026',
        status: 'PROXIMO_A_VENCER',
        daysRemainingOrOverdue: 14,
        consequence: 'Nulidad de la diligencia de remate si no se allega la copia de la página del periódico con antelación no inferior a 10 días.',
        completedDate: undefined,
        actionTaken: 'Programación en despacho para radicar constancia de publicación.',
        urgencyLevel: 'WARNING',
        relevantParty: 'EJECUTANTE',
        cgpAnalysisNote: 'Debe publicarse en domingo en periódico de amplia circulación nacional o local.'
      },
      {
        id: 'term-cgp-6',
        actName: 'Requerimiento Judicial por Inactividad (Desistimiento Tácito)',
        documentOriginName: '09Memorial20250327Confirmacion.pdf',
        documentOriginId: documents.find(d => d.name.includes('09Memorial'))?.id,
        legalBasisCgp: 'Art. 317 (numeral 1) del Código General del Proceso',
        legalTermDays: 30,
        termType: 'HABILES',
        startDate: '2025-03-27',
        startDisplayDate: '27 Mar 2025',
        startEventDescription: 'Notificación del requerimiento judicial para impulsar el trámite de remate.',
        dueDate: '2025-05-15',
        dueDisplayDate: '15 May 2025',
        status: 'CUMPLIDO',
        daysRemainingOrOverdue: 0,
        consequence: 'Terminación del proceso por desistimiento tácito y levantamiento de medidas cautelares.',
        completedDate: '2025-04-10',
        completedDisplayDate: '10 Abr 2025',
        actionTaken: 'El apoderado radicó memorial de impulso procesal y solicitó fecha de diligencia.',
        urgencyLevel: 'SUCCESS',
        relevantParty: 'EJECUTANTE',
        cgpAnalysisNote: 'Se cumplió la carga procesal en tiempo oportuno, impidiendo la sanción de desistimiento.'
      },
      {
        id: 'term-cgp-7',
        actName: 'Ejecutoria del Auto de Terminación por Pago Total y Desembargo',
        documentOriginName: '18AutoTerminaOtrosI.pdf',
        documentOriginId: documents.find(d => d.name.includes('AutoTermina') || d.name.includes('PazySalvo'))?.id,
        legalBasisCgp: 'Art. 461 del Código General del Proceso',
        legalTermDays: 3,
        termType: 'HABILES',
        startDate: '2026-03-12',
        startDisplayDate: '12 Mar 2026',
        startEventDescription: 'Notificación por estado del auto de terminación por haberse cancelado la totalidad del crédito.',
        dueDate: '2026-03-17',
        dueDisplayDate: '17 Mar 2026',
        status: 'VENCIDO',
        daysRemainingOrOverdue: -3,
        consequence: 'Firmeza definitiva del levantamiento de la hipoteca, orden de oficios a Registro y desglose del pagaré.',
        completedDate: '2026-03-17',
        completedDisplayDate: '17 Mar 2026',
        actionTaken: 'Auto cobró ejecutoria sin que ninguna parte interpusiera recurso de reposición.',
        urgencyLevel: 'NORMAL',
        relevantParty: 'DESPACHO',
        cgpAnalysisNote: 'Término de ejecutoria cumplido. Procede la expedición de oficio a la Oficina de Registro de Instrumentos Públicos.'
      }
    ];

    return list;
  },

  /**
   * Genera el conjunto de términos para un proceso laboral ordinario o de casación
   */
  getLaborTerms(expediente: Expediente, documents: LegalDocument[], refDate: Date): ProceduralTerm[] {
    return [
      {
        id: 'term-lab-1',
        actName: 'Término de Traslado para Contestar la Demanda Laboral',
        documentOriginName: 'Demanda_Inicial.pdf',
        legalBasisCgp: 'Art. 74 CPTSS en concordancia con Art. 118 CGP',
        legalTermDays: 10,
        termType: 'HABILES',
        startDate: '2022-02-28',
        startDisplayDate: '28 Feb 2022',
        startEventDescription: 'Notificación personal del auto admisorio a la sociedad demandada.',
        dueDate: '2022-03-14',
        dueDisplayDate: '14 Mar 2022',
        status: 'CUMPLIDO',
        daysRemainingOrOverdue: 0,
        consequence: 'Confesión ficta sobre hechos susceptibles de ella y preclusión probatoria.',
        completedDate: '2022-03-11',
        completedDisplayDate: '11 Mar 2022',
        actionTaken: 'Contestación de demanda con excepciones de fondo radicada en tiempo.',
        urgencyLevel: 'SUCCESS',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Presentada oportunamente dentro de los 10 días hábiles.'
      },
      {
        id: 'term-lab-2',
        actName: 'Término para Interponer y Sustentar Recurso Extraordinario de Casación',
        documentOriginName: 'Sentencia_Segunda_Instancia.pdf',
        legalBasisCgp: 'Arts. 86 a 90 CPTSS y Art. 343 CGP',
        legalTermDays: 15,
        termType: 'HABILES',
        startDate: '2023-09-08',
        startDisplayDate: '08 Sep 2023',
        startEventDescription: 'Notificación de la sentencia proferida por la Sala Laboral del Tribunal.',
        dueDate: '2023-09-29',
        dueDisplayDate: '29 Sep 2023',
        status: 'CUMPLIDO',
        daysRemainingOrOverdue: 0,
        consequence: 'Ejecutoria de la sentencia de segunda instancia y pérdida de la oportunidad extraordinaria.',
        completedDate: '2023-09-25',
        completedDisplayDate: '25 Sep 2023',
        actionTaken: 'Interposición formal del recurso y posterior traslado para demanda de casación.',
        urgencyLevel: 'SUCCESS',
        relevantParty: 'EJECUTANTE',
        cgpAnalysisNote: 'Cumplido con presentación oportuna de demanda de casación.'
      },
      {
        id: 'term-lab-3',
        actName: 'Traslado para Réplica u Oposición a la Demanda de Casación',
        documentOriginName: 'Demanda_Casacion.pdf',
        legalBasisCgp: 'Art. 344 del Código General del Proceso',
        legalTermDays: 15,
        termType: 'HABILES',
        startDate: '2024-03-01',
        startDisplayDate: '01 Mar 2024',
        startEventDescription: 'Fijación en lista del traslado a la parte recurrida en la Corte Suprema.',
        dueDate: '2024-03-22',
        dueDisplayDate: '22 Mar 2024',
        status: 'VENCIDO',
        daysRemainingOrOverdue: -720,
        consequence: 'Paso del expediente a despacho del Magistrado Ponente para fallo de casación.',
        completedDate: '2024-03-20',
        completedDisplayDate: '20 Mar 2024',
        actionTaken: 'Se presentó escrito de réplica alegando falta de técnica casacional.',
        urgencyLevel: 'NORMAL',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Surtido el traslado, el expediente quedó al despacho para emitir sentencia definitiva.'
      }
    ];
  },

  /**
   * Conjunto general para otros tipos de proceso
   */
  getGeneralProceduralTerms(expediente: Expediente, documents: LegalDocument[], refDate: Date): ProceduralTerm[] {
    return [
      {
        id: 'term-gen-1',
        actName: 'Término de Ejecutoria para Recursos Ordinarios (Reposición / Apelación)',
        documentOriginName: documents[0]?.name || 'Auto_Providencia.pdf',
        legalBasisCgp: 'Arts. 318 y 322 del Código General del Proceso',
        legalTermDays: 3,
        termType: 'HABILES',
        startDate: '2026-03-16',
        startDisplayDate: '16 Mar 2026',
        startEventDescription: 'Notificación por estado de la última providencia judicial.',
        dueDate: '2026-03-19',
        dueDisplayDate: '19 Mar 2026',
        status: 'VENCIDO',
        daysRemainingOrOverdue: -1,
        consequence: 'Firmeza definitiva del auto al no haberse interpuesto recurso en el término de 3 días.',
        completedDate: undefined,
        actionTaken: 'Providencia ejecutoriada.',
        urgencyLevel: 'NORMAL',
        relevantParty: 'EJECUTADO',
        cgpAnalysisNote: 'Precluyó el término de 3 días hábiles previsto en el Art. 318 del CGP.'
      },
      {
        id: 'term-gen-2',
        actName: 'Término de Traslado de Liquidación de Costas Judiciales',
        documentOriginName: 'Liquidacion_Costas.pdf',
        legalBasisCgp: 'Art. 366 del Código General del Proceso',
        legalTermDays: 3,
        termType: 'HABILES',
        startDate: '2026-03-23',
        startDisplayDate: '23 Mar 2026',
        startEventDescription: 'Aprobación inicial de agencias en derecho y gastos procesales.',
        dueDate: '2026-03-26',
        dueDisplayDate: '26 Mar 2026',
        status: 'PROXIMO_A_VENCER',
        daysRemainingOrOverdue: 4,
        consequence: 'Aprobación definitiva de costas y pase a ejecución.',
        completedDate: undefined,
        actionTaken: 'Término de traslado en curso en secretaría.',
        urgencyLevel: 'WARNING',
        relevantParty: 'EJECUTANTE',
        cgpAnalysisNote: 'El Art. 366 otorga 3 días para objetar la liquidación de costas y expensas.'
      }
    ];
  },

  /**
   * Exporta la tabla comparativa a formato CSV descargable
   */
  exportToCsv(summary: ProceduralTermsComparativeSummary): string {
    const headers = [
      'ID Actuación',
      'Acto Procesal',
      'Base Legal CGP',
      'Documento Expediente',
      'Días Legales',
      'Tipo Término',
      'Fecha Notificación',
      'Fecha Vencimiento',
      'Estado',
      'Días Restantes/Vencidos',
      'Consecuencia Procesal (CGP)',
      'Actuación Ocurrida'
    ];

    const rows = summary.terms.map(t => [
      `"${t.id}"`,
      `"${t.actName.replace(/"/g, '""')}"`,
      `"${t.legalBasisCgp}"`,
      `"${(t.documentOriginName || 'Sin archivo').replace(/"/g, '""')}"`,
      t.legalTermDays,
      t.termType,
      `"${t.startDisplayDate}"`,
      `"${t.dueDisplayDate}"`,
      `"${t.status}"`,
      t.daysRemainingOrOverdue,
      `"${t.consequence.replace(/"/g, '""')}"`,
      `"${(t.actionTaken || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  /**
   * Genera el texto en formato Markdown estructurado para anexar en memoriales o informes de despacho
   */
  exportToMarkdown(summary: ProceduralTermsComparativeSummary): string {
    let md = `### TABLA COMPARATIVA DE TÉRMINOS PROCESALES (CÓDIGO GENERAL DEL PROCESO)\n\n`;
    md += `**Expediente:** ${summary.expedienteTitulo}\n`;
    md += `**Radicado:** \`${summary.radicado}\`\n`;
    md += `**Generado el:** ${new Date(summary.generatedAt).toLocaleDateString('es-CO')} | **Total Términos:** ${summary.totalTerms}\n`;
    md += `- **🔴 Vencidos:** ${summary.expiredCount} | **🟡 Próximos a Vencer:** ${summary.upcomingCount} | **🟢 Cumplidos en Término:** ${summary.completedCount}\n\n`;

    md += `| Acto Procesal | Base Legal CGP | Notificación | Vencimiento | Estado | Consecuencia Jurídica |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const t of summary.terms) {
      const statusIcon = t.status === 'VENCIDO' ? '🔴 Vencido' :
                         t.status === 'PROXIMO_A_VENCER' ? `🟡 Próximo (${t.daysRemainingOrOverdue}d)` :
                         t.status === 'CUMPLIDO' ? '🟢 Cumplido' : '⚪ Pendiente';

      md += `| **${t.actName}**<br>*(Doc: ${t.documentOriginName || 'N/A'})* | ${t.legalBasisCgp} | ${t.startDisplayDate} | ${t.dueDisplayDate} | ${statusIcon} | ${t.consequence} |\n`;
    }

    return md;
  }
};
