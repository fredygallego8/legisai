import { ResearchTopic, SupremeCourtAlert, ExecutiveSummaryData } from '../../types';

const TOPICS_STORAGE_KEY = 'legisai_saved_research_topics';
const ALERTS_STORAGE_KEY = 'legisai_supreme_court_alerts';

export const INITIAL_RESEARCH_TOPICS: ResearchTopic[] = [
  {
    id: 'topic-laboral-1',
    name: 'Estabilidad Laboral Reforzada y Fuero de Salud',
    chamber: 'SALA_LABORAL',
    chamberLabel: 'Sala de Casación Laboral',
    keywords: ['fuero de salud', 'artículo 26 Ley 361 de 1997', 'autorización MinTrabajo', 'despido discriminatorio', 'pérdida de capacidad laboral'],
    description: 'Seguimiento de unificación entre Sala Laboral CSJ y Corte Constitucional sobre necesidad de permiso del Ministerio del Trabajo.',
    isActive: true,
    createdAt: '2025-01-10'
  },
  {
    id: 'topic-penal-1',
    name: 'Prescripción Penal en Delitos de Corrupción',
    chamber: 'SALA_PENAL',
    chamberLabel: 'Sala de Casación Penal',
    keywords: ['prescripción de la acción penal', 'peculado', 'celebración indebida de contratos', 'interrupción de términos', 'Ley 906 de 2004'],
    description: 'Cómputo de términos prescriptivos tras formulación de imputación en servidores públicos.',
    isActive: true,
    createdAt: '2025-01-14'
  },
  {
    id: 'topic-civil-1',
    name: 'Responsabilidad Civil Médica y Baremos de Indemnización',
    chamber: 'SALA_CIVIL',
    chamberLabel: 'Sala de Casación Civil y Agraria',
    keywords: ['responsabilidad médica', 'daño corporal', 'baremo indemnizatorio', 'pérdida de oportunidad', 'daño a la salud'],
    description: 'Criterios actuariales para tasación de perjuicios extrapatrimoniales y daño emergente.',
    isActive: true,
    createdAt: '2025-01-20'
  },
  {
    id: 'topic-laboral-2',
    name: 'Contrato Realidad en Contratación de Prestación de Servicios',
    chamber: 'SALA_LABORAL',
    chamberLabel: 'Sala de Casación Laboral',
    keywords: ['contrato realidad', 'subordinación continua', 'prestación de servicios', 'solidaridad patronal'],
    description: 'Configuración de la relación laboral encubierta bajo contratos de prestación de servicios.',
    isActive: true,
    createdAt: '2025-02-01'
  }
];

