import { afterEach, describe, expect, it } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AIMessage, type ToolMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod/v3';
import { HERRAMIENTAS_MCP, conectarMcp, crearAgenteReAct } from './reactAgent';

// S16 no toca red: el servidor MCP es un doble in-process sobre InMemoryTransport
// y el modelo es un doble guionizado (mismo patrón que langgraph.test.ts). Lo que
// se prueba de verdad es el bucle ReAct: quién decide, en qué orden se ejecuta y
// que cada llamada cruza el protocolo MCP hasta el servidor.

interface Llamada {
  nombre: string;
  args: Record<string, unknown>;
}

/** Servidor MCP doble con los cuatro contratos reales de `mcp_servidor.py`. */
function servidorDoble(opciones: { fallarEn?: string } = {}) {
  const server = new McpServer({ name: 'legisai-doble', version: '0.1.0' });
  const llamadas: Llamada[] = [];

  const responder = (nombre: string) => async (args: Record<string, unknown>) => {
    llamadas.push({ nombre, args });
    if (opciones.fallarEn === nombre) {
      return { isError: true, content: [{ type: 'text' as const, text: 'falta DATABASE_URL' }] };
    }
    return { content: [{ type: 'text' as const, text: `ok:${nombre}` }] };
  };

  server.registerTool(
    'buscar_jurisprudencia',
    { description: HERRAMIENTAS_MCP.buscar_jurisprudencia.descripcion, inputSchema: { consulta: z.string(), top_k: z.number().optional() } },
    responder('buscar_jurisprudencia'),
  );
  server.registerTool(
    'consultar_expediente',
    { description: HERRAMIENTAS_MCP.consultar_expediente.descripcion, inputSchema: { expediente_id: z.string(), limite_documentos: z.number().optional() } },
    responder('consultar_expediente'),
  );
  server.registerTool(
    'sincronizar_rama_judicial',
    { description: HERRAMIENTAS_MCP.sincronizar_rama_judicial.descripcion, inputSchema: { radicado: z.string(), expediente_id: z.string().optional() } },
    responder('sincronizar_rama_judicial'),
  );
  server.registerTool(
    'generar_resumen_ejecutivo',
    { description: HERRAMIENTAS_MCP.generar_resumen_ejecutivo.descripcion, inputSchema: { texto: z.string(), max_palabras: z.number().optional() } },
    responder('generar_resumen_ejecutivo'),
  );

  return { server, llamadas };
}

/** Cliente conectado al doble; se cierra solo al terminar cada test. */
async function parMcp(opciones: { fallarEn?: string; solo?: string[] } = {}) {
  const { server, llamadas } = servidorDoble(opciones);
  const [clienteTransporte, servidorTransporte] = InMemoryTransport.createLinkedPair();
  const cliente = new Client({ name: 'test', version: '1.0.0' });
  const conexionServidor = server.connect(servidorTransporte);
  const conectado = opciones.solo
    ? conectarMcp(clienteTransporte, opciones.solo as never)
    : conectarMcp(clienteTransporte);
  const conectados = await Promise.all([
    conectado.then((c) => c),
    conexionServidor,
  ]);
  return { cliente: conectados[0] as Client, llamadas, cerrar: async () => {
    await conectados[0].close();
    await conexionServidor;
  } };
}

/**
 * Modelo doble: recorre un guion de AIMessage.
 *
 * Extiende `BaseChatModel` (y no un objeto plano) porque `createReactAgent`
 * compone el resultado de `bindTools` con `pipe()` y exige un Runnable de verdad.
 */
class ModeloGuion extends BaseChatModel {
  private readonly guion: AIMessage[];
  private posicion = 0;

  constructor(guion: AIMessage[]) {
    super({});
    this.guion = guion;
  }

  _llmType(): string {
    return 'modelo-guion';
  }

  async _generate() {
    const i = Math.min(this.posicion, this.guion.length - 1);
    this.posicion += 1;
    const message = this.guion[i];
    return { generations: [{ message, text: String(message.content) }] };
  }

  bindTools(): this {
    return this;
  }
}

function modeloDoble(guion: AIMessage[]) {
  return new ModeloGuion(guion);
}

const pide = (nombre: string, args: Record<string, unknown>, id: string) =>
  new AIMessage({ content: '', tool_calls: [{ name: nombre, args, id, type: 'tool_call' as const }] });

const responde = (texto: string) => new AIMessage({ content: texto });

const abiertos: { cerrar: () => Promise<void> }[] = [];
afterEach(async () => {
  while (abiertos.length) await abiertos.pop()!.cerrar();
});

