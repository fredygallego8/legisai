import { ExecutiveSummaryData, CaseMilestone, LegalCaseDetails } from '../../types';

export interface ApaCitationResult {
  /** Cita bibliográfica completa según Normas APA 7.ª edición (Jurisprudencia) */
  bibliographicReference: string;
  /** Cita en el texto parentética, ej: (Corte Suprema de Justicia, Sentencia SL2845-2024, 2024) */
  inTextParenthetical: string;
  /** Cita en el texto narrativa, ej: Corte Suprema de Justicia (2024, Sentencia SL2845-2024) */
  inTextNarrative: string;
  /** Órgano emisor depurado */
  court: string;
  /** Título o número de la providencia depurado */
  rulingTitle: string;
  /** Año de expedición */
  year: string;
  /** Ponente formal */
  ponente: string;
}

/**
 * Normaliza nombres de meses y extrae día, mes y año
 */
function parseSpanishDate(dateStr: string): { year: string; fullFormattedDate: string } {
  if (!dateStr) {
    const currentYear = new Date().getFullYear().toString();
    return { year: currentYear, fullFormattedDate: currentYear };
  }

  const trimmed = dateStr.trim();

  // Caso ISO: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const y = isoMatch[1];
    const m = months[parseInt(isoMatch[2], 10) - 1] || 'enero';
    const d = parseInt(isoMatch[3], 10);
    return {
      year: y,
      fullFormattedDate: `${y}, ${d} de ${m}`
    };
  }

  // Caso texto: "18 de agosto de 2024" o "18 de agosto del 2024"
  const textMatch = trimmed.match(/(\d{1,2})\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)(?:\s+de|\s+del)?\s+(\d{4})/i);
  if (textMatch) {
    const d = textMatch[1];
    const m = textMatch[2].toLowerCase();
    const y = textMatch[3];
    return {
      year: y,
      fullFormattedDate: `${y}, ${d} de ${m}`
    };
  }

  // Caso solo año en el texto
  const yearMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return {
      year: yearMatch[1],
      fullFormattedDate: yearMatch[1]
    };
  }

  const fallbackYear = new Date().getFullYear().toString();
  return { year: fallbackYear, fullFormattedDate: fallbackYear };
}

/**
 * Limpia y estandariza el nombre de la corporación judicial
 */
function cleanCourtName(court: string): string {
  if (!court) return 'Rama Judicial de Colombia';
  let cleaned = court.trim();
  // Quitar guiones intermedios estéticos "Corte Suprema - Sala Laboral" -> "Corte Suprema de Justicia, Sala de Casación Laboral"
  cleaned = cleaned.replace(/\s*-\s*/g, ', ');
  cleaned = cleaned.replace(/\s*•\s*/g, ', ');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  return cleaned;
}

/**
 * Limpia el título del ponente para el estándar APA: (M.P. [Nombre])
 */
function cleanPonente(ponente: string): string {
  if (!ponente) return '';
  let cleaned = ponente.trim();
  cleaned = cleaned.replace(/^(M\.P\.|Magistrado Ponente|Magistrada Ponente|Juez|Jueza)[\s.:]*/i, '').trim();
  cleaned = cleaned.replace(/^(Dr\.|Dra\.|Doctor|Doctora)\s+/i, '').trim();
  return cleaned;
}

/**
 * Separa el nombre de la sentencia y el radicado si vienen juntos
 * Ej: "Sentencia SL2845-2024 (Rad. 98124)"
 */
function parseProvidenciaAndRadicado(raw: string): { title: string; radicadoNum: string } {
  if (!raw) return { title: 'Sentencia Judicial', radicadoNum: '' };
  
  const radMatch = raw.match(/\((?:Rad\.?|Radicado|Radicación)?\s*(?:n\.?°?)?\s*([^)]+)\)/i);
  let radicadoNum = '';
  let title = raw;

  if (radMatch) {
    radicadoNum = radMatch[1].trim();
    title = raw.replace(/\s*\([^)]+\)/g, '').trim();
  }

  // Si no había paréntesis, buscar radicado numérico largo o estándar
  if (!radicadoNum) {
    const numMatch = raw.match(/(\d{5,23}|\d{1,5}-\d{2,4})/);
    if (numMatch && !title.includes(numMatch[1])) {
      radicadoNum = numMatch[1];
    }
  }

  return { title, radicadoNum };
}

