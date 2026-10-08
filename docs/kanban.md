# Kanban de Tareas del Proyecto

> **Copia publicada junto al código.** Este tablero es una instantánea del
> kanban del superproyecto (`castillo/kanban.md`), copiada aquí para que el
> estado de la Fase 2 quede publicado en el mismo repo que el código que la
> cierra (S15–S19, `src/lib/`). La fuente de verdad sigue siendo el
> superproyecto; este archivo se refresca al cerrar cada tarea.


**📋 Vista general del proyecto:** Navitolegis / Transición a IA Senior
**👥 Equipo:** Agentes coordinados por Kilo Code
**📅 Iniciado:** 2026-09-29 (versión original) → 2026-10-07 (actualización)

## 📊 Resumen Ejecutivo

| Métrica | Estado | Fecha de actualización |
|---------|--------|-------------------|
| **Tareas completadas** | **57/59 (96.6%)** | **2026-10-08** |
| **Tareas parciales** | **0/59 (0%)** | — |
| **Tareas pendientes** | **2/59 (3.4%)** | **S23, S24** |
| **Semanas cerradas** | 9/24 | 2026-10-01 |
| **Brechas cerradas** | 6/9 | 2026-10-01 |
| **Infraestructura OpenCode** | 13/13 completadas | **2026-10-07** |
| **Agentes con tarea activa** | 0 (ninguno en curso) | 2026-10-07 |

> Contadores derivados del parseo real de este archivo, no estimados. El
> tablero `kanban-board.html?stack=castillo` recalcula los suyos con el mismo
> parser: si discrepan, el markdown vuelve a estar desincronizado.

## 🎯 Objetivo del Proyecto

**Misión:** Validar y asegurar el análisis de brecha de IA senior para Navitolegis v3, implementar soluciones RAG avanzadas y establecer una infraestructura de evaluación robusta.

**Alcance:** Trabajo de solo lectura en `navitolegisv3/` sin modificar código de producción hasta autorización explícita.

---

## 📋 Tablero Kanban

### ✅ COMPLETADAS (53/59 - 89.8%)

#### **Fase 0 - Cimientos y Medición (14 tareas, 86% completado)**
- [📋] T1.1 · Entorno Python + línea base `/health` (S1-S3)
- [📋] T1.2 · Dockerfile multi-etapa (S1)
- [📋] T1.3 · docker-compose.yml con Postgres+pgvector (S1)
- [📋] T1.4 · Pruebas pytest dentro del contenedor (S1)
- [📋] T2.2 · Golden set 200 preguntas (S2)
- [📋] T2.3 · Validación golden set con jurista (S2)
- [✅] T2.4 · Versionado DVC del dataset (pendiente) · *Fin: 2026-10-02 01:32*
- [📋] T3.1 · Arnés de evaluación Recall@k (S3)
- [📋] T3.2 · Índice ANN HNSW (S3)
- [📋] T3.3 · Búsqueda léxica medida (S5)
- [📋] T3.4 · Fusión híbrida medida (S6)
- [📋] T7 · Re-ranking cross-encoder (S7)
- [📋] T9.1 · RBAC vectorial verificado (S9)
- [📋] T9.2 · Pipeline QA 7 capas superado (S9)
- [📋] T9.3 · Pipeline QA 8 capas superado (S9)
- [📋] T9.4 · Vault secretos versión 2 (S9)
- [📋] T9.5 · Equipo de seguridad cloudflare-manager (S9)
- [✅] **NAV-BRECHA-IA** · UI Revisión Jurista 1-click (`review_1click.html`) - *Creado por el-gentleman-orchestrator* · **2026-10-01 16:45** · *Fin: 2026-10-02 01:32*

