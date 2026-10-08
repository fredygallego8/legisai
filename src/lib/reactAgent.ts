/**
 * S16 · Patrón ReAct — agente que alterna razonamiento y llamada a herramientas MCP.
 *
 * Entregable de S16: "Agente que alterna razonamiento y llamada a herramientas MCP
 * hasta reunir evidencia suficiente". Criterio de salida: "El agente decide por sí
 * mismo cuántas herramientas invocar según la consulta".
 *
 * Cómo se cumple:
 *
 * - `createReactAgent` (`@langchain/langgraph/prebuilt`) monta el bucle
 *   pensamiento → acción → observación: el modelo emite `tool_calls`, el ToolNode
 *   los ejecuta contra el cliente MCP y devuelve la observación; el modelo decide
 *   entonces si sigue pidiendo herramientas o responde. El número de invocaciones
 *   lo dicta el modelo, no un contador fijo — ese es justo el criterio de salida.
 * - Las herramientas viajan por MCP de verdad: `herramientasDesdeMcp` adapta los
 *   cuatro contratos de `ai-service/app/mcp_servidor.py` (líneas 133, 167, 197 y
 *   208) a tools de LangChain y ejecuta cada llamada con `client.callTool` sobre
 *   el transporte que se le entregue (stdio contra el servidor Python real, o
 *   in-memory contra un doble en tests).
 * - El modelo es inyectable. En este entorno no hay LLM real disponible (la key
 *   de OpenRouter se quedó sin créditos en S19 y la GEMINI_API_KEY devuelve 403),
 *   así que los tests usan un doble guionizado — el patrón "doubles inyectados"
 *   que ya usan `langgraph.test.ts`: sin red, sin clave, con el recorrido del
 *   bucle cubierto de verdad.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { tool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';

/**
 * Contratos de entrada de las cuatro herramientas del servidor MCP LegisAI.
 *
 * Espejo literal de las firmas de `mcp_servidor.py`; se declaran aquí porque el
 * cliente necesita un schema para que el modelo vea parámetros tipados, y porque
 * el test de contrato exige que el servidor doble exponga exactamente estos
 * nombres y campos. Si el servidor Python cambia una firma, lo rompe el test.
 */
export const HERRAMIENTAS_MCP = {
  buscar_jurisprudencia: {
    descripcion: 'Recupera fragmentos de jurisprudencia y normativa por búsqueda híbrida.',
    schema: z.object({
      consulta: z.string().describe('Pregunta o término jurídico a buscar'),
      top_k: z.number().int().min(1).max(50).optional().describe('Cantidad de fragmentos (defecto 8)'),
    }),
  },
  consultar_expediente: {
    descripcion: 'Devuelve los metadatos de un expediente y sus documentos más recientes.',
    schema: z.object({
      expediente_id: z.string().describe('Identificador del expediente'),
      limite_documentos: z.number().int().min(1).max(50).optional().describe('Documentos a devolver (defecto 5)'),
    }),
  },
  sincronizar_rama_judicial: {
    descripcion: 'Consulta el portal de la Rama Judicial y compara con el expediente indicado.',
    schema: z.object({
      radicado: z.string().describe('Número de radicado del proceso'),
      expediente_id: z.string().optional().describe('Expediente del sistema con el que comparar'),
    }),
  },
  generar_resumen_ejecutivo: {
    descripcion: 'Redacta un resumen ejecutivo a partir del texto entregado.',
    schema: z.object({
      texto: z.string().describe('Texto fuente del resumen'),
      max_palabras: z.number().int().min(50).max(800).optional().describe('Techo del resumen (defecto 200)'),
    }),
  },
} as const;

export type NombreHerramienta = keyof typeof HERRAMIENTAS_MCP;

/**
 * Conecta un cliente MCP sobre el transporte dado (stdio, HTTP o in-memory) y
 * verifica que el servidor expone las herramientas pedidas.
 *
 * La verificación no es decorativa: un servidor que no lista
 * `buscar_jurisprudencia` es el servidor equivocado, y fallar aquí es mejor que
 * descubrirlo cuando el modelo intente invocarla.
 */
export async function conectarMcp(
  transporte: Transport,
  nombres: readonly NombreHerramienta[] = Object.keys(HERRAMIENTAS_MCP) as NombreHerramienta[],
): Promise<Client> {
  const cliente = new Client({ name: 'legisai-react', version: '1.0.0' });
  await cliente.connect(transporte);
  const publicadas = await cliente.listTools();
  const disponibles = new Set(publicadas.tools.map((t) => t.name));
  const faltantes = nombres.filter((n) => !disponibles.has(n));
  if (faltantes.length > 0) {
    await cliente.close();
    throw new Error(
      `El servidor MCP no expone: ${faltantes.join(', ')} (publicadas: ${[...disponibles].join(', ') || 'ninguna'})`,
    );
  }
  return cliente;
}

/**
 * Adapta los contratos MCP a tools de LangChain.
 *
 * Cada tool ejecuta `client.callTool` — la llamada cruza de verdad el protocolo
 * MCP hacia el servidor (el doble en memoria en tests, el servidor Python por
 * stdio en producción). Un `isError` del servidor no se traga: vuelve al modelo
 * como observación con la causa escrita, para que decida reintentar por otro
 * lado o declarar que no pudo reunir evidencia.
 */
export function herramientasDesdeMcp(
  cliente: Client,
  nombres: readonly NombreHerramienta[] = Object.keys(HERRAMIENTAS_MCP) as NombreHerramienta[],
): StructuredToolInterface[] {
  return nombres.map((nombre) => {
    const contrato = HERRAMIENTAS_MCP[nombre];
    return tool(
      async (argumentos: Record<string, unknown>) => {
        const limpio = Object.fromEntries(
          Object.entries(argumentos).filter(([, v]) => v !== undefined),
        );
        const resultado = await cliente.callTool({ name: nombre, arguments: limpio });
        const partes = (resultado.content as { type: string; text?: string }[])
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '');
        const texto = partes.join('\n') || JSON.stringify(resultado);
        return resultado.isError ? `Error de la herramienta ${nombre}: ${texto}` : texto;
      },
      { name: nombre, description: contrato.descripcion, schema: contrato.schema },
    );
  });
}

/**
 * Construye el agente ReAct: modelo + herramientas MCP.
 *
 * El límite de recursión se entrega en cada invocación (`invoke(..., {
 * recursionLimit: 40 })`), no en la construcción: acoge el doble de pasos que
 * llamadas a herramientas espera un razonamiento razonable (cada tool ocupa
 * dos pasos: llamada y observación); el bucle real lo corta el modelo cuando
 * deja de pedir herramientas.
 */
export function crearAgenteReAct(
  llm: Parameters<typeof createReactAgent>[0]['llm'],
  cliente: Client,
  nombres: readonly NombreHerramienta[] = Object.keys(HERRAMIENTAS_MCP) as NombreHerramienta[],
) {
  return createReactAgent({
    llm,
    tools: herramientasDesdeMcp(cliente, nombres),
  }).withConfig({ recursionLimit: 40 });
}

