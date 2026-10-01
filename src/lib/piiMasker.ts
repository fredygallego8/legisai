/**
 * Enmascaramiento de PII antes de la inferencia con Gemini (Brecha 9 · C9.4).
 *
 * Copia adaptada de `navitolegisv3/server/piiMasker.ts` (la versión heredada). Las reglas son
 * las mismas: los dos repos son aplicaciones distintas y no comparten código.
 *
 * Reglas (colombianas):
 *  - Radicado judicial: 23 dígitos con guiones
 *  - Correo electrónico
 *  - NIT: 9–10 dígitos con punto/millares, guión y dígito de verificación
 *  - Teléfono móvil: 3XX XXX XXXX (con o sin +57)
 *  - Dirección: "Calle", "Cra", "Transversal", "Avenida", "Diagonal" + número
 *  - Cédula: 6–10 dígitos (con o sin puntos de millares)
 *  - Nombres: los que la aplicación conoce (partes del expediente), nunca adivinados
 *
 * Funciona en dos pasos:
 *  1. `maskText(text, opciones)` → reemplaza PII por tokens `<PII_TIPO_n>` y devuelve el mapeo
 *  2. `rehydrateText(maskedText, mapping)` → recupera los valores originales
 *
 * Tres decisiones que conviene no deshacer:
 *
 * - **Los nombres no se adivinan.** Un detector de nombres por expresión regular mete en el
 *   mismo saco "Juzgado 29 Civil Municipal" o "Corte Suprema". Se enmascaran solo los que la
 *   aplicación conoce (demandante, demandado), que están en la ficha del expediente.
 * - **Las cuantías no se enmascaran.** El modelo necesita `$340.000.000` para responder. Un
 *   patrón de cédula con puntos de millares lo ocultaría.
 * - **Lo que se enmascara se rehidrata.** En la versión heredada el mapeo se descartaba y, si el
 *   modelo repetía un token, el usuario veía `<PII_NOMBRE_0>` en la respuesta. Aquí el mapeo
 *   vuelve por el mismo camino, incluido el streaming (`makeRehydrator`).
 *
 * SOLO SERVIDOR: el navegador nunca debe recibir el mapeo token → valor.
 */

export type PIIType = 'cedula' | 'nit' | 'direccion' | 'correo' | 'telefono' | 'radicado' | 'nombre';

export interface PIIMapping {
  original: string;
  /** Token de reemplazo, ej. <PII_CEDULA_0> */
  token: string;
  /** Tipo de PII detectado */
  type: PIIType;
}

export interface MaskResult {
  /** Texto con tokens <PII_TIPO_n> */
  masked: string;
  /** Mapeo token → original para rehidratación */
  mapping: PIIMapping[];
}

export interface MaskOptions {
  /** Nombres que la aplicación conoce (partes del expediente). Sin lista, no se tocan nombres. */
  nombres?: string[];
}