/**
 * Genera la cita bibliográfica APA 7.ª edición a partir de los datos del Resumen Ejecutivo de la IA
 */
export function generateApaCitationFromSummary(summary: ExecutiveSummaryData): ApaCitationResult {
  const court = cleanCourtName(summary.corporacion);
  const { year, fullFormattedDate } = parseSpanishDate(summary.fecha);
  const { title, radicadoNum } = parseProvidenciaAndRadicado(summary.radicado);
  const ponenteName = cleanPonente(summary.magistradoPonente);

  // Armar detalles entre paréntesis: (Radicación n.° X; M.P. Y) o (M.P. Y)
  const detailsParts: string[] = [];
  if (radicadoNum) {
    detailsParts.push(`Radicación n.° ${radicadoNum}`);
  }
  if (ponenteName) {
    const isJudge = summary.corporacion.toLowerCase().includes('juzgado');
    const prefix = isJudge ? 'Juez' : 'M.P.';
    detailsParts.push(`${prefix} ${ponenteName}`);
  }

  const detailsString = detailsParts.length > 0 ? ` (${detailsParts.join('; ')})` : '';

  // Referencia bibliográfica APA 7 estándar:
  // Tribunal, Sala. (Año, Día de Mes). Título de la sentencia (Radicación n.° X; M.P. Y).
  const bibliographicReference = `${court}. (${fullFormattedDate}). ${title}${detailsString}.`;

  // Cita parentética en el texto:
  // (Corte Suprema de Justicia, Sentencia SL2845-2024, 2024)
  const shortCourt = court.split(',')[0].trim();
  const inTextParenthetical = `(${shortCourt}, ${title}, ${year})`;

  // Cita narrativa en el texto:
  // Corte Suprema de Justicia (2024, Sentencia SL2845-2024)
  const inTextNarrative = `${shortCourt} (${year}, ${title})`;

  return {
    bibliographicReference,
    inTextParenthetical,
    inTextNarrative,
    court,
    rulingTitle: title,
    year,
    ponente: ponenteName
  };
}

/**
 * Genera la cita bibliográfica APA 7.ª edición a partir de un hito judicial del expediente
 */
export function generateApaCitationFromMilestone(
  milestone: CaseMilestone,
  caseDetails: LegalCaseDetails
): ApaCitationResult {
  const court = cleanCourtName(milestone.authority || caseDetails.despachoActual);
  const { year, fullFormattedDate } = parseSpanishDate(milestone.date || milestone.displayDate || caseDetails.fechaInicio);

  let title = milestone.title;
  let radicadoNum = caseDetails.radicado;
  let ponenteName = '';

  if (milestone.linkedSentencia) {
    title = milestone.linkedSentencia.providencia;
    if (milestone.linkedSentencia.radicado) {
      radicadoNum = milestone.linkedSentencia.radicado;
    }
    if (milestone.linkedSentencia.magistradoPonente) {
      ponenteName = cleanPonente(milestone.linkedSentencia.magistradoPonente);
    }
  }

  const detailsParts: string[] = [];
  if (radicadoNum) {
    detailsParts.push(`Radicación n.° ${radicadoNum}`);
  }
  if (ponenteName) {
    const isJudge = court.toLowerCase().includes('juzgado');
    const prefix = isJudge ? 'Juez' : 'M.P.';
    detailsParts.push(`${prefix} ${ponenteName}`);
  }

  const detailsString = detailsParts.length > 0 ? ` (${detailsParts.join('; ')})` : '';

  const bibliographicReference = `${court}. (${fullFormattedDate}). ${title}${detailsString}.`;
  const shortCourt = court.split(',')[0].trim();
  const inTextParenthetical = `(${shortCourt}, ${title}, ${year})`;
  const inTextNarrative = `${shortCourt} (${year}, ${title})`;

  return {
    bibliographicReference,
    inTextParenthetical,
    inTextNarrative,
    court,
    rulingTitle: title,
    year,
    ponente: ponenteName
  };
}