export const INITIAL_SUPREME_COURT_ALERTS: SupremeCourtAlert[] = [
  {
    id: 'csj-alert-sl2845-2024',
    topicId: 'topic-laboral-1',
    topicName: 'Estabilidad Laboral Reforzada y Fuero de Salud',
    providencia: 'Sentencia SL2845-2024',
    radicado: 'Radicación N° 98124',
    chamber: 'SALA_LABORAL',
    chamberLabel: 'Sala de Casación Laboral',
    magistradoPonente: 'Dr. Gerardo Botero Zuluaga',
    fecha: '18 de Agosto de 2024',
    urgency: 'HIGH',
    relevanceScore: 98,
    impactOnPrecedent: 'PRECISION_DOCTRINAL',
    temaPrincipal: 'Estabilidad ocupacional reforzada: distinción probatoria entre discapacidad manifiesta y simples afecciones transitorias',
    sintesis: 'La Sala Laboral de la Corte Suprema precisó que la protección del artículo 26 de la Ley 361 de 1997 exige acreditación de limitación física, psíquica o sensorial relevante al momento del despido, y no ampara cualquier afección común superada.',
    problemaJuridico: '¿El empleador incurre en despido ineficaz al desvincular a un trabajador con recomendaciones ergonómicas temporales sin requerir permiso previo de la cartera de trabajo, cuando no existía dictamen de pérdida de capacidad laboral relevante?',
    ratioDecidendi: 'La Sala de Casación Laboral itera que para activar la presunción de despido discriminatorio y la sanción del artículo 26 de la Ley 361/1997, no basta la sola existencia de un diagnóstico médico o incapacidades pretéritas; es imperativo que el trabajador se halle en una condición de debilidad manifiesta conocida por el empleador, con una limitación moderada, severa o profunda que le impida el desempeño regular de sus labores.',
    decision: 'NO CASA la sentencia del Tribunal Superior que había absuelto a la empresa demandada, confirmando la legalidad del despido por no configurarse condición de invalidez o minusvalía protegida.',
    normasAplicadas: ['Ley 361 de 1997 (Art. 26)', 'Código Sustantivo del Trabajo (Art. 62)', 'Constitución Política (Art. 13, 53)'],
    puntosClave: [
      'La simple asistencia a citas médicas o recomendaciones menores no configuran fuero de salud absoluto.',
      'La carga probatoria recae inicialmente en demostrar la notoriedad de la limitación ante el patrono.',
      'Diferencia explícita con el criterio de tutela de la Corte Constitucional en relación con la suficiencia del carné de incapacidad.'
    ],
    isRead: false,
    isBookmarked: true
  },
  {
    id: 'csj-alert-sp2190-2024',
    topicId: 'topic-penal-1',
    topicName: 'Prescripción Penal en Delitos de Corrupción',
    providencia: 'Sentencia SP2190-2024',
    radicado: 'Radicación N° 63412',
    chamber: 'SALA_PENAL',
    chamberLabel: 'Sala de Casación Penal',
    magistradoPonente: 'Dra. Myriam Ávila Roldán',
    fecha: '11 de Septiembre de 2024',
    urgency: 'HIGH',
    relevanceScore: 95,
    impactOnPrecedent: 'CAMBIO_JURISPRUDENCIAL',
    temaPrincipal: 'Términos de prescripción de la acción penal en concurso con servidor público y celebración indebida de contratos',
    sintesis: 'La Sala de Casación Penal unifica la contabilización del término de prescripción extraordinario aplicable a servidores públicos cuando concurren delitos contra la administración y falsedad ideológica.',
    problemaJuridico: '¿Cómo debe computarse el incremento del término de prescripción del artículo 83 del Código Penal cuando el servidor público es copartícipe con intervinientes particulares en delitos contra la administración pública?',
    ratioDecidendi: 'El incremento prescriptivo establecido para servidores públicos por mandato del artículo 83 inciso 5 del Código Penal tiene naturaleza subjetiva e intransferible a los particulares intervinientes, salvo que concurra una autoría mediata o determinación indivisible. En etapa de juicio, el plazo máximo no puede exceder los 3 años contados a partir de la formulación de la acusación.',
    decision: 'DECLARA LA PRESCRIPCIÓN de la acción penal frente al cargo de contrato sin cumplimiento de requisitos legales y ordena la preclusión de la instrucción.',
    normasAplicadas: ['Código Penal (Ley 599 de 2000, Arts. 83 y 86)', 'Ley 906 de 2004 (Arts. 292, 339)', 'Convención Interamericana contra la Corrupción'],
    puntosClave: [
      'La suspensión de la prescripción opera de manera diferenciada para cada coacusado según su estatus funcionarial.',
      'Límite temporal perentorio entre radicación del escrito de acusación e inicio de la audiencia de juicio oral.',
      'Revocatoria de condena de segunda instancia por vencimiento extintivo de la potestad punitiva estatal.'
    ],
    isRead: false,
    isBookmarked: false
  },
  {
    id: 'csj-alert-sc3210-2024',
    topicId: 'topic-civil-1',
    topicName: 'Responsabilidad Civil Médica y Baremos de Indemnización',
    providencia: 'Sentencia SC3210-2024',
    radicado: 'Radicación N° 11001-31-03-014-2018-00432-01',
    chamber: 'SALA_CIVIL',
    chamberLabel: 'Sala de Casación Civil y Agraria',
    magistradoPonente: 'Dr. Octavio Augusto Tejeiro Duque',
    fecha: '02 de Octubre de 2024',
    urgency: 'MEDIUM',
    relevanceScore: 92,
    impactOnPrecedent: 'REITERACION',
    temaPrincipal: 'Criterio de imputación causal en lex artis médica y aplicación del principio de pérdida de oportunidad',
    sintesis: 'La Sala Civil establece que en omisiones de diagnóstico tardío de patologías oncológicas, la indemnización no puede cubrir el 100% de la muerte, sino la probabilidad porcentual objetiva de sobrevida perdida.',
    problemaJuridico: '¿La pérdida de oportunidad diagnóstica configura un daño autónomo cuantificable o debe subsumirse en el daño emergente consolidado de la muerte del paciente?',
    ratioDecidendi: 'La pérdida de oportunidad constituye una tipología autónoma de daño indemnizable caracterizada por la incertidumbre sobre el desenlace fatal frente a la certeza de que el acto médico negligente privó al paciente de una probabilidad real y seria de sobrevida o curación. La cuantía debe tasarse aplicando un porcentaje de probabilidad científica sobre el total del daño material.',
    decision: 'CASA parcialmente la sentencia y condena a la entidad prestadora de salud al pago de 120 SMLMV por pérdida de oportunidad probada del 40%.',
    normasAplicadas: ['Código Civil (Arts. 1613, 1614, 2341, 2356)', 'Ley 23 de 1981 (Ética Médica)'],
    puntosClave: [
      'Diferenciación dogmática entre nexo causal del fallecimiento y nexo con la frustración de curación.',
      'Adopción de baremos técnicos de probabilidad basados en literatura clínica indexada.',
      'Criterios para distribución de cargas probatorias dinámicas en juicios de responsabilidad médica.'
    ],
    isRead: true,
    isBookmarked: true
  },
  {
    id: 'csj-alert-sl3419-2024',
    topicId: 'topic-laboral-2',
    topicName: 'Contrato Realidad en Contratación de Prestación de Servicios',
    providencia: 'Sentencia SL3419-2024',
    radicado: 'Radicación N° 102450',
    chamber: 'SALA_LABORAL',
    chamberLabel: 'Sala de Casación Laboral',
    magistradoPonente: 'Dra. Clara Inés López Dávila',
    fecha: '25 de Septiembre de 2024',
    urgency: 'HIGH',
    relevanceScore: 96,
    impactOnPrecedent: 'CAMBIO_JURISPRUDENCIAL',
    temaPrincipal: 'Presunción del artículo 24 del CST: indicios de subordinación continua mediante asignación de correos corporativos y turnos fijos',
    sintesis: 'Reitera la primacía de la realidad frente a contratos civiles o comerciales sucesivos cuando se demuestra cumplimiento de horarios de guardia, correos institucionales exclusivos y sanciones disciplinarias de hecho.',
    problemaJuridico: '¿La suscripción sucesiva de contratos por prestación de servicios desvirtúa la subordinación laboral cuando el contratista ejecutaba las labores en las sedes físicas y bajo la supervisión directa del personal de planta?',
    ratioDecidendi: 'Una vez demostrada la prestación personal del servicio por la persona natural, la presunción legal del artículo 24 del Código Sustantivo del Trabajo traslada íntegramente al contratante la carga de desvirtuar la subordinación. La apariencia formal de honorarios no neutraliza la subordinación si existen directrices directas, control de permanencia y asunción del riesgo por la contratante.',
    decision: 'CASA la sentencia absolutoria del Tribunal y CONDENA a la empresa al reconocimiento de salarios, cesantías, prima de servicios y sanción moratoria del artículo 65 del CST.',
    normasAplicadas: ['Código Sustantivo del Trabajo (Arts. 22, 23, 24, 65)', 'Constitución Política (Art. 53 - Principio de Primacía de la Realidad)'],
    puntosClave: [
      'Inversión de la carga probatoria ope legis con la sola prueba de la actividad personal.',
      'Condena en solidaridad laboral y sanción moratoria por mala fe patronal al ocultar la relación.',
      'Reconocimiento de aportes pensionales retroactivos al fondo pensional correspondiente.'
    ],
    isRead: false,
    isBookmarked: false
  }
];