describe('S16 · Patrón ReAct sobre MCP', () => {
  it('el servidor doble publica exactamente los cuatro contratos del servidor Python', async () => {
    const par = await parMcp();
    abiertos.push(par);

    const publicadas = await par.cliente.listTools();
    expect(publicadas.tools.map((t) => t.name).sort()).toEqual(
      Object.keys(HERRAMIENTAS_MCP).sort(),
    );
  });

  it('conectarMcp rechaza un servidor que no expone el contrato pedido', async () => {
    const server = new McpServer({ name: 'incompleto', version: '0.1.0' });
    server.registerTool(
      'buscar_jurisprudencia',
      { description: 'x' },
      async () => ({ content: [{ type: 'text' as const, text: 'ok' }] }),
    );
    const [clienteTransporte, servidorTransporte] = InMemoryTransport.createLinkedPair();
    const conexion = server.connect(servidorTransporte);

    await expect(conectarMcp(clienteTransporte)).rejects.toThrow(/consultar_expediente/);
    await conexion;
  });

  it('alterna razonamiento y MCP hasta reunir evidencia: 2 herramientas decididas por el modelo', async () => {
    const par = await parMcp();
    abiertos.push(par);

    // Guion: el modelo pide DOS herramientas en turnos separados y solo entonces responde.
    const modelo = modeloDoble([
      pide('buscar_jurisprudencia', { consulta: 'casación civil', top_k: 5 }, 'call_1'),
      pide('consultar_expediente', { expediente_id: 'EXP-42' }, 'call_2'),
      responde('Evidencia reunida: 3 fragmentos y el expediente EXP-42.'),
    ]);
    const agente = crearAgenteReAct(modelo, par.cliente);

    const salida = await agente.invoke({ messages: [{ role: 'user', content: 'resume la EXP-42' }] });

    // Orden del bucle: pensamiento → acción → observación → pensamiento → acción → observación → respuesta.
    expect(salida.messages.map((m) => m.getType())).toEqual([
      'human', 'ai', 'tool', 'ai', 'tool', 'ai',
    ]);
    // Exactamente las llamadas que el modelo pidió, ni una más ni una menos.
    expect(par.llamadas).toEqual([
      { nombre: 'buscar_jurisprudencia', args: { consulta: 'casación civil', top_k: 5 } },
      { nombre: 'consultar_expediente', args: { expediente_id: 'EXP-42' } },
    ]);
    // La observación del servidor vuelve al modelo como ToolMessage.
    const observaciones = salida.messages.filter((m) => m.getType() === 'tool') as ToolMessage[];
    expect(observaciones[0].content).toContain('ok:buscar_jurisprudencia');
    // Y la respuesta final es la del modelo.
    expect(salida.messages.at(-1)!.content).toContain('Evidencia reunida');
  });

  it('consulta directa: el modelo no pide herramientas y el agente no invoca ninguna', async () => {
    const par = await parMcp();
    abiertos.push(par);

    const modelo = modeloDoble([responde('Respuesta directa sin evidencia externa.')]);
    const agente = crearAgenteReAct(modelo, par.cliente);

    const salida = await agente.invoke({ messages: [{ role: 'user', content: '¿qué es una tutela?' }] });

    expect(par.llamadas).toEqual([]);
    expect(salida.messages).toHaveLength(2);
    expect(salida.messages[0].getType()).toBe('human');
    expect(salida.messages[1].content).toContain('Respuesta directa');
  });

  it('una sola herramienta basta cuando el modelo así lo decide', async () => {
    const par = await parMcp();
    abiertos.push(par);

    const modelo = modeloDoble([
      pide('generar_resumen_ejecutivo', { texto: 'Texto largo del proceso…', max_palabras: 100 }, 'call_1'),
      responde('Resumen listo.'),
    ]);
    const agente = crearAgenteReAct(modelo, par.cliente);

    const salida = await agente.invoke({ messages: [{ role: 'user', content: 'resume' }] });

    expect(par.llamadas).toHaveLength(1);
    expect(par.llamadas[0].nombre).toBe('generar_resumen_ejecutivo');
    expect(salida.messages.at(-1)!.content).toBe('Resumen listo.');
  });

  it('un error del servidor MCP vuelve al modelo como observación con la causa', async () => {
    const par = await parMcp({ fallarEn: 'buscar_jurisprudencia' });
    abiertos.push(par);

    const modelo = modeloDoble([
      pide('buscar_jurisprudencia', { consulta: 'recurso de queja' }, 'call_1'),
      responde('No pude reunir evidencia: falta la base de datos.'),
    ]);
    const agente = crearAgenteReAct(modelo, par.cliente);

    const salida = await agente.invoke({ messages: [{ role: 'user', content: 'busca' }] });

    const observacion = salida.messages.filter((m) => m.getType() === 'tool')[0] as ToolMessage;
    expect(String(observacion.content)).toContain('Error de la herramienta buscar_jurisprudencia');
    expect(String(observacion.content)).toContain('DATABASE_URL');
    expect(salida.messages.at(-1)!.content).toContain('No pude reunir evidencia');
  });
});