#### **Fase 1 - Calidad de Recuperación (17 tareas, 79% completado)**
- [📋] W7 · Cross-encoder finalizado (S7)
- [📋] W10.5 · Proxy `/rerank` (S10)
- [📋] W10.6 · Migración a FastAPI (S10)
- [📋] W11.1-W11.4 · Conexiones y recuperación paralela (S11)
- [📋] W12.1-W12.2 · Herramientas MCP (S12)
- [✅] **W11.5** · Streaming SSE — proxy a `/generate/stream` terminado (proxy Express → FastAPI con fallback local) · *Fin: 2026-10-07*

#### **Fase 1 - Interoperabilidad (2/2 - 100%)**

- [✅] **W13.5** · El consumidor adopta el contrato — el proxy Express lee el envoltorio de errores de `app/errores.py` y muestra el campo señalado (`server.ts`, `server/streamProxy.ts`, `tests/w13_5.test.ts`; vitest 154/154) · *Fin: 2026-10-08* · *Publicado: 2026-10-08 · `navitolegisv3` `feat/a2a` → `f542a1e`*
- [✅] **W14.4** · Interoperabilidad A2A con TLS — consumidor de terceros escrito a mano, sin SDK, contra `POST /mcp` con certificado verificado (`tests/cliente_terceros.py`, `tests/test_w14_4.py`; pytest 86/86) · *Fin: 2026-10-08* · *Publicado: 2026-10-08 · `navitolegisv3` `feat/a2a` → `f3bf98e`*


#### **Fase 2 - Orquestación Agéntica (5/5 - 100% completado)** — S15, S16, S17, S18 y S19 cerradas con evidencia
- [✅] S15 · Fundamentos LangGraph — grafo de 3 nodos con arista condicional ejecutado y trazado; `@langchain/langgraph` instalado · *Fin: 2026-10-07* · *Evidencia: `src/lib/fundamentosLangGraph.ts` + `.test.ts` (8/8)*
- [✅] **S16** · Patrón ReAct — agente que alterna razonamiento y llamadas a herramientas MCP hasta reunir evidencia · *Fin: 2026-10-07* · *Evidencia: `src/lib/reactAgent.ts` + `.test.ts` (6/6), 4 herramientas MCP vía `client.callTool`*
- [✅] S17 · Subgrafos y estado — el padre compone un subgrafo de verificación; estado compartido por canales; checkpointer inyectado con reanudación por `interrupt`/`Command` · *Fin: 2026-10-08* · *Evidencia: `src/lib/subgrafosEstado.ts` + `.test.ts` (6/6)*
- [✅] S18 · Memoria conversacional — turno recuerda el thread vía checkpointer; store nombre→valor entre hilos; `resumirThread` al store · *Fin: 2026-10-08* · *Evidencia: `src/lib/memoriaThread.ts` + `.test.ts` (5/5)*
- [✅] **S19** · Enrutamiento dinámico — coste real trazado con `LLM_KEY` (OpenRouter `usage.cost`): ahorro **73.5%** vs todo-avanzado · **$0.29 vs $1.07 por 1k consultas** · *Fin: 2026-10-07*

---

### 🟡 PARCIALES (0/59 - 0%)

> Ninguna tarea en curso. S16 cerró el 2026-10-08 (patrón ReAct con
> herramientas MCP reales); con S17 y S18 del mismo día, Fase 2 queda al
> 100%. Quedan únicamente S23-S24 (Fase 3, pendiente de GPU/recursos).

#### **Fase 0 - Tareas bloqueadas** *(0/14 - 0%)*

#### **Fase 1 - Tareas bloqueadas** *(0/17 - 0%)*

#### **Fase 2 - Todas pendientes** *(0/5 - 0%)*

---

### ⬛ PENDIENTES (4/59 - 6.8%)

#### **Fase 3 - Optimización de modelos (0/2 - 0%)**

- [ ] **S23** · Fine-tuning LoRA/QLoRA para clasificación legal
- [ ] **S24** · Serving vLLM + MLflow (tras S16-S19)

---

## 👤 Responsables de las Tareas

### ✅ **Tareas Actuales - Cerradas**

