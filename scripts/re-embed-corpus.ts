/**
 * Re-embeba el corpus de `rag_chunks` con el proveedor configurado (Brecha 6).
 *
 * Un cambio de proveedor de embeddings NO es un cambio de configuración: cambia el espacio
 * vectorial. Los vectores viejos y los nuevos no son comparables, y mezclarlos no falla —devuelve
 * resultados silenciosamente peores—. Por eso este script:
 *
 *  1. Sin `--write` solo informa (plan). Nada se escribe por accidente.
 *  2. Se niega a tocar la base de producción salvo `--permitir-produccion`.
 *  3. Guarda en `rag_embeddings_meta` qué modelo generó los vectores que hay. Si el modelo cambia
 *     respecto al registrado, exige `--aceptar-cambio-de-modelo`: es la diferencia entre migrar a
 *     conciencia y corromper el índice sin enterarse.
 *  4. Verifica las dimensiones de cada vector antes de escribir (vector(768)).
 *
 * Uso:
 *   bun run scripts/re-embed-corpus.ts                     # plan
 *   bun run scripts/re-embed-corpus.ts --write             # re-embebe
 *   bun run scripts/re-embed-corpus.ts --write --esquema castillo --limite 50
 *   EMBEDDING_PROVIDER=openrouter bun run scripts/re-embed-corpus.ts --write --aceptar-cambio-de-modelo
 */
import { Client } from 'pg';
import { EMBEDDING_DIMENSIONS, estadoEmbeddings, generateEmbedding } from '../src/lib/embeddings';

const HOSTS_PRODUCCION = ['ep-patient-base-b5opm55c'];

interface Args {
  write: boolean;
  limite: number;
  esquema: string;
  permitirProduccion: boolean;
  aceptarCambioDeModelo: boolean;
}

function leerArgs(argv: string[]): Args {
  const args: Args = {
    write: argv.includes('--write'),
    limite: Number(valorDe(argv, '--limite') || 0),
    esquema: valorDe(argv, '--esquema') || '',
    permitirProduccion: argv.includes('--permitir-produccion'),
    aceptarCambioDeModelo: argv.includes('--aceptar-cambio-de-modelo'),
  };
  return args;
}

function valorDe(argv: string[], bandera: string): string | null {
  const i = argv.indexOf(bandera);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

async function main(): Promise<number> {
  const args = leerArgs(process.argv.slice(2));
  const url = String(process.env.DATA_BASE || process.env.DATABASE_URL || '');
  if (!url) {
    console.error('Falta DATA_BASE (o DATABASE_URL): no hay a qué conectarse.');
    return 2;
  }

  const host = hostDe(url);
  if (HOSTS_PRODUCCION.some((h) => host.includes(h)) && !args.permitirProduccion) {
    console.error(
      `La base apunta a producción (${host}). Re-embekar el corpus ahí cambia los vectores que usa\n` +
      'la aplicación en vivo. Si es lo que quieres, repite con --permitir-produccion y dilo en el informe.',
    );
    return 2;
  }

  const estado = estadoEmbeddings();
  const tabla = args.esquema ? `"${args.esquema}".rag_chunks` : 'rag_chunks';
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const total = await client.query(`select count(*)::int as n from ${tabla} where embedding is not null`);
    const filas = await client.query(`select count(*)::int as n from ${tabla}`);
    console.log('--- Re-embebido del corpus');
    console.log(`  base:        ${host}`);
    console.log(`  tabla:       ${tabla}`);
    console.log(`  filas:       ${filas.rows[0].n} (${total.rows[0].n} con vector)`);
    console.log(`  proveedor:   ${estado.proveedor} · ${estado.modelo} · ${estado.dimensiones} dims`);
    console.log(`  clave:       ${estado.configurado ? 'configurada' : 'FALTA'}`);
    if (!estado.configurado) {
      console.error('Sin clave del proveedor no se puede embeber.');
      return 2;
    }

    // Qué modelo generó lo que hay almacenado.
    await client.query(
      `create table if not exists ${args.esquema ? `"${args.esquema}".` : ''}rag_embeddings_meta (
         modelo text primary key, dimensiones int not null, filas int not null, actualizado_en bigint not null)`,
    );
    const meta = await client.query(
      `select modelo, dimensiones, filas from ${args.esquema ? `"${args.esquema}".` : ''}rag_embeddings_meta`,
    );
    const registrados = meta.rows.map((r: any) => r.modelo);
    console.log(`  registrado:  ${registrados.length ? registrados.join(', ') : '(nada: primer re-embebido)'}`);

    const cambiaDeModelo = registrados.length > 0 && !registrados.includes(estado.modelo);
    if (cambiaDeModelo && !args.aceptarCambioDeModelo) {
      console.error(
        `\n  El modelo almacenado (${registrados.join(', ')}) no es el configurado (${estado.modelo}).\n` +
        '  Los vectores de dos modelos viven en espacios distintos: mezclarlos degrada la búsqueda\n' +
        '  sin dar error. Si de verdad vas a migrar, repite con --aceptar-cambio-de-modelo.',
      );
      return 3;
    }

    const consulta = args.limite > 0
      ? `select id, content from ${tabla} order by id limit ${args.limite}`
      : `select id, content from ${tabla} order by id`;
    const chunks = await client.query(consulta);
    console.log(`  a embeber:  ${chunks.rows.length} fragmentos`);

    if (!args.write) {
      console.log('\n  (plan: no se escribió nada; añade --write para aplicar)');
      return 0;
    }

    let hechos = 0;
    let vacios = 0;
    const empezado = Date.now();
    for (const fila of chunks.rows) {
      const texto = String(fila.content || '').trim();
      if (!texto) {
        vacios++;
        continue;
      }
      const vector = await generateEmbedding(texto);
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`vector de ${vector.length} dimensiones para ${fila.id}`);
      }
      await client.query(`update ${tabla} set embedding = $1::vector where id = $2`, [`[${vector.join(',')}]`, fila.id]);
      hechos++;
      if (hechos % 10 === 0) console.log(`    ... ${hechos}/${chunks.rows.length}`);
    }

    await client.query(
      `delete from ${args.esquema ? `"${args.esquema}".` : ''}rag_embeddings_meta where modelo <> $1`,
      [estado.modelo],
    );
    await client.query(
      `insert into ${args.esquema ? `"${args.esquema}".` : ''}rag_embeddings_meta (modelo, dimensiones, filas, actualizado_en)
       values ($1, $2, $3, $4)
       on conflict (modelo) do update set dimensiones = excluded.dimensiones, filas = excluded.filas, actualizado_en = excluded.actualizado_en`,
      [estado.modelo, EMBEDDING_DIMENSIONS, hechos, Date.now()],
    );

    const segundos = ((Date.now() - empezado) / 1000).toFixed(1);
    console.log(`\n  re-embebidos: ${hechos} fragmentos en ${segundos} s${vacios ? ` (${vacios} sin texto, saltados)` : ''}`);
    console.log(`  registrado en rag_embeddings_meta: ${estado.modelo}`);
    console.log('\n  Recuerda: los vectores cambiaron, así que la línea base medida hay que rehacerla.');
    return 0;
  } finally {
    await client.end();
  }
}

main()
  .then((codigo) => process.exit(codigo))
  .catch((error) => {
    console.error('ERROR:', error?.message || error);
    process.exit(1);
  });
