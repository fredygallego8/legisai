# LegisAI — Asistente Jurídico con IA (RAG + LangGraph + MCP)

> **Estado**: ✅ Producción activa · 119 tests pasando · Next.js 16 + React 19 + TypeScript  
> **Demo**: [https://legisai.vercel.app](https://legisai.vercel.app) (pendiente deploy)  
> **Arquitectura**: Grafo de estados con checkpoints (Neon) + ReAct + MCP tools + RAG híbrido

---

## 🎯 Qué hace

LegisAI responde consultas jurídicas colombianas combinando:

| Capacidad | Tecnología |
|-----------|------------|
| **Clasificación automática** | Simple (respuesta directa) vs Compleja (requiere recuperación) |
| **Recuperación semántica** | pgvector (Neon) + re-ranking CrossEncoder local |
| **Razonamiento estructurado** | LangGraph (grafo: clasificar → recuperar → razonar → verificar → responder) |
| **Herramientas externas** | MCP (Model Context Protocol) vía `createReactAgent` — 4 tools: buscar jurisprudencia, consultar expediente, sincronizar Rama Judicial, generar resumen ejecutivo |
| **Memoria de conversación** | Checkpointer (Neon) por `thread_id` + store nombre-valor entre hilos |
| **Seguridad** | PII masking automático + `owner_id` en checkpoints (previene IDOR) |
| **Autenticación** | Better Auth (email/password + OAuth) |

---

## 🏗️ Arquitectura del grafo

```
clasificar (SIMPLE/COMPLEJA)
    │
    ├─► SIMPLE ──► razonar ──► verificar ──► responder
    │
    └─► COMPLEJA ──► recuperar (vector + rerank top-5)
                        │
                        ▼
                     razonar ──► verificar
                        │           │
                        │        insuficiente (≤1 retry)
                        ▼           ▼
                     recuperar ◄── responder
```

- **Checkpoints** en Neon (`langgraph_checkpoints`) con `owner_id` → aislamiento horizontal por usuario
- **Reintentos transitorios** solo en 429/5xx del proveedor (Gemini); 4xx fallan rápido
- **Límite duro**: 12 pasos por ejecución (evita bucles infinitos)

---

## 📦 Stack principal

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) + React 19 |
| Runtime | Bun |
| Base de datos | Neon (PostgreSQL serverless) + pgvector |
| IA / LLM | Google Gemini (`@google/genai`, `@langchain/google-genai`) |
| Orquestación | LangGraph (`@langchain/langgraph`) + ReAct (`@langchain/langgraph/prebuilt`) |
| MCP | `@modelcontextprotocol/sdk` (stdio ↔ servidor Python `servicio-ia`) |
| Auth | Better Auth |
| UI | Tailwind CSS 4 + Lucide React + Recharts + d3 |
| Tests | `bun test` (119/119) |
| Lint/Typecheck | ESLint 9 + `tsc --noEmit` |

---

## 🚀 Puesta en marcha

```bash
# 1. Clonar e instalar
git clone https://github.com/fredygallego8/legisai.git
cd legisai
bun install

# 2. Variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección abajo)

# 3. Base de datos (Neon)
# - Crear proyecto en https://console.neon.tech
# - Habilitar extensión pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`
# - Ejecutar migraciones / scripts de seed si los hay

# 4. Servicio de IA (Python) — obligatorio para MCP tools
#   cd ../servicio-ia && pip install -r requirements.txt && python main.py
#   Debe quedar accesible en AI_SERVICE_URL (p.ej. http://localhost:8000)