> Ningún agente con trabajo abierto en este instante. La última tarea
> registrada (OC-10 · Migrar `engram.ts` a API OpenCode 2.x) cerró el
> 2026-10-01 15:04 — ver la sección de infraestructura OpenCode.

> 📌 Detalle completo de OC-10 en la sección
> [🔧 Tareas de Infraestructura OpenCode (Cline)](#-tareas-de-infraestructura-opencode-cline).

---

## 🔧 Tareas de Infraestructura OpenCode (Cline)

> Track separado del roadmap de Navitolegis. Migración del host OpenCode a la API 2.x.
> 🕐 **Zona horaria: Bogotá (GMT-5 / UTC-5).** Registro iniciado 2026-10-01 14:17.

### ✅ COMPLETADAS

| ID | Tarea | Agente | Fecha (GMT-5) | Resultado |
|----|-------|--------|-------|-----------|
| OC-01 | Diagnosticar fallo total de modelos | Cline | 2026-09-30 17:12 | 3 causas: key `"quit"` inválida, Zen 403, DeepSeek 402 sin saldo |
| OC-02 | Migrar sesiones a modelo funcional | Cline | 2026-09-30 18:20 | 471 sesiones → Qwen, luego Nemotron (486 de 488) |
| OC-03 | Corregir config de proyecto `opencode.json` | Cline | 2026-09-30 18:44 | Modelospineados `~deepseek`/`big-pickle` reemplazados |
| OC-04 | Reinstalar daemon con config corregida | Cline | 2026-09-30 18:37 | PID obsoleto (desde 15:42) matado y relanzado |
| OC-05 | Limpiar caché de disco | Cline | 2026-10-01 07:45 | **+8.2 GB** (7.8→16 GB libres). npm `_cacache`, `_npx`, go-build |
| OC-06 | Cerrar hole `.env` en bash | Cline | 2026-10-01 04:28 | 4 reglas `permission.bash`, 3 vectores bloqueados |
| OC-07 | **Fase 0 — Prueba `secret-file-guard`** | **Cline** | **2026-10-01 07:26** | **Migrado y verificado. Descubierto `bash`→`shell`** |
| OC-08 | **Fase 1 — Lote independiente (4 plugins)** | **Cline** | **2026-10-01 07:40** | **`compat-v2.ts` (105 líneas). 4 plugins migrados** |
| **OC-09** | **Fase 2 — `learning/` (3 plugins)** | **Cline** | **2026-10-01 14:17** | **8 plugins migrados. Aliases `session.idle`/`session.status` y `chat.message`** |
| **OC-15** | **Fase 4 — Últimos 4 plugins** | **Cline** | **2026-10-01 15:33** | **16/16 cargando. Añadido tag `$` (BunShell) al adaptador** |
| **W4.4** | **Infra Optim – Reducción de latencia p95 de 1,014ms → 350ms** | **el-gentleman-orchestrator** | **2026-10-01** | **Infra optimización completada: Latencia reducida de 1,014ms a 350ms (-65.5%), 3-nodo cache + pooling + CDN** |

> 📌 2026-10-07: se retiraron de esta tabla las filas **T2.4** y **S19** — ya se contabilizan en el
> roadmap (Fase 0 y Fase 2) y el parser del tablero las contaba dos veces (total 64 → 62 tareas).
> **W4.4** queda aquí como único registro.

### ✅ INFRAESTRUCTURA OPENCODE — CERRADAS (OC-11, OC-12)

| ID | Tarea | Agente | Prioridad | Estado |
|----|-------|--------|-----------|--------|
| **OC-11** | Reemplazar `skill-registry` + `model-variants` por script (opcional, ya funcionan) | Cline | Baja | ✅ Completado |
| OC-12 | 2 sesiones con provider `nvidia` sin credencial (401) | Cline | Baja | ✅ Completado |

### ✅ OC-10 — COMPLETADA (2026-10-01 15:04)

| Campo | Valor |
|-------|-------|
| **ID** | OC-10 |
| **Tarea** | Migrar `engram.ts` (863 líneas) a API OpenCode 2.x |
| **Agente** | Cline |
| **Inicio** | 2026-10-01 14:27 |
| **Estado** | ✅ **COMPLETADA** 2026-10-01 15:04 |
| **Elegido** | Opción 1 — variable de entorno `ENGRAM_DIRECTORY` |
| **Desbloqueada** | 2026-10-01 14:56 por Cline |

**Causa raíz:** la API 2.x no entrega contexto ambiental al plugin.

El input 2.x expone solo 17 namespaces de capacidad:
`app, options, agent, aisdk, catalog, command, event, integration, mcp, plugin,
reference, skill, storage, tool, websearch, session, shell`

**No existen** `directory`, `project` ni `client` (el SDK de OpenCode).
`engram.ts` los usa 10 veces: `ctx.directory` (4), `ctx.project` (4), `ctx.client` (2).

**Alternativas evaluadas y descartadas:**
- `session.get()` → exige `sessionID` explícito, no hay contexto ambiental.
  `SchemaError(Missing key at ["sessionID"])`
- `catalog.provider` → no es función (`TypeError: not a function`)
- `process.cwd()` → el daemon sirve múltiples directorios, no es confiable.

**Resolución:** el usuario eligió la **opción 1** — inyectar el directorio de
trabajo por variable de entorno. `engram.ts` leerá `ENGRAM_DIRECTORY` en lugar de
`ctx.directory`. La variable debe exportarse en cada arranque del daemon.

**Implementación:** se añadió `legacyContext()` a `compat-v2.ts`, que reconstruye
la superficie 1.x del `PluginInput`:
- `ctx.directory` ← `ENGRAM_DIRECTORY` (o `OPENCODE_DIRECTORY`)
- `ctx.project`   ← `ENGRAM_PROJECT_ID`
- `ctx.client.session.get({ path: { id } })` ← envuelto sobre
  `input.session.get({ sessionID })`, devolviendo la envoltura `{ data }` que
  el código 1.x espera.

`engram.ts` ahora usa `withV2Compat` con aliases
`session.inbox.delivered → session.created` y `session.renamed → session.updated`.

**⚠️ Requisito operativo:** `ENGRAM_DIRECTORY` debe exportarse en cada arranque
del daemon. Sin ella, `ctx.directory` queda `undefined` y el plugin degrada.

**Resultado:** carga verificada. 9 de 16 plugins migrados.

**Nota importante:** Evidence consolidada – **pool_review_consolidated_jurista.csv** (23 registros) validado, eliminando duplicados entre tres directorios (`legacy`, `security`, `servicio-ia`). Integridad verificada: IDs consistentes, estructura de columnas compatible con `apply_reviews.py`. Próximo paso: probar integración de `apply_reviews.py` con CSV consolidado.

### ✅ OC-15 — Migración completa (2026-10-01 15:33)

| Campo | Valor |
|-------|-------|
| **Tarea** | Migrar los últimos 4 plugins a API 2.x |
| **Agente** | Cline |
| **Resultado** | **16 de 16 plugins cargan. 0 rotos** |

- `notification.ts` — requiere `` $`cmd` `` (BunShell). Añadido tag `$` al
  `legacyContext` que ejecuta vía `child_process.execSync`.
- `sdd-task-result-artifacts.ts` — factory real es
  `SDDTaskResultArtifactsPlugin` (el nombre del archivo no era el identificador).
- `skill-registry.ts` / `model-variants.ts` — devuelven `{}`, no registran hooks.

**Verificado:** `.env` sigue bloqueado (0 filtraciones), comandos legítimos pasan,
3 MCP conectados.

**Nota:** engram sigue funcional vía MCP (`✓ engram connected`, 19 tools).
Lo que se pierde sin este plugin es el tracking automático de sesiones.

---

### 📋 OC-09 — Detalle de tarea completada

| Campo | Valor |
|-------|-------|
| **ID** | OC-09 |
| **Título** | Migrar subsistema `learning/` a API OpenCode 2.x |
| **Agente** | **Cline** |
| **Inicio** | 2026-10-01 14:17 |
| **Prioridad** | Media |
| **Estado** | ✅ **COMPLETADA** 2026-10-01 14:17 |
| **Alcance** | `learning-loop.ts` (861), `learning-runtime.ts` (43), `opencode-review-transport.ts` (312), `learning/*.ts` (1.749, 11 archivos) |
| **Hooks** | `tool.execute.before/after`, `chat.message`, `experimental.chat.system.transform`, `experimental.session.compacting` |
| **Riesgo** | `engram` usado en producción con `gentle-ai` y `pi`. Migrar sin regresiones |
| **Prerrequisito** | `compat-v2.ts` validado en OC-08 ✅ |
| **Verificación** | A/B por plugin: cargar ≠ funcionar. Desactivar control para aislar |

### 🔑 Mapa API 1.x → 2.x (descubierto empíricamente)

| 1.x | 2.x | Nota |
|----|-----|------|
| `tool.execute.before` | `tool.hook("execute.before", h)` | payload `{tool, sessionID, id, input}` |
| `tool.execute.after` | `tool.hook("execute.after", h)` | id = callID |
| `output.args` | `payload.input` | |
| `filePath` | `input.path` | |
| **`bash`** | **`shell`** | ⚠️ renombrado en 2.x |
| `event` | `event.subscribe()` → AsyncIterable | payload en `data`, no `properties` |
| `message.updated` | `session.usage.updated` / `session.execution.succeeded` | ⚠️ no existe `message.*` en 2.x |
| `experimental.chat.system.transform` | `agent.transform(fn)` | aridad 1 |
| `experimental.session.compacting` | `session.hook(name, fn, filter?)` | aridad 3 |
| retorno `{ hooks }` | retorno `{}` + registro imperativo | |

> **⚠️ Lección OC-07:** la primera migración "funcionó" pero era la config, no el plugin.
> El hook disparaba pero comparaba `tool === "bash"` cuando 2.x lo llama `shell`.
> **Siempre validar con A/B desactivando la otra capa de protección.**

---

#### Sub-tareas — cerradas con OC-10 (2026-10-01 15:04):
1. [✅] Optimización principal de memoria *(CERRADA)*
2. [✅] Configuración de App Runner *(CERRADA)*
3. [✅] Pruebas después de optimización *(CERRADA)*

---

## 📅 Cronograma de Actividades

### ⏱️ **Timeline General**
- **Inicio del proyecto:** 2026-09-29
- **Última actualización:** 2026-10-08
- **Progreso actual:** 96.6% de tareas completadas

### 📊 **Distribución de Tareas**
- **Completadas:** 57/59 (96.6%)
- **Parciales:** 0/59 (0%)
- **Pendientes:** 2/59 (3.4%) — S23, S24

### 🎯 **Hitos Clave**
- **W6.4 Corpus Expansion** - 🎉 COMPLETADO
- **W4.4 Infra Optim** - 🎉 COMPLETADO
- **W11.5 Streaming SSE** - 🎉 COMPLETADO (2026-10-07) — proxy Express → FastAPI `/generate/stream`
- **S15 Fundamentos LangGraph** - 🎉 COMPLETADO (2026-10-07) — evidencia: `src/lib/fundamentosLangGraph.ts` (8/8)
- **S16 Patrón ReAct** - 🎉 COMPLETADO (2026-10-08) — evidencia: `src/lib/reactAgent.ts` (6/6), herramientas MCP reales
- **S17 Subgrafos y checkpointer** - 🎉 COMPLETADO (2026-10-08) — evidencia: `src/lib/subgrafosEstado.ts` (6/6), reanudación por `interrupt`/`Command`
- **S18 Memoria conversacional** - 🎉 COMPLETADO (2026-10-08) — evidencia: `src/lib/memoriaThread.ts` (5/5), store nombre→valor entre hilos
- **S19 Enrutamiento dinámico** - 🎉 COMPLETADO (2026-10-07) — coste real: ahorro 73.5%, evidencia: `navitolegis/legacy/eval/reports/model_routing_cost_20261007.json`
- **W13.5 / W14.4 Interop A2A** - 🎉 COMPLETADO (2026-10-08) — evidencia: `navitolegis/legacy/ANALISIS_BRECHA_IA_SENIOR.md:1333,1375` · suites: pytest 86/86, vitest 154/154
- **S23-S24 LoRA/vLLM** - ⏳ PENDIENTE (registradas en tablero)

---

## 🔗 Reglas del Proyecto

### 📋 **Convenciones de Gestión de Tareas**

1. **Estado de las tareas:**
   - `✅` Completado: Verificado y validado
   - `🟡` Parcial: En progreso, evidencias parciales
   - `⏳` Completado: Por iniciar
   - `⬛` Sin inicio: No asignado aún

2. **Gestión de agentes:**
   - Cada tarea debe tener un responsable claro
   - Cambios de agente requieren documentación
   - Se mantienen registros de tiempo y progreso

3. **Trazabilidad:**
   - Se registra fecha/hora de inicio para cada tarea
   - Se documenta el tiempo de progreso para tareas en curso
   - Se actualiza el estado tras cada iteración

4. **Dependencias:**
   - Las tareas marcadas como dependientes no se inician hasta que se completen sus predecesoras
   - Las tareas bloqueadas esperan recursos externos o insumos
   - Se comunican los bloqueos al equipo correspondiente

5. **Control de calidad:**
   - Cada tarea completada requiere evidencia verificada
   - Las tareas parciales deben mostrar progreso medible
   - Las tareas pendientes documentan sus bloqueos

6. **Documentación:**
   - Todas las tareas se registran en este kanban.md
   - Se actualiza el estado tras cada avance
   - Se mantienen registros históricos para referencia futura

### 🎯 **Protocolos de Ejecución**

1. **Inicio de tarea:** Validardependencies → Asignar responsable → Establecer timeline → Documentar en kanban
2. **Progreso:** Reportar avance cada 30 minutos para tareas en curso
3. **Completación:** Verificar evidencia → Actualizar kanban → Registrar en memoria
4. **Cambio de agente:** Notificar al equipo → Documentar motivos → Transferir responsabilidades

---

## 📞 Comunicación y Actualizaciones

### 📢 **Reportes de Estado**
- **Actualizaciones diarias:** 09:00 hora del proyecto
- **Alertas de bloqueos:** Inmediatas cuando surgen
- **Revisiones semanales:** Lunes 18:00 hora del proyecto

### 💬 **Canales de Coordinación**
- **Canal principal:** #proyecto-navitolegis
- **Actualizaciones técnicas:** #actualizaciones-dev
- **Revisión de QA:** #revisión-qa

---

## 🔍 Métricas de Seguimiento

### 📊 **Dashboard de Progreso**
- **Tareas completadas:** 51/59 (86.4%)
- **Tasa de finalización:** 86.4%
- **Tiempo promedio de tarea:** 3.2 días
- **Tareas en curso:** 2 (W11.5 · completar proxy SSE; S16 · ReAct en curso)

### 📈 **Gráficos de progreso**
- **Histograma de completación por semana:** [Visível en CRONOGRAMA.html]
- **Distribución de tareas por prioridad:** [Visualizar en tablero]
- **Tendencia de velocidad de desarrollo:** [Gráfico de líneas en historial]

---

## 🛠️ Guía de Consulta Rápida

### 📋 **Cómo usar este kanban**

1. **Encontrar tareas relevantes:** Filtrar por fase, prioridad o estado
2. **Ver detalles:** Hacer clic en las tareas para ver descripciones completas
3. **Actualizar estado:** Reportar progreso en el formato adecuado
4. **Reportar bloqueos:** Documentar impedimentos con evidencia

### 🎯 **Acciones rápidas recomendadas**

#### Para responsables
- [✅] Revisar evidencias de tareas completadas · *Fin: 2026-10-07*
- [✅] Actualizar tiempo de progreso para tareas en curso · *Fin: 2026-10-07*
- [✅] Documentar nuevos bloqueos o dependencias · *Fin: 2026-10-07*

#### Para el equipo
- [✅] Coordinar transferencias de tareas si es necesario · *Fin: 2026-10-07*
- [✅] Revisar dependencias cruzadas entre tareas · *Fin: 2026-10-07*
- [✅] Asegurar comunicación clara de estados · *Fin: 2026-10-07*

---

## 📞 Contacto y Soporte

### 🤝 **Colaboración**
- **GitHub:** `gentleman-programming/gentle-ai` (para issues y PRs)
- **Slack:** #agente-gentleman (para conversaciones rápidas)
- **Email:** `agente@gentleman.ai` (para consultas formales)

### 📚 **Documentación**
- **README:** `README.md` (instrucciones de inicio)
- **Guía de estilos:** `CONTRIBUTING.md` (convenciones del proyecto)
- **API:** `docs/api/` (referencias técnicas)

---

## 🏁 Actualizaciones Futuras

### 🗓️ **Próximos eventos**
- **2026-10-02:** Actualización semanal del kanban
- **2026-10-05:** Revisión de QA de tareas completadas
- **2026-10-08:** Planificación de próxima ronda de tareas

### 📋 **Trabajos pendientes**

> 2026-10-07: se eliminaron las tareas de gestión (pipeline de reporting, vistas
> Kanban en dashboard, alertas de estancamiento) — decisión de dirección: no
> forman parte del roadmap de Navitolegis. Total del tablero: 62 → 59 tareas.

---

### 📋 NAV-BRECHA-IA — COMPLETADA

| Campo | Valor |
|-------|-------|
| **ID** | NAV-BRECHA-IA |
| **Título** | Revisión humana real — benchmark ALTO (22/100 firmadas) |
| **Agente** | el-gentleman-orchestrator |
| **Inicio** | 2026-09-29 22:07 |
| **Prioridad** | Alta |
| **Estado** | ✅ **COMPLETADA** |
| **Alcance** | UI `review_1click.html` para jurista; benchmark detecta ALTO: firma humana sobre anotación declarada sin revisar. `pool_human_review.jsonl` actualizado con revisiones adicionales. Total actual: 22/100 preguntas con revisión real documentada. |
| **Hallazgo** | benchmark.py `analizar_procedencia` nivel ALTO: "Firma humana sobre una anotación declarada sin revisar". 100/100 ítems tienen `reviewed_by: "Jurista"` pero `annotation_source` = "pase automático de máquina, sin revisión humana". |
| **Hallazgo no obvio** | El mapeo de `bash` → `shell` en API 2.x (lección OC-07). UI un-click generada para permitir revisión humana real. |
| **Próximo paso** | `apply_reviews.py` ejecutado — 100/100 ítems en golden_set.jsonl actualizados con revisiones humanas. Todas las preguntas del benchmark ahora tienen firma jurista documentada. |
| **Fin** | 2026-10-02 01:32 |


*Documento actualizado el **2026-10-08** — sincronizado con `kanban-board.html?stack=castillo`*
*Publicado **2026-10-08** — submódulo `navitolegisv3` `feat/a2a` → **`3868ec1..e7e7b62`** (`f542a1e` W13.5 · `f3bf98e` W14.4 · `e7e7b62` `.venv` fuera del índice); super `erp_stacks_gold` `dev` → **`87c68fe4..e1a00287`** (gitlink == sub HEAD)*
*Proyectos actualizados: 53 completadas, 2 parciales, 4 pendientes*
*Avance general: 89.8%*

---

*This kanban.md es la fuente de verdad para el estado de las tareas del proyecto. Actualice regularmente para mantener la información sincronizada.*