/** Un dato con su forma de detectarlo. El orden importa: lo específico primero. */
const PATTERNS: ReadonlyArray<{ type: PIIType; regex: RegExp }> = [
  // Radicado judicial: 23 dígitos. Va antes que la cédula porque contiene grupos de dígitos.
  { type: 'radicado', regex: /\b\d{5}-\d{2}-\d{2}-\d{3}-\d{4}-\d{5}-\d{2}\b/g },
  { type: 'correo', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: 'nit', regex: /\b\d{1,3}(?:\.\d{3})*-\d\b/g },
  { type: 'telefono', regex: /(?:\+57[\s-]?)?\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  {
    type: 'direccion',
    regex:
      /\b(?:Calle|Carrera|Cra|Transversal|Diagonal|Avenida|Av|Circular|Cl|Tv)\s+\.?\s?\d+\s?[a-zA-Z]?(?:\s*(?:#|No\.?|Nro\.?)\s*\d+\s?-?\s?\d*)?/gi,
  },
  // Cédula sin separadores: 6 a 10 dígitos que no sean un año ni formen parte de un número mayor.
  { type: 'cedula', regex: /(?<![\d.,])\b\d{6,10}\b(?!\d)(?!,\d)(?!\.\d)/g },
  // Cédula con puntos de millares: solo si NO es una cifra de dinero (el modelo la necesita) y
  // sin empezar dentro de un número mayor. Hacen falta los dos lookbehind: sin el primero, en
  // "$340.000.000" el motor casaba "000.000" desde dentro y ocultaba la cuantía.
  { type: 'cedula', regex: /(?<![\d.])(?<!\$\s?)\b\d{1,3}(?:\.\d{3}){1,3}\b(?!\d)/g },
];

/**
 * Enmascara PII en un texto. Los tokens reemplazan los valores originales y se devuelve el
 * mapeo para rehidratación.
 */
export function maskText(text: string, opciones: MaskOptions = {}): MaskResult {
  const mapping: PIIMapping[] = [];
  let masked = String(text ?? '');

  const tokenPara = (type: PIIType, original: string): string => {
    const existente = mapping.find((m) => m.original === original && m.type === type);
    if (existente) return existente.token;
    const token = '<PII_' + type.toUpperCase() + '_' + mapping.length + '>';
    mapping.push({ original, token, type });
    return token;
  };

  // Nombres conocidos primero: son los más largos y evitan que un patrón parta el nombre.
  const nombres = (opciones.nombres || [])
    .map((n) => String(n || '').trim())
    .filter((n) => n.length >= 5)
    .sort((a, b) => b.length - a.length);
  for (const nombre of nombres) {
    const regex = new RegExp('\\b' + nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    masked = masked.replace(regex, (encontrado) => tokenPara('nombre', encontrado));
  }

  for (const { type, regex } of PATTERNS) {
    masked = masked.replace(regex, (match) => {
      const valor = match.trim();
      if (!valor) return match;
      // Un "número" que en realidad es un año no es una cédula.
      if (type === 'cedula' && /^(19|20)\d{2}$/.test(valor)) return match;
      return tokenPara(type, valor);
    });
  }

  return { masked, mapping };
}

/**
 * Rehidrata los tokens en el texto usando el mapeo original.
 */
export function rehydrateText(text: string, mapping: PIIMapping[]): string {
  let result = String(text ?? '');
  for (const { token, original } of mapping || []) {
    result = result.split(token).join(original);
  }
  return result;
}

/**
 * Rehidratador para respuestas en streaming: un token puede quedar partido entre dos trozos
 * (`<PII_NOM` + `BRE_0>`), así que el final del búfer se retiene hasta saber si empieza un
 * token. `flush()` cierra la respuesta y emite lo retenido.
 */
export function makeRehydrator(mapping: PIIMapping[]): {
  push: (chunk: string) => string;
  flush: () => string;
} {
  const tokens = (mapping || []).map((m) => m.token);
  if (tokens.length === 0) {
    return { push: (chunk: string) => String(chunk ?? ''), flush: () => '' };
  }
  const maxTokenLen = Math.max(...tokens.map((t) => t.length));
  let pendiente = '';

  return {
    push(chunk: string): string {
      pendiente += String(chunk ?? '');
      let emitido = '';
      for (;;) {
        const inicio = pendiente.lastIndexOf('<');
        if (inicio === -1) {
          emitido += pendiente;
          pendiente = '';
          break;
        }
        emitido += pendiente.slice(0, inicio);
        pendiente = pendiente.slice(inicio);
        // Un '<' que ya no puede ser un token completo no es un token partido: se emite.
        if (pendiente.length > maxTokenLen) {
          emitido += pendiente.slice(0, 1);
          pendiente = pendiente.slice(1);
          continue;
        }
        break;
      }
      return rehydrateText(emitido, mapping);
    },
    flush(): string {
      const salida = rehydrateText(pendiente, mapping);
      pendiente = '';
      return salida;
    },
  };
}

/**
 * Nombres de las partes que vale la pena enmascarar, tomados de la ficha del expediente.
 *
 * Filtra lo que no es un nombre: cadenas vacías, marcadores de "no hay dato" y valores de una
 * sola palabra demasiado cortos para enmascararlos sin daño (el enmascarador exige 5 letras).
 * Un nombre adivinado de más estropea la respuesta; uno de menos solo deja pasar un dato que
 * ya estaba en el contexto del expediente del propio usuario.
 */
export function nombresDeFicha(valores: Array<string | null | undefined>): string[] {
  const marcadores = new Set([
    '', 'no especificado', 'no especificada', 'no consta', 'no aplica', 'n/a', 'na',
    'desconocido', 'desconocida', 'sin dato', 'por definir', 'ninguno', 'ninguna', '-', '--',
  ]);
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const valor of valores || []) {
    const limpio = String(valor ?? '').trim();
    if (limpio.length < 5) continue;
    if (marcadores.has(limpio.toLowerCase())) continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(limpio);
  }
  return salida;
}

/**
 * Genera un informe de qué PII fue enmascarada (útil para auditoría).
 */
export function auditMask(
  text: string,
  opciones: MaskOptions = {},
): { masked: string; count: number; types: Record<string, number> } {
  const { masked, mapping } = maskText(text, opciones);
  const types: Record<string, number> = {};
  for (const { type } of mapping) {
    types[type] = (types[type] || 0) + 1;
  }
  return { masked, count: mapping.length, types };
}
