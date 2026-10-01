import { jsPDF } from 'jspdf';
import { ExecutiveSummaryData } from '../../types';
import { generateApaCitationFromSummary } from '../citation/apaCitationFormatter';

export interface PDFExportOptions {
  includeObiterDicta?: boolean;
  watermark?: boolean;
  notes?: string;
  lawFirmName?: string;
}

/**
 * Sanitiza texto para evitar problemas de codificación en jsPDF estándar
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

/**
 * Genera y descarga un PDF estructurado de alta calidad para la ficha jurisprudencial
 * de la providencia colombiana.
 */
export async function exportExecutiveSummaryToPDF(
  summary: ExecutiveSummaryData,
  options: PDFExportOptions = {}
): Promise<void> {
  const {
    includeObiterDicta = true,
    notes = '',
    lawFirmName = 'LEGISAI COLOMBIA • CONSULTORÍA JURÍDICA'
  } = options;

  // Crear documento A4 vertical en puntos o milímetros
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Paleta de colores profesionales legales (Azul marino institucional + Slate + Dorado/Índigo)
  const colors = {
    primary: [30, 41, 59] as [number, number, number],       // Slate 800
    accent: [67, 56, 202] as [number, number, number],        // Indigo 700
    accentBg: [238, 242, 255] as [number, number, number],    // Indigo 50
    ratioBorder: [79, 70, 229] as [number, number, number],   // Indigo 600
    textMain: [15, 23, 42] as [number, number, number],       // Slate 900
    textMuted: [100, 116, 139] as [number, number, number],   // Slate 500
    borderMuted: [226, 232, 240] as [number, number, number], // Slate 200
    bgLight: [248, 250, 252] as [number, number, number],     // Slate 50
    badgeBg: [224, 231, 255] as [number, number, number],     // Indigo 100
    decisionBg: [236, 253, 245] as [number, number, number],  // Emerald 50
    decisionBorder: [16, 185, 129] as [number, number, number] // Emerald 500
  };

  const drawHeader = () => {
    // Franja superior institucional
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Mini subfranja acento
    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(0, 5, pageWidth, 1.5, 'F');
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader();
      y = margin + 4;
    }
  };

  // 1. Dibujar Cabecera Primera Página
  drawHeader();
  y = margin + 2;

  // Header institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text(lawFirmName.toUpperCase(), margin, y);
  
  const dateStr = new Date().toLocaleDateString('es-CO', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text(`Generado: ${dateStr}`, pageWidth - margin, y, { align: 'right' });

  y += 6;

  // Título del Documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  doc.text('FICHA DE ANÁLISIS JURISPRUDENCIAL', margin, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text(cleanText(summary.radicado), margin, y);

  y += 7;

  // 2. Tabla / Recuadro de Metadatos de la Providencia
  const metaBoxHeight = 32;
  doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
  doc.setDrawColor(colors.borderMuted[0], colors.borderMuted[1], colors.borderMuted[2]);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 2, 2, 'FD');

  // Columna 1 de Metadatos
  const col1X = margin + 4;
  const col2X = margin + (contentWidth / 2) + 2;
  let metaY = y + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('CORPORACIÓN:', col1X, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  const corpLines = doc.splitTextToSize(cleanText(summary.corporacion), (contentWidth / 2) - 8);
  doc.text(corpLines, col1X + 28, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('FECHA:', col2X, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  doc.text(cleanText(summary.fecha), col2X + 16, metaY);

  metaY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('M.P.:', col1X, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  const mpLines = doc.splitTextToSize(cleanText(summary.magistradoPonente), (contentWidth / 2) - 16);
  doc.text(mpLines, col1X + 12, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('TIPO:', col2X, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text('Precedente Judicial Vinculante', col2X + 16, metaY);

  metaY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text('MATERIA:', col1X, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  const temaLines = doc.splitTextToSize(cleanText(summary.temaPrincipal), contentWidth - 28);
  doc.text(temaLines[0] || cleanText(summary.temaPrincipal), col1X + 18, metaY);

  y += metaBoxHeight + 6;

  // 3. Problema Jurídico
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('1. PROBLEMA JURÍDICO PLANTEADO', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  const probLines = doc.splitTextToSize(`"${cleanText(summary.problemaJuridico)}"`, contentWidth - 4);
  doc.text(probLines, margin + 2, y);
  y += (probLines.length * 4.4) + 6;

  // 4. RATIO DECIDENDI (Criterio Vinculante - Destacado)
  const ratioText = cleanText(summary.ratioDecidendi);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const ratioLines = doc.splitTextToSize(ratioText, contentWidth - 12);
  const ratioBoxHeight = (ratioLines.length * 4.4) + 14;

  checkPageBreak(ratioBoxHeight + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text('2. RATIO DECIDENDI (REGLA DE DERECHO VINCULANTE)', margin, y);
  y += 4;

  // Caja resaltada para la Ratio Decidendi
  doc.setFillColor(colors.accentBg[0], colors.accentBg[1], colors.accentBg[2]);
  doc.setDrawColor(colors.ratioBorder[0], colors.ratioBorder[1], colors.ratioBorder[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, ratioBoxHeight, 2, 2, 'FD');
  
  // Banda izquierda sólida
  doc.setFillColor(colors.ratioBorder[0], colors.ratioBorder[1], colors.ratioBorder[2]);
  doc.roundedRect(margin, y, 3.5, ratioBoxHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.text('DOCTRINA CONSTITUCIONAL / CRITERIO OBLIGATORIO:', margin + 7, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  doc.text(ratioLines, margin + 7, y + 10);

  y += ratioBoxHeight + 7;

  // 5. Puntos Clave del Fallo
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('3. PUNTOS CLAVE DE LA ARGUMENTACIÓN JURISPRUDENCIAL', margin, y);
  y += 5;

  summary.puntosClave.forEach((punto, index) => {
    const pText = cleanText(punto);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const pLines = doc.splitTextToSize(pText, contentWidth - 10);
    checkPageBreak((pLines.length * 4) + 4);

    // Bullet con número
    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.circle(margin + 2, y - 1, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.text(`${index + 1}.`, margin + 5, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
    doc.text(pLines, margin + 10, y);

    y += (pLines.length * 4) + 2.5;
  });

  y += 4;

  // 6. Sentido de la Decisión / Resuelve
  const decText = cleanText(summary.decision);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const decLines = doc.splitTextToSize(decText, contentWidth - 10);
  const decBoxHeight = (decLines.length * 4.2) + 10;

  checkPageBreak(decBoxHeight + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('4. DECISIÓN Y ÓRDENES PROCESALES (RESUELVE)', margin, y);
  y += 4;

  doc.setFillColor(colors.decisionBg[0], colors.decisionBg[1], colors.decisionBg[2]);
  doc.setDrawColor(colors.decisionBorder[0], colors.decisionBorder[1], colors.decisionBorder[2]);
  doc.roundedRect(margin, y, contentWidth, decBoxHeight, 2, 2, 'FD');
  doc.setFillColor(colors.decisionBorder[0], colors.decisionBorder[1], colors.decisionBorder[2]);
  doc.roundedRect(margin, y, 3, decBoxHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  doc.text(decLines, margin + 6, y + 6);

  y += decBoxHeight + 6;

  // 7. Normas Aplicadas y Precedentes Citados
  if (
    (summary.normasAplicadas && summary.normasAplicadas.length > 0) ||
    (summary.precedentesCitados && summary.precedentesCitados.length > 0)
  ) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('5. MARCO NORMATIVO Y LÍNEA JURISPRUDENCIAL', margin, y);
    y += 5;

    if (summary.normasAplicadas && summary.normasAplicadas.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
      doc.text('NORMAS APLICADAS:', margin + 2, y);
      y += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
      const normasText = summary.normasAplicadas.map(n => cleanText(n)).join('  •  ');
      const normLines = doc.splitTextToSize(normasText, contentWidth - 4);
      doc.text(normLines, margin + 2, y);
      y += (normLines.length * 3.8) + 3;
    }

    if (summary.precedentesCitados && summary.precedentesCitados.length > 0) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
      doc.text('PRECEDENTES Y LÍNEA JURISPRUDENCIAL CITADA:', margin + 2, y);
      y += 3.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      const precText = summary.precedentesCitados.map(p => cleanText(p)).join('  •  ');
      const precLines = doc.splitTextToSize(precText, contentWidth - 4);
      doc.text(precLines, margin + 2, y);
      y += (precLines.length * 3.8) + 3;
    }
  }

  // Cita Bibliográfica sugerida en Normas APA 7.ª Edición
  const apaCitation = generateApaCitationFromSummary(summary);
  const apaText = cleanText(apaCitation.bibliographicReference);
  const apaParenthetical = cleanText(apaCitation.inTextParenthetical);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const apaLines = doc.splitTextToSize(apaText, contentWidth - 10);
  const apaBoxHeight = (apaLines.length * 3.8) + 16;

  checkPageBreak(apaBoxHeight + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text('CITA BIBLIOGRÁFICA SUGERIDA (NORMAS APA 7.ª EDICIÓN)', margin, y);
  y += 4;

  doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
  doc.setDrawColor(colors.borderMuted[0], colors.borderMuted[1], colors.borderMuted[2]);
  doc.roundedRect(margin, y, contentWidth, apaBoxHeight, 2, 2, 'FD');
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(margin, y, 2.5, apaBoxHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
  doc.text(apaLines, margin + 5, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
  doc.text(`Cita en el texto: ${apaParenthetical}`, margin + 5, y + apaBoxHeight - 3.5);

  y += apaBoxHeight + 6;

  // 8. Obiter Dicta (si está habilitado y presente)
  if (includeObiterDicta && summary.obiterDicta) {
    const obiterText = cleanText(summary.obiterDicta);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const obiterLines = doc.splitTextToSize(obiterText, contentWidth - 6);
    checkPageBreak((obiterLines.length * 3.8) + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text('6. OBITER DICTA (CONSIDERACIONES COMPLEMENTARIAS)', margin, y);
    y += 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    doc.text(obiterLines, margin + 2, y);
    y += (obiterLines.length * 3.8) + 4;
  }

  // 9. Notas del Usuario / Caso Concreto (si las hubiere)
  if (notes.trim()) {
    const notesText = cleanText(notes);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(notesText, contentWidth - 8);
    checkPageBreak((noteLines.length * 4) + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('NOTAS ESTRATÉGICAS DEL CASO:', margin, y);
    y += 4;

    doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
    doc.setDrawColor(colors.borderMuted[0], colors.borderMuted[1], colors.borderMuted[2]);
    doc.roundedRect(margin, y, contentWidth, (noteLines.length * 4) + 6, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colors.textMain[0], colors.textMain[1], colors.textMain[2]);
    doc.text(noteLines, margin + 4, y + 4.5);
    y += (noteLines.length * 4) + 10;
  }

  // 10. Numeración y Pie de Página en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Línea divisoria pie de página
    doc.setDrawColor(colors.borderMuted[0], colors.borderMuted[1], colors.borderMuted[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    
    // Texto izquierdo
    doc.text(
      `LegisAI Colombia • Ficha Jurisprudencial ${cleanText(summary.radicado)}`,
      margin,
      pageHeight - 7
    );

    // Texto derecho (Paginación)
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // 11. Generar nombre de archivo y descargar
  const sanitizedRadicado = summary.radicado
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 45);

  const filename = `Ficha_Jurisprudencial_${sanitizedRadicado}.pdf`;
  doc.save(filename);
}