# 5. Desarrollo
bun run dev        # http://localhost:3000
bun run test       # 119 tests
bun run typecheck  # 0 errores
bun run lint       # ESLint
bun run build      # Build producción
```

---

## ⚙️ Variables de entorno (`.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | ✅ | Conexión Neon (postgres://...) |
| `GEMINI_API_KEY` | ✅ | Clave Google AI Studio |
| `BETTER_AUTH_SECRET` | ✅ | Secret para sesiones (generar con `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | URL base de la app (p.ej. `http://localhost:3000`) |
| `AI_SERVICE_URL` | ✅ | URL del servidor Python MCP (p.ej. `http://localhost:8000`) |
| `AI_SERVICE_TOKEN` | ✅ | Token interno para llamar al servicio (no `NEXT_PUBLIC_`) |
| `AI_SERVICE_TIMEOUT_MS` | ❌ | Timeout llamadas al servicio (default 15000) |

> **Nota**: `.env.example` contiene solo placeholders. No hay secretos reales en el repo.

---

## 🧪 Tests y calidad

```bash
bun test                    # Suite completa (119 tests)
bun test src/lib/langgraph.test.ts   # Tests del grafo (24)
bun test src/lib/reactAgent.test.ts  # ReAct + MCP (6)
bun test src/lib/memoriaThread.test.ts # Memoria + checkpointer (5)
bun test src/lib/subgrafosEstado.test.ts # Subgrafos padre-hijo (6)
bun test src/lib/piiMasker.test.ts     # PII masking (8)
bun run typecheck           # TypeScript strict
bun run lint                # ESLint 9 + Next.js config
```

**Cobertura clave**:
- Grafo: rutas, checkpoints, reanudación, reintentos, aislamiento `owner_id`
- ReAct: 2 tools, consulta sin tools, 1 tool, error servidor, contrato MCP
- Memoria: recuerdo entre turnos, hilos aislados, perfil acumulado, persistencia, resumen al store
- Subgrafos: composición padre-hijo, reducer acumulador, aislamiento threads, getState, corte humano, reanudación aprobar/rechazar

---

## 📁 Estructura de carpetas (src/)

```
src/
├── app/                    # Next.js App Router (páginas, API routes)
├── components/             # Componentes React (UI)
├── hooks/                  # Custom hooks
├── lib/                    # Núcleo del sistema (ver abajo)
├── middleware.ts           # Auth + owner_id en request
├── services/               # Servicios auxiliares
└── types.ts                # Tipos compartidos
```

### `src/lib/` — Módulos principales

| Archivo | Responsabilidad |
|---------|-----------------|
| `langgraph.ts` | Grafo principal + checkpoints + reintentos + routers |
| `reactAgent.ts` | `createReactAgent` + 4 tools MCP |
| `memoriaThread.ts` | Memoria conversación (checkpointer + store) |
| `subgrafosEstado.ts` | Subgrafo verificación + composición padre-hijo |
| `gemini.ts` | Cliente Gemini + system instruction + modelo chat |
| `embeddings.ts` | Embeddings Gemini `text-embedding-004` (768→384 dims) |
| `rerank.ts` | CrossEncoder local (re-ranking léxico) |
| `piiMasker.ts` | Detección/anonimizado PII (regex + heurísticas) |
| `db.ts` | Cliente Neon serverless + helpers SQL |
| `documentParser.ts` | Parsing PDF/Word → chunks para RAG |
| `expedienteContext.ts` | Contexto por expediente judicial |
| `auth.ts` / `auth-client.ts` | Better Auth server/client |
| `roles.ts` | RBAC básico |
| `httpShim.ts` | Adaptador fetch para MCP stdio |
| `fundamentosLangGraph.ts` | Utilidades base del grafo |
| `ramaJudicialService.ts` | Integración API Rama Judicial |
| `aiService.ts` | Orquestación alta nivel (chat endpoint) |

---

## 🔌 MCP Tools (servicio-ia Python)

El grafo invoca 4 tools vía MCP (stdio contra `servicio-ia`):

| Tool | Descripción |
|------|-------------|
| `buscar_jurisprudencia` | Consulta bases jurisprudenciales colombianas |
| `consultar_expediente` | Recupera datos de expediente por número |
| `sincronizar_rama_judicial` | Sincroniza estado proceso en Rama Judicial |
| `generar_resumen_ejecutivo` | Resume documento jurídico largo |

**Contrato**: `conectarMcp()` valida el schema publicado antes de adaptar las tools. En tests usa `InMemoryTransport` con doble determinista.

---

## 🛡️ Seguridad y privacidad

- **PII masking**: `piiMasker.ts` detecta y anonimiza cédulas, nombres, teléfonos, emails antes de enviar al LLM
- **Checkpoints con `owner_id`**: Cada fila en `langgraph_checkpoints` lleva el dueño; lecturas exigen coincidencia → previene IDOR cambiando `thread_id` en la URL
- **Auth obligatoria**: `middleware.ts` protege todas las rutas `/api/*` y páginas privadas
- **Variables sensibles**: Solo en `.env` (nunca en código); `.env.example` con placeholders
- **Historial Git**: Limpio (no hay claves hardcodeadas en commits actuales)

---

## 📝 Licencia

**MIT License** — ver [LICENSE](LICENSE) (pendiente añadir al repo).

---

## 🤝 Contribuir

1. Fork → rama `feat/mi-mejora`
2. `bun test` + `bun run typecheck` + `bun run lint` en verde
3. Commit convencional: `feat(legisai): descripción corta`
4. PR con descripción del cambio y tests afectados

---

## 📚 Referencias técnicas

- [LangGraph docs](https://langchain-ai.github.io/langgraph/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Gemini API](https://ai.google.dev/)
- [Neon + pgvector](https://neon.tech/docs/extensions/pgvector)
- [Better Auth](https://www.better-auth.com/)

---

## 👤 Autor

**Fredy Gallego** — [@fredygallego8](https://github.com/fredygallego8)  
Proyecto desarrollado como asistente jurídico demostrativo con arquitectura moderna de IA.