export class SupremeCourtAlertsService {
  /**
   * Obtiene los temas de investigación guardados del usuario
   */
  static getTopics(): ResearchTopic[] {
    try {
      const stored = localStorage.getItem(TOPICS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(INITIAL_RESEARCH_TOPICS));
        return INITIAL_RESEARCH_TOPICS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_RESEARCH_TOPICS;
    }
  }

  /**
   * Guarda un nuevo tema de investigación o actualiza uno existente
   */
  static saveTopic(topic: ResearchTopic): ResearchTopic[] {
    const topics = this.getTopics();
    const index = topics.findIndex(t => t.id === topic.id);
    let updated: ResearchTopic[];
    if (index >= 0) {
      updated = [...topics];
      updated[index] = topic;
    } else {
      updated = [topic, ...topics];
    }
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Elimina un tema de investigación guardado
   */
  static deleteTopic(topicId: string): ResearchTopic[] {
    const topics = this.getTopics().filter(t => t.id !== topicId);
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    return topics;
  }

  /**
   * Conmuta el estado activo de un tema
   */
  static toggleTopicActive(topicId: string): ResearchTopic[] {
    const topics = this.getTopics().map(t => {
      if (t.id === topicId) {
        return { ...t, isActive: !t.isActive };
      }
      return t;
    });
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
    return topics;
  }

  /**
   * Obtiene todas las alertas de la Corte Suprema
   */
  static getAlerts(): SupremeCourtAlert[] {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(INITIAL_SUPREME_COURT_ALERTS));
        return INITIAL_SUPREME_COURT_ALERTS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_SUPREME_COURT_ALERTS;
    }
  }

  /**
   * Marca una alerta como leída o no leída
   */
  static markAsRead(alertId: string, isRead = true): SupremeCourtAlert[] {
    const alerts = this.getAlerts().map(a => {
      if (a.id === alertId) {
        return { ...a, isRead };
      }
      return a;
    });
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    return alerts;
  }

  /**
   * Marca todas las alertas como leídas
   */
  static markAllAsRead(): SupremeCourtAlert[] {
    const alerts = this.getAlerts().map(a => ({ ...a, isRead: true }));
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    return alerts;
  }

  /**
   * Conmuta el estado de guardado/favorito de una providencia
   */
  static toggleBookmark(alertId: string): SupremeCourtAlert[] {
    const alerts = this.getAlerts().map(a => {
      if (a.id === alertId) {
        return { ...a, isBookmarked: !a.isBookmarked };
      }
      return a;
    });
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    return alerts;
  }

  /**
   * Descarta / remueve una alerta
   */
  static dismissAlert(alertId: string): SupremeCourtAlert[] {
    const alerts = this.getAlerts().filter(a => a.id !== alertId);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    return alerts;
  }

  /**
   * Simula la sincronización con el boletín de relatoría de la Corte Suprema
   */
  static syncAlerts(): Promise<{ newCount: number; alerts: SupremeCourtAlert[] }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const current = this.getAlerts();
        // Verificar si ya existe la sentencia reciente de casación penal de refuerzo
        const hasLatest = current.some(a => a.id === 'csj-alert-sp4102-2024');
        if (!hasLatest) {
          const freshAlert: SupremeCourtAlert = {
            id: 'csj-alert-sp4102-2024',
            topicId: 'topic-penal-1',
            topicName: 'Prescripción Penal en Delitos de Corrupción',
            providencia: 'Sentencia SP4102-2024',
            radicado: 'Radicación N° 65420',
            chamber: 'SALA_PENAL',
            chamberLabel: 'Sala de Casación Penal',
            magistradoPonente: 'Dr. Hugo Quintero Bernate',
            fecha: '08 de Octubre de 2024',
            urgency: 'HIGH',
            relevanceScore: 99,
            impactOnPrecedent: 'CAMBIO_JURISPRUDENCIAL',
            temaPrincipal: 'Límites constitucionales a la duplicidad de prescripción en delitos de corrupción con servidores públicos desvinculados',
            sintesis: 'La Sala Penal establece que la calidad de servidor público debe ostentarse al momento de la comisión de la conducta para efectos de duplicar la prescripción, sin que quepa extenderla si la función cesó antes de la consumación del tipo penal.',
            problemaJuridico: '¿Opera la duplicación del término de prescripción del artículo 83 del Código Penal cuando el investigado renunció válidamente al cargo público antes de la consolidación de los actos de apropiación?',
            ratioDecidendi: 'El factor de agravación prescriptiva en delitos funcionariales se fundamenta en la infracción del deber de lealtad y custodia patrimonial inherente al ejercicio activo del cargo. Si al momento de los actos materiales de disposición el sujeto ya no ostentaba investidura pública, rige el término ordinario de prescripción de la acción penal.',
            decision: 'CASA la sentencia condenatoria de segundo grado y decreta la extinción de la acción penal por prescripción consumada.',
            normasAplicadas: ['Constitución Política (Art. 29)', 'Código Penal (Arts. 83, 397)', 'Convención Americana sobre Derechos Humanos (Art. 8.1)'],
            puntosClave: [
              'Principio de estricta legalidad en la aplicación de términos prescriptivos agravados.',
              'Inaplicabilidad de la duplicación a ex-servidores públicos cuando la consumación ocurre post-desvinculación.',
              'Garantía al plazo razonable para ser juzgado en investigaciones de corrupción.'
            ],
            isRead: false,
            isBookmarked: false
          };
          const updated = [freshAlert, ...current];
          localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updated));
          resolve({ newCount: 1, alerts: updated });
        } else {
          resolve({ newCount: 0, alerts: current });
        }
      }, 700);
    });
  }

  /**
   * Convierte una alerta de la Corte Suprema en una Ficha Jurisprudencial formal
   * compatible con el exportador a PDF estructurado.
   */
  static toExecutiveSummary(alert: SupremeCourtAlert): ExecutiveSummaryData {
    return {
      radicado: `${alert.providencia} • ${alert.radicado}`,
      corporacion: `Corte Suprema de Justicia de Colombia - ${alert.chamberLabel}`,
      magistradoPonente: alert.magistradoPonente,
      fecha: alert.fecha,
      temaPrincipal: alert.temaPrincipal,
      problemaJuridico: alert.problemaJuridico,
      ratioDecidendi: alert.ratioDecidendi,
      puntosClave: alert.puntosClave,
      decision: alert.decision,
      normasAplicadas: alert.normasAplicadas,
      obiterDicta: `[Sala de Casación] Providencia clasificada con impacto jurisprudencial de ${alert.impactOnPrecedent.replace(/_/g, ' ')}. Relevancia algorítmica para el despacho: ${alert.relevanceScore}% sobre el tema de investigación '${alert.topicName}'.`,
      precedentesCitados: [
        'Corte Suprema de Justicia - Sala Plena',
        `${alert.chamberLabel} (Línea Unificada)`,
        'Constitución Política de Colombia de 1991'
      ]
    };
  }
}
