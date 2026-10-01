import { LegalCaseDetails, CaseMilestone } from '../../types';

// Banco de expedientes con hitos cronológicos estructurados
export const CASE_DETAILS_MOCK: Record<string, LegalCaseDetails> = {
  'doc-1': {
    documentId: 'doc-1',
    radicado: '11001-31-05-015-2022-00342-01',
    expedienteTitulo: 'Proceso Ordinario Laboral - Fuero de Salud y Reintegro',
    demandante: 'Dr. Carlos Eduardo Restrepo M.',
    demandado: 'Consorcio Vial Andino S.A.S.',
    cuantia: '$148.500.000 COP',
    despachoActual: 'Corte Suprema de Justicia - Sala de Casación Laboral',
    estadoProcesal: 'Sentencia de Casación Notificada',
    fechaInicio: '15 de Enero de 2022',
    temaJuridico: 'Estabilidad Laboral Reforzada (Art. 26 Ley 361 de 1997)',
    milestones: [
      {
        id: 'ms-1',
        date: '2022-01-15',
        displayDate: '15 Ene 2022',
        title: 'Presentación y Radicación de la Demanda Ordinaria',
        type: 'DEMANDA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'Se interpone demanda ordinaria laboral solicitando la ineficacia del despido sin autorización previa del Ministerio del Trabajo, reintegro al cargo y pago de salarios dejados de percibir.',
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: [
          { name: 'Demanda_Inicial_Subsanada.pdf', size: '2.4 MB', type: 'PDF' },
          { name: 'Poder_Conferido.pdf', size: '420 KB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-2',
        date: '2022-02-28',
        displayDate: '28 Feb 2022',
        title: 'Auto Admisorio de la Demanda y Traslado al Empleador',
        type: 'AUTO_ADMISION',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'El Juzgado admite la demanda tras constatar el lleno de requisitos del Art. 25 del C.P.T. y ordena correr traslado a la parte demandada por 10 días.',
        outcome: 'FAVORABLE',
        isCritical: false
      },
      {
        id: 'ms-3',
        date: '2022-08-14',
        displayDate: '14 Ago 2022',
        title: 'Dictamen Pericial de Pérdida de Capacidad Laboral (PCL)',
        type: 'DICTAMEN_PERICIAL',
        instance: 'Primera Instancia',
        authority: 'Junta Regional de Calificación de Invalidez de Bogotá',
        description: 'Se allega dictamen pericial determinando una pérdida de capacidad laboral del 38.5% de origen común con fecha de estructuración previa a la terminación contractual.',
        rulingExcerpt: 'El trabajador presentaba limitación física moderada conocida por el empleador con anterioridad a la carta de terminación unilateral.',
        outcome: 'FAVORABLE',
        isCritical: true,
        attachments: [
          { name: 'Dictamen_JRCI_Bogota_38_5.pdf', size: '1.8 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-4',
        date: '2022-11-22',
        displayDate: '22 Nov 2022',
        title: 'Fallo de Primera Instancia: Sentencia Declarativa',
        type: 'FALLO_PRIMERA_INSTANCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'El despacho acoge las pretensiones de la demanda. Declara la ineficacia del despido, ordena el reintegro y condena a la indemnización de 180 días de salario.',
        rulingExcerpt: 'Se demostró que la desvinculación se produjo mediando situación de debilidad manifiesta sin autorización del inspector del trabajo.',
        outcome: 'FAVORABLE',
        isCritical: true,
        attachments: [
          { name: 'Sentencia_Primera_Instancia_J15Lab.pdf', size: '3.1 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-5',
        date: '2023-01-18',
        displayDate: '18 Ene 2023',
        title: 'Recurso de Apelación Interpuesto por la Empresa',
        type: 'APELACION',
        instance: 'Segunda Instancia',
        authority: 'Tribunal Superior de Bogotá - Sala Laboral',
        description: 'La apoderada de la parte demandada interpone y sustenta recurso de alzada, argumentando justa causa por cierre técnico de faena y ausencia de nexo causal discriminatorio.',
        outcome: 'EN_TRAMITE',
        isCritical: false
      },
      {
        id: 'ms-6',
        date: '2023-09-05',
        displayDate: '05 Sep 2023',
        title: 'Fallo de Segunda Instancia: Revocatoria Parcial',
        type: 'FALLO_SEGUNDA_INSTANCIA',
        instance: 'Segunda Instancia',
        authority: 'Tribunal Superior de Bogotá - Sala Laboral',
        description: 'El Tribunal revoca la orden de reintegro por considerarlo improcedente ante liquidación de la obra, pero mantiene condena indemnizatoria con deducción de prestaciones.',
        rulingExcerpt: 'No procede la reincorporación al haberse clausurado la unidad de explotación económica del contrato.',
        outcome: 'PARCIAL',
        isCritical: true,
        attachments: [
          { name: 'Sentencia_Segunda_Instancia_Tribunal.pdf', size: '2.9 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-7',
        date: '2023-11-10',
        displayDate: '10 Nov 2023',
        title: 'Interposición de Recurso Extraordinario de Casación',
        type: 'RECURSO_CASACION',
        instance: 'Corte Suprema',
        authority: 'Corte Suprema de Justicia - Sala de Casación Laboral',
        description: 'El apoderado judicial del demandante presenta demanda de casación alegando violación de la ley sustancial por interpretación errónea del artículo 26 de la Ley 361 de 1997.',
        outcome: 'EN_TRAMITE',
        isCritical: true
      },
      {
        id: 'ms-8',
        date: '2024-08-18',
        displayDate: '18 Ago 2024',
        title: 'Sentencia de Casación SL2845-2024 (Hito Jurisprudencial)',
        type: 'SENTENCIA_CASACION',
        instance: 'Corte Suprema',
        authority: 'Corte Suprema de Justicia - M.P. Dr. Gerardo Botero Zuluaga',
        description: 'CASA PARCIALMENTE el fallo del Tribunal. Reitera que el cierre parcial o terminación de obra no exonera al patrono de acudir al Ministerio del Trabajo cuando concurre estado de salud disminuido, ordenando el reintegro a plaza equivalente.',
        rulingExcerpt: 'El fuero de estabilidad laboral reforzada trasciende la mera expiración del plazo o culminación de faena cuando no medió aval del inspector laboral.',
        outcome: 'FAVORABLE',
        isCritical: true,
        linkedSentencia: {
          providencia: 'Sentencia SL2845-2024',
          radicado: 'Rad. 98124',
          magistradoPonente: 'Dr. Gerardo Botero Zuluaga',
          chamber: 'Sala de Casación Laboral',
          impactLabel: 'Reiteración y Precisión Vinculante'
        },
        attachments: [
          { name: 'Sentencia_CSJ_SL2845_2024_Integra.pdf', size: '4.7 MB', type: 'PDF' }
        ]
      }
    ]
  },
  'doc-2': {
    documentId: 'doc-2',
    radicado: '11001-02-30-000-2023-00512-00',
    expedienteTitulo: 'Casación Penal - Prescripción y Suspensión de Términos',
    demandante: 'Fiscalía General de la Nación - Delegada ante Tribunal',
    demandado: 'Exsecretario de Infraestructura Municipal',
    cuantia: 'N/A (Proceso Penal)',
    despachoActual: 'Corte Suprema de Justicia - Sala de Casación Penal',
    estadoProcesal: 'Sentencia de Fondo Notificada',
    fechaInicio: '10 de Marzo de 2021',
    temaJuridico: 'Prescripción de la Acción Penal en Servidores Públicos (Ley 906 de 2004)',
    milestones: [
      {
        id: 'ms-p1',
        date: '2021-03-10',
        displayDate: '10 Mar 2021',
        title: 'Audiencia de Formulación de Imputación',
        type: 'AUDIENCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 34 Penal Municipal con Función de Control de Garantías',
        description: 'La Fiscalía imputa los delitos de interés indebido en la celebración de contratos y peculado por apropiación en concurso heterogéneo.',
        outcome: 'EN_TRAMITE',
        isCritical: false
      },
      {
        id: 'ms-p2',
        date: '2022-06-15',
        displayDate: '15 Jun 2022',
        title: 'Audiencia de Formulación de Acusación',
        type: 'AUDIENCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 2 Penal del Circuito Especializado',
        description: 'Se formula pliego acusatorio. La defensa solicita preclusión por extinción de la acción penal alegando transcurso del término legal.',
        outcome: 'DESFAVORABLE',
        isCritical: false
      },
      {
        id: 'ms-p3',
        date: '2023-04-20',
        displayDate: '20 Abr 2023',
        title: 'Fallo Condenatorio de Primera Instancia',
        type: 'FALLO_PRIMERA_INSTANCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 2 Penal del Circuito Especializado',
        description: 'Se condena al acusado a la pena de 64 meses de prisión e inhabilidad para el ejercicio de derechos y funciones públicas.',
        outcome: 'DESFAVORABLE',
        isCritical: true
      },
      {
        id: 'ms-p4',
        date: '2023-11-30',
        displayDate: '30 Nov 2023',
        title: 'Confirmación en Segunda Instancia por el Tribunal',
        type: 'FALLO_SEGUNDA_INSTANCIA',
        instance: 'Segunda Instancia',
        authority: 'Tribunal Superior de Bogotá - Sala Penal',
        description: 'El Tribunal confirma la sentencia condenatoria descartando la tesis de prescripción previa a la acusación.',
        outcome: 'DESFAVORABLE',
        isCritical: true
      },
      {
        id: 'ms-p5',
        date: '2024-07-31',
        displayDate: '31 Jul 2024',
        title: 'Sentencia de Casación SP3120-2024 (Precedente Vinculante)',
        type: 'SENTENCIA_CASACION',
        instance: 'Corte Suprema',
        authority: 'Corte Suprema de Justicia - M.P. Dr. Gerson Chaverra Castro',
        description: 'NO CASA la sentencia. Unifica el criterio de cómputo para la prescripción de la acción penal en servidores públicos tras la imputación en delitos contra la administración pública.',
        rulingExcerpt: 'El incremento del término prescriptivo opera de pleno derecho respecto de delitos contra el erario aun cuando concluya el ejercicio del cargo.',
        outcome: 'FAVORABLE',
        isCritical: true,
        linkedSentencia: {
          providencia: 'Sentencia SP3120-2024',
          radicado: 'Rad. 62104',
          magistradoPonente: 'Dr. Gerson Chaverra Castro',
          chamber: 'Sala de Casación Penal',
          impactLabel: 'Doctrina Vinculante de Casación Penal'
        }
      }
    ]
  },
  'exp-1': {
    documentId: 'exp-1',
    radicado: '11001-31-05-015-2022-00342-01',
    expedienteTitulo: 'Proceso Ordinario Laboral - Fuero de Salud y Reintegro',
    demandante: 'Dr. Carlos Eduardo Restrepo M.',
    demandado: 'Consorcio Vial Andino S.A.S.',
    cuantia: '$148.500.000 COP',
    despachoActual: 'Corte Suprema de Justicia - Sala de Casación Laboral',
    estadoProcesal: 'Sentencia de Casación Notificada',
    fechaInicio: '15 de Enero de 2022',
    temaJuridico: 'Estabilidad Laboral Reforzada (Art. 26 Ley 361 de 1997)',
    milestones: [
      {
        id: 'ms-e1-1',
        date: '2022-01-15',
        displayDate: '15 Ene 2022',
        title: 'Presentación y Radicación de la Demanda Ordinaria',
        type: 'DEMANDA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'Se interpone demanda ordinaria laboral solicitando la ineficacia del despido sin autorización previa del Ministerio del Trabajo, reintegro al cargo y pago de salarios dejados de percibir.',
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: [
          { name: 'Demanda_Inicial_Subsanada.pdf', size: '2.4 MB', type: 'PDF' },
          { name: 'Poder_Especial_Casacion.pdf', size: '1.0 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e1-2',
        date: '2022-02-28',
        displayDate: '28 Feb 2022',
        title: 'Auto Admisorio de la Demanda y Traslado al Empleador',
        type: 'AUTO_ADMISION',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'El Juzgado admite la demanda tras constatar el lleno de requisitos del Art. 25 del C.P.T. y ordena correr traslado a la parte demandada por 10 días.',
        outcome: 'FAVORABLE',
        isCritical: false
      },
      {
        id: 'ms-e1-3',
        date: '2022-08-14',
        displayDate: '14 Ago 2022',
        title: 'Dictamen Pericial de Pérdida de Capacidad Laboral (PCL)',
        type: 'DICTAMEN_PERICIAL',
        instance: 'Primera Instancia',
        authority: 'Junta Regional de Calificación de Invalidez de Bogotá',
        description: 'Se allega dictamen pericial determinando una pérdida de capacidad laboral del 38.5% de origen común con fecha de estructuración previa a la terminación contractual.',
        rulingExcerpt: 'El trabajador presentaba limitación física moderada conocida por el empleador con anterioridad a la carta de terminación unilateral.',
        outcome: 'FAVORABLE',
        isCritical: true,
        attachments: [
          { name: 'Dictamen_JRCI_Bogota_38_5.pdf', size: '1.8 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e1-4',
        date: '2023-03-22',
        displayDate: '22 Mar 2023',
        title: 'Sentencia de Primera Instancia - Reintegro Ordenado',
        type: 'FALLO_PRIMERA_INSTANCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 15 Laboral del Circuito de Bogotá D.C.',
        description: 'Fallo favorable declarando la ineficacia del despido, ordenando reintegro y pago de indemnización de 180 días de salario conforme al Art. 26 Ley 361 de 1997.',
        rulingExcerpt: 'DECLARAR que el despido deviene ineficaz por haberse omitido la autorización expresa del Ministerio del Trabajo.',
        outcome: 'FAVORABLE',
        isCritical: true,
        attachments: [
          { name: 'Sentencia_Primera_Instancia_J15Lab.pdf', size: '3.2 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e1-5',
        date: '2024-09-02',
        displayDate: '02 Sep 2024',
        title: 'Sentencia de Casación Laboral SL2845-2024 (Corte Suprema)',
        type: 'SENTENCIA_CASACION',
        instance: 'Corte Suprema',
        authority: 'Corte Suprema de Justicia - Sala de Casación Laboral',
        description: 'La Sala no casa la sentencia del Tribunal, unificando la doctrina sobre la presunción de despido discriminatorio en trabajadores con dictamen de pérdida de capacidad laboral.',
        rulingExcerpt: 'Reitera la Sala que la protección foral opera ipso jure cuando el empleador conoce la condición médica relevante.',
        outcome: 'FAVORABLE',
        isCritical: true,
        linkedSentencia: {
          providencia: 'Sentencia SL2845-2024',
          radicado: 'Rad. 94812',
          magistradoPonente: 'Dra. Clara Inés López Dávila',
          chamber: 'Sala de Casación Laboral',
          impactLabel: 'Precedente Vinculante Unificado'
        },
        attachments: [
          { name: 'Sentencia_Casacion_SL2845_2024.pdf', size: '4.7 MB', type: 'PDF' }
        ]
      }
    ]
  },
  'exp-2': {
    documentId: 'exp-2',
    radicado: '11001-02-30-000-2023-00512-00',
    expedienteTitulo: 'Casación Penal - Prescripción y Suspensión de Términos',
    demandante: 'Fiscalía General de la Nación - Delegada ante Tribunal',
    demandado: 'Exsecretario de Infraestructura Municipal',
    cuantia: 'N/A (Proceso Penal)',
    despachoActual: 'Corte Suprema de Justicia - Sala de Casación Penal',
    estadoProcesal: 'Sentencia de Fondo Notificada',
    fechaInicio: '10 de Marzo de 2021',
    temaJuridico: 'Prescripción de la Acción Penal en Servidores Públicos (Ley 906 de 2004)',
    milestones: [
      {
        id: 'ms-e2-1',
        date: '2021-03-10',
        displayDate: '10 Mar 2021',
        title: 'Audiencia de Formulación de Imputación',
        type: 'AUDIENCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 34 Penal Municipal con Control de Garantías',
        description: 'La Fiscalía imputa presuntos delitos de contrato sin cumplimiento de requisitos legales y peculado por apropiación.',
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: [
          { name: 'Acta_Audiencia_Imputacion_Garantias.pdf', size: '890 KB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e2-2',
        date: '2022-06-15',
        displayDate: '15 Jun 2022',
        title: 'Audiencia de Formulación de Acusación',
        type: 'AUDIENCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 2 Penal del Circuito Especializado',
        description: 'Se formula pliego acusatorio formal. La defensa opone prescripción de la acción penal.',
        outcome: 'DESFAVORABLE',
        isCritical: false,
        attachments: [
          { name: 'Pliego_Formulacion_Acusacion_Penal.pdf', size: '2.1 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e2-3',
        date: '2024-08-15',
        displayDate: '15 Ago 2024',
        title: 'Sentencia de Casación Penal SP3120-2024',
        type: 'SENTENCIA_CASACION',
        instance: 'Corte Suprema',
        authority: 'Corte Suprema de Justicia - Sala de Casación Penal',
        description: 'La Corte casa parcialmente la condena, declarando la prescripción de la acción penal respecto al delito subsidiario y recalculando la tasación punitiva.',
        rulingExcerpt: 'Al operar la interrupción y el transcurso del término máximo de prescripción con prescindencia de dilaciones no atribuibles a la defensa.',
        outcome: 'FAVORABLE',
        isCritical: true,
        linkedSentencia: {
          providencia: 'Sentencia SP3120-2024',
          radicado: 'Rad. 58914',
          magistradoPonente: 'Dr. Diego Eugenio Corredor Beltrán',
          chamber: 'Sala de Casación Penal',
          impactLabel: 'Jurisprudencia Relevante en Prescripción'
        },
        attachments: [
          { name: 'Sentencia_SP3120_2024_CSJ_Penal.pdf', size: '3.6 MB', type: 'PDF' }
        ]
      }
    ]
  },
  'exp-3': {
    documentId: 'exp-3',
    radicado: '11001-03-15-000-2024-00120-00',
    expedienteTitulo: 'Acción de Tutela - Debido Proceso Administrativo y MinTrabajo',
    demandante: 'María Fernanda Gómez Parra',
    demandado: 'Ministerio del Trabajo - Dirección Territorial Bogotá',
    cuantia: 'Sin cuantía (Derecho Fundamental)',
    despachoActual: 'Consejo de Estado - Sección Segunda',
    estadoProcesal: 'En Trámite de Fallo',
    fechaInicio: '04 de Junio de 2024',
    temaJuridico: 'Silencio Administrativo y Tutela contra Acto de Trámite',
    milestones: [
      {
        id: 'ms-e3-1',
        date: '2024-06-04',
        displayDate: '04 Jun 2024',
        title: 'Radicación de Escrito de Acción de Tutela',
        type: 'DEMANDA',
        instance: 'Primera Instancia',
        authority: 'Tribunal Administrativo de Cundinamarca - Sección Segunda',
        description: 'Se alega vulneración al debido proceso y derecho de petición por omisión en resolver recurso de apelación dentro del término legal.',
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: [
          { name: 'Escrito_Accion_Tutela_Debido_Proceso.pdf', size: '1.4 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e3-2',
        date: '2024-06-18',
        displayDate: '18 Jun 2024',
        title: 'Fallo de Tutela de Primera Instancia Concedido',
        type: 'FALLO_PRIMERA_INSTANCIA',
        instance: 'Primera Instancia',
        authority: 'Tribunal Administrativo de Cundinamarca',
        description: 'Concede el amparo del derecho de petición y debido proceso, ordenando responder en 48 horas.',
        outcome: 'FAVORABLE',
        isCritical: true
      }
    ]
  },
  'exp-4': {
    documentId: 'exp-4',
    radicado: '05001-31-03-004-2023-00890-00',
    expedienteTitulo: 'Responsabilidad Civil Contractual - Consorcio Hidroeléctrico',
    demandante: 'Seguros del Estado S.A.',
    demandado: 'Constructora Los Andes S.A.S.',
    cuantia: '$820.000.000 COP',
    despachoActual: 'Tribunal Superior de Medellín - Sala Civil',
    estadoProcesal: 'En Práctica de Pruebas',
    fechaInicio: '18 de Octubre de 2023',
    temaJuridico: 'Fuerza Mayor y Exclusiones de Póliza Todo Riesgo',
    milestones: [
      {
        id: 'ms-e4-1',
        date: '2023-10-18',
        displayDate: '18 Oct 2023',
        title: 'Presentación de Demanda Verbal de Mayor Cuantía',
        type: 'DEMANDA',
        instance: 'Primera Instancia',
        authority: 'Juzgado 4 Civil del Circuito de Medellín',
        description: 'Demanda de subrogación contractual de aseguradora por siniestro en obra de infraestructura hidroeléctrica.',
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: [
          { name: 'Demanda_Verbal_Mayor_Cuantia_Seguros.pdf', size: '3.4 MB', type: 'PDF' }
        ]
      },
      {
        id: 'ms-e4-2',
        date: '2024-04-10',
        displayDate: '10 Abr 2024',
        title: 'Dictamen Pericial de Geotecnia e Hidráulica',
        type: 'DICTAMEN_PERICIAL',
        instance: 'Primera Instancia',
        authority: 'Perito Auxiliar de la Justicia',
        description: 'Informe pericial determinando la causa eficiente del deslizamiento y falla estructural del talud.',
        outcome: 'FAVORABLE',
        isCritical: true,
        attachments: [
          { name: 'Informe_Peritaje_Ingenieria_Falla_Talud.pdf', size: '5.1 MB', type: 'PDF' }
        ]
      }
    ]
  }
};

export const SANTA_GEMA_CASE_DETAILS: LegalCaseDetails = {
  documentId: 'exp-1789743909641',
  radicado: '05001-40-03-029-2024-01450-00',
  expedienteTitulo: 'HIPOTECA SANTA GEMA - Proceso Ejecutivo Hipotecario',
  demandante: 'Cesar Augusto Giraldo García',
  demandado: 'Fredy Alonso Gallego Botero',
  cuantia: 'COP 340.000.000',
  despachoActual: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
  estadoProcesal: 'Terminado por Pago Total (Auto 18) - Medidas Levantadas',
  fechaInicio: '24 de Enero de 2024',
  temaJuridico: 'Ejecución con Garantía Real Hipotecaria (Art. 468 CGP), Avalúo y Terminación por Pago Total (Art. 461 CGP)',
  milestones: [
    {
      id: 'ms-sg-1',
      date: '2024-01-24',
      displayDate: '24 Ene 2024',
      title: 'Presentación de Demanda Ejecutiva con Garantía Hipotecaria',
      type: 'DEMANDA',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'Radicación de la demanda ejecutiva con título hipotecario para la efectividad de la garantía real (Art. 468 del Código General del Proceso) sobre el inmueble ubicado en el sector Santa Gema de Medellín. Se solicita librar mandamiento ejecutivo de pago por capital e intereses moratorios pactados.',
      outcome: 'EN_TRAMITE',
      isCritical: false,
      attachments: [
        { name: '01EscritoDemanda.pdf', size: '19.6 MB', type: 'PDF' },
        { name: '00IndiceElectronico 6.xlsm', size: '194 KB', type: 'XLSM' },
        { name: 'HIPOTECA_SANTA_GEMA.pdf', size: '1.0 MB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-2',
      date: '2024-03-15',
      displayDate: '15 Mar 2024',
      title: 'Auto Interlocutorio que Libra Mandamiento de Pago (Art. 430 C.G.P.)',
      type: 'AUTO_ADMISION',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'El Despacho libra formal mandamiento ejecutivo de pago a favor de la parte acreedora por el capital de la obligación hipotecaria más los intereses comerciales corrientes y moratorios devengados, ordenando la notificación de ley a la parte deudora.',
      rulingExcerpt: 'LIBRAR MANDAMIENTO DE PAGO por la vía ejecutiva de efectividad de la garantía real a favor de la parte ejecutante y en contra del deudor hipotecario.',
      outcome: 'FAVORABLE',
      isCritical: true,
      attachments: [
        { name: '02AutoLibraMandamientoPago.pdf', size: '857 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-3',
      date: '2024-05-20',
      displayDate: '20 May 2024',
      title: 'Decreto e Inscripción de Medida Cautelar de Embargo Hipotecario',
      type: 'AUTO_ADMISION',
      instance: 'Primera Instancia',
      authority: 'Oficina de Registro de Instrumentos Públicos de Medellín (Zona Sur)',
      description: 'Oficio y constancia de inscripción de la medida cautelar de embargo hipotecario sobre el folio de matrícula inmobiliaria del inmueble gravado ubicado en Santa Gema, asegurando la prelación del crédito crediticio.',
      outcome: 'FAVORABLE',
      isCritical: false,
      attachments: [
        { name: '03OficioInstrumentos-ConstanciaNotificación.pdf', size: '203 KB', type: 'PDF' },
        { name: '05Memroial20250212DocumentoRegistro.pdf', size: '354 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-4',
      date: '2025-01-24',
      displayDate: '24 Ene 2025',
      title: 'Constancia de Notificación Personal y por Aviso del Mandamiento',
      type: 'AUTO_ADMISION',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'Se allega al expediente la constancia de notificación efectiva del mandamiento de pago al deudor de conformidad con los artículos 291 y 292 del C.G.P., con fijación de términos de traslado procesal.',
      outcome: 'FAVORABLE',
      isCritical: false,
      attachments: [
        { name: '04Memorial20250124ConstanciaNotificacion.pdf', size: '14.6 MB', type: 'PDF' },
        { name: 'MemorialEnvioPoder100826.pdf', size: '264 KB', type: 'PDF' },
        { name: 'MemorialPoderEspecial100826.pdf', size: '220 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-5',
      date: '2025-02-18',
      displayDate: '18 Feb 2025',
      title: 'Auto que Ordena Seguir Adelante la Ejecución (Art. 440 C.G.P.)',
      type: 'FALLO_PRIMERA_INSTANCIA',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'Habiendo vencido el término de traslado legal sin formulación de excepciones de mérito por el deudor, el juzgado profiere auto ordenando seguir adelante la ejecución, practicar la liquidación del crédito y avaluar el predio para remate judicial.',
      rulingExcerpt: 'ORDENAR SEGUIR ADELANTE LA EJECUCIÓN en los términos del mandamiento de pago proferido. Disponer la práctica del avalúo y la liquidación del crédito.',
      outcome: 'FAVORABLE',
      isCritical: true,
      attachments: [
        { name: '06AutoOrdenaSeguirAdelanteEjecución.pdf', size: '523 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-6',
      date: '2025-03-12',
      displayDate: '12 Mar 2025',
      title: 'Aprobación de Liquidación de Costas y Agencias en Derecho',
      type: 'AUTO_ADMISION',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'El Despacho aprueba la liquidación de costas procesales y fija agencias en derecho de conformidad con el artículo 366 del Código General del Proceso.',
      outcome: 'FAVORABLE',
      isCritical: false,
      attachments: [
        { name: '07AutoLiquidaCostas.pdf', size: '655 KB', type: 'PDF' },
        { name: '02ConstanciaTraslado.pdf', size: '229 KB', type: 'PDF' },
        { name: '01ReporteTitulos.pdf', size: '400 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-7',
      date: '2025-03-27',
      displayDate: '27 Mar 2025',
      title: 'Despacho Comisorio y Diligencia de Secuestro del Inmueble',
      type: 'DICTAMEN_PERICIAL',
      instance: 'Primera Instancia',
      authority: 'Juzgado de Pequeñas Causas y Competencia Múltiple de Medellín (Comisionado)',
      description: 'Diligenciamiento de despacho comisorio N.° 08 para la práctica de la diligencia de secuestro e inventario sobre el inmueble hipotecado en Santa Gema, con designación y posesión formal del secuestre judicial.',
      outcome: 'FAVORABLE',
      isCritical: true,
      attachments: [
        { name: '08OficioDespachoComisorio-ConstanciaEnvio.pdf', size: '690 KB', type: 'PDF' },
        { name: '09ActaRepartoOE.pdf', size: '363 KB', type: 'PDF' },
        { name: '09Memorial20250327Confirmaciondeligencia.pdf', size: '1.3 MB', type: 'PDF' },
        { name: '10Comaprtelink19092025.pdf', size: '134 KB', type: 'PDF' },
        { name: '11MemorialRemisionComision300725.pdf', size: '376 KB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-8',
      date: '2025-08-19',
      displayDate: '19 Ago 2025',
      title: 'Informe de Gestión del Secuestre y Certificación de Abonos',
      type: 'DICTAMEN_PERICIAL',
      instance: 'Primera Instancia',
      authority: 'Auxiliar de la Justicia (Secuestre) / Juzgado 29 de Ejecución',
      description: 'Se rinde informe de administración y custodia del bien raíz secuestrado, allegando certificación bancaria de abonos extraordinarios efectuados por el demandado para amortización de intereses y capital.',
      outcome: 'FAVORABLE',
      isCritical: false,
      attachments: [
        { name: '12MemorialInforme140825.pdf', size: '765 KB', type: 'PDF' },
        { name: '13MemorialInformeAbonos190825.pdf', size: '20.3 MB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-9',
      date: '2025-11-24',
      displayDate: '24 Nov 2025',
      title: 'Dictamen Pericial de Avalúo Comercial del Inmueble Hipotecado',
      type: 'DICTAMEN_PERICIAL',
      instance: 'Primera Instancia',
      authority: 'Perito Avaluador Adscrito a la Lonja de Propiedad Raíz',
      description: 'Se allega dictamen pericial con el avalúo comercial técnico del predio hipotecado en Santa Gema, fijando su valor de mercado en COP 340.000.000 para servir de postura en el remate judicial.',
      rulingExcerpt: 'Se aprueba el avalúo comercial del bien objeto de garantía real hipotecaria por valor de $340.000.000 COP, ajustado a los métodos de reposición y comparación de mercado.',
      outcome: 'FAVORABLE',
      isCritical: true,
      attachments: [
        { name: '14MemorialAportaAvaluo241125.pdf', size: '7.4 MB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-10',
      date: '2026-03-10',
      displayDate: '10 Mar 2026',
      title: 'Certificación de Paz y Salvo Total y Memorial de Terminación',
      type: 'AUTO_ADMISION',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'El apoderado de la entidad ejecutante y la parte ejecutada presentan paz y salvo definitivo por pago integral de capital, intereses corrientes, moratorios y costas, solicitando dar por terminado el proceso ejecutivo.',
      outcome: 'FAVORABLE',
      isCritical: true,
      attachments: [
        { name: '15MemorialPazySalvo09032026.pdf', size: '253 KB', type: 'PDF' },
        { name: '16MemorialTerminacionMora10032026.pdf', size: '9.8 MB', type: 'PDF' },
        { name: '17MemorialSolTerminación280526.pdf', size: '177 KB', type: 'PDF' },
        { name: 'MemorialCuentasDefinitaivas240826.pdf', size: '6.1 MB', type: 'PDF' }
      ]
    },
    {
      id: 'ms-sg-11',
      date: '2026-05-28',
      displayDate: '28 May 2026',
      title: 'Auto Definitivo de Terminación por Pago Total y Cancelación de Hipoteca (Art. 461 C.G.P.)',
      type: 'FALLO_PRIMERA_INSTANCIA',
      instance: 'Primera Instancia',
      authority: 'Juzgado 29 Civil Municipal de Ejecución de Sentencias de Medellín',
      description: 'El Despacho declara formalmente terminado el proceso ejecutivo con garantía real hipotecaria por pago total de la obligación (Art. 461 C.G.P.). Ordena el levantamiento de la medida cautelar de embargo, la cancelación de la hipoteca ante la Oficina de Registro de Instrumentos Públicos de Medellín, desglose de títulos ejecutivos y el archivo definitivo del expediente judicial.',
      rulingExcerpt: 'PRIMERO: DECLARAR TERMINADO el presente proceso ejecutivo hipotecario por haberse acreditado el PAGO TOTAL de la obligación demandada (Art. 461 C.G.P.). SEGUNDO: ORDENAR el levantamiento del embargo y la cancelación de la hipoteca sobre el inmueble en Santa Gema. TERCERO: ARCHIVAR definitivamente las diligencias.',
      outcome: 'FAVORABLE',
      isCritical: true,
      linkedSentencia: {
        providencia: 'Auto Interlocutorio N.° 18 de 2026',
        radicado: 'Rad. 05001-40-03-029-2024-01450-00',
        magistradoPonente: 'Juez 29 Civil Municipal de Ejecución de Medellín',
        chamber: 'Juzgado Civil Municipal de Ejecución',
        impactLabel: 'Decisión de Fondo - Terminación Procesal'
      },
      attachments: [
        { name: '18AutoTerminaOtrosI.pdf', size: '955 KB', type: 'PDF' }
      ]
    }
  ]
};

// Generador de cronología adaptada para cualquier expediente no registrado
export const getOrGenerateCaseDetails = (
  docId: string,
  docName: string,
  expediente?: any | null,
  documents?: any[]
): LegalCaseDetails => {
  const lowerName = (docName || '').toLowerCase();
  const lowerId = (docId || '').toLowerCase();
  const expTitle = (expediente?.titulo || '').toLowerCase();

  if (
    lowerId.includes('exp-1789743909641') ||
    lowerId.includes('doc-1789743909644') ||
    lowerName.includes('santa gema') ||
    lowerName.includes('hipoteca') ||
    expTitle.includes('santa gema') ||
    expTitle.includes('hipoteca') ||
    CASE_DETAILS_MOCK['exp-1789743909641']
  ) {
    const base = SANTA_GEMA_CASE_DETAILS;
    if (expediente) {
      return {
        ...base,
        radicado: expediente.radicado || base.radicado,
        expedienteTitulo: expediente.titulo || base.expedienteTitulo,
        demandante: expediente.demandante || base.demandante,
        demandado: expediente.demandado || base.demandado,
        despachoActual: expediente.despacho || base.despachoActual,
        estadoProcesal: expediente.estado || base.estadoProcesal,
        cuantia: expediente.cuantia || base.cuantia,
        fechaInicio: expediente.fechaInicio || base.fechaInicio,
        temaJuridico: expediente.temaJuridico || base.temaJuridico
      };
    }
    return base;
  }

  if (CASE_DETAILS_MOCK[docId]) {
    const base = CASE_DETAILS_MOCK[docId];
    if (expediente) {
      return {
        ...base,
        radicado: expediente.radicado || base.radicado,
        expedienteTitulo: expediente.titulo || base.expedienteTitulo,
        demandante: expediente.demandante || base.demandante,
        demandado: expediente.demandado || base.demandado,
        despachoActual: expediente.despacho || base.despachoActual,
        estadoProcesal: expediente.estado || base.estadoProcesal,
        cuantia: expediente.cuantia || base.cuantia,
        fechaInicio: expediente.fechaInicio || base.fechaInicio,
        temaJuridico: expediente.temaJuridico || base.temaJuridico
      };
    }
    return base;
  }

  // Si el expediente o documento tiene nombre de demanda o sentencia, generar hitos realistas
  const isLaboral = lowerName.includes('laboral') || lowerName.includes('sl') || lowerName.includes('salud');
  const isPenal = lowerName.includes('penal') || lowerName.includes('sp') || lowerName.includes('corrupcion');

  const chamber = isPenal ? 'Sala de Casación Penal' : (isLaboral ? 'Sala de Casación Laboral' : 'Sala de Casación Civil');
  const tema = isPenal ? 'Prescripción y Debido Proceso Penal' : (isLaboral ? 'Estabilidad Ocupacional y Fuero Laboral' : 'Responsabilidad Contractual y Extracontractual');

  return {
    documentId: docId,
    radicado: expediente?.radicado || `11001-31-00-001-2023-${Math.floor(10000 + Math.random() * 90000)}-01`,
    expedienteTitulo: expediente?.titulo || docName.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
    demandante: expediente?.demandante || 'Parte Procesal Convocante / Actora',
    demandado: expediente?.demandado || 'Parte Demandada / Vinculada',
    cuantia: expediente?.cuantia || '$85.000.000 COP',
    despachoActual: expediente?.despacho || `Corte Suprema de Justicia - ${chamber}`,
    estadoProcesal: expediente?.estado || 'En Trámite de Casación / Notificación',
    fechaInicio: expediente?.fechaInicio || '12 de Febrero de 2023',
    temaJuridico: expediente?.temaJuridico || tema,
    milestones: [
      {
        id: `gen-1-${docId}`,
        date: '2023-02-12',
        displayDate: '12 Feb 2023',
        title: 'Radicación del Escrito Inicial y Reparto Judicial',
        type: 'DEMANDA',
        instance: 'Primera Instancia',
        authority: expediente?.despacho || 'Juzgado de Origen del Circuito Judicial',
        description: `Se presenta demanda formal correspondiente al expediente "${docName || expediente?.titulo || 'Judicial'}" para dar inicio a la etapa probatoria y de alegatos.`,
        outcome: 'EN_TRAMITE',
        isCritical: false,
        attachments: documents && documents.length > 0 ? documents.slice(0, 3).map(d => ({ name: d.name, size: `${(d.size / 1024 / 1024).toFixed(1)} MB`, type: d.type.toUpperCase() })) : undefined
      },
      {
        id: `gen-2-${docId}`,
        date: '2023-06-25',
        displayDate: '25 Jun 2023',
        title: 'Audiencia de Juzgamiento y Práctica de Pruebas',
        type: 'AUDIENCIA',
        instance: 'Primera Instancia',
        authority: expediente?.despacho || 'Juzgado de Origen del Circuito Judicial',
        description: 'Se evacúan los testimonios, dictámenes periciales y pruebas documentales allegadas por las partes.',
        outcome: 'FAVORABLE',
        isCritical: false
      },
      {
        id: `gen-3-${docId}`,
        date: '2023-11-18',
        displayDate: '18 Nov 2023',
        title: 'Sentencia de Primera Instancia',
        type: 'FALLO_PRIMERA_INSTANCIA',
        instance: 'Primera Instancia',
        authority: 'Juzgado del Circuito',
        description: 'Se profiere decisión de fondo resolviendo las excepciones de mérito planteadas.',
        outcome: 'FAVORABLE',
        isCritical: true
      },
      {
        id: `gen-4-${docId}`,
        date: '2024-05-10',
        displayDate: '10 May 2024',
        title: 'Sentencia de Segunda Instancia del Tribunal Superior',
        type: 'FALLO_SEGUNDA_INSTANCIA',
        instance: 'Segunda Instancia',
        authority: 'Tribunal Superior de Distrito Judicial',
        description: 'La Sala del Tribunal desata el recurso de alzada interpuesto por la contraparte.',
        outcome: 'PARCIAL',
        isCritical: true
      },
      {
        id: `gen-5-${docId}`,
        date: '2024-09-02',
        displayDate: '02 Sep 2024',
        title: 'Sentencia de Casación Vinculada',
        type: 'SENTENCIA_CASACION',
        instance: 'Corte Suprema',
        authority: `Corte Suprema de Justicia - ${chamber}`,
        description: 'Providencia judicial de casación proferida por la Corte Suprema fijando la línea jurisprudencial definitiva.',
        rulingExcerpt: 'Fija el alcance doctrinal de la institución jurídica conforme a la jurisprudencia unificada de la Sala.',
        outcome: 'FAVORABLE',
        isCritical: true,
        linkedSentencia: {
          providencia: isPenal ? 'Sentencia SP3120-2024' : 'Sentencia SL2845-2024',
          radicado: 'Rad. 98124',
          magistradoPonente: 'Magistrado Ponente CSJ',
          chamber: chamber,
          impactLabel: 'Precedente Vinculante'
        }
      }
    ]
  };
};
