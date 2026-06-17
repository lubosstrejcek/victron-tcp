# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP server (stdio transport) that exposes a Victron Energy GX device to AI assistants as read-only tools, reading real-time data over **Modbus TCP** or **MQTT** on the local network. It is the local/LAN half of a pair; the cloud half is the separate `victron-vrm-mcp` repo. This package never speaks HTTP and is not reachable by the Anthropic MCP Connector directly.

## Commands

After a fresh clone there is no `node_modules` — run `npm install` first or `tsc`/`vitest` fail with "command not found".

```bash
npm run build      # tsc → dist/
npm run dev        # tsc --watch
npm start          # run compiled server (node dist/index.js)
npm test           # vitest run (whole suite)
npm run simulate   # local Modbus TCP simulator — test tools without real hardware
npm run convert <ccgx-xlsx> [evcs-xlsx]   # regenerate data/*.json from the Victron Excel register list
npm run inspect     # MCP Inspector against locally-built server
npm run inspect:npm # MCP Inspector against the published npm package
```

Run a single test file or test:
```bash
npx vitest run tests/decoders.test.ts
npx vitest run -t "decodeNumeric"
```

Node 18+. The project is ESM (`"type": "module"`, tsconfig `Node16`): **all relative imports must use the `.js` extension**, even when importing a `.ts` source file.

## Architecture

The request flow for every device tool is the same:

```
tool (src/tools/*.ts)
  → buildConnectionParams(input)        # helpers.ts: merge tool args + env config, pick transport
  → readDeviceRegisters(params, service, registers)   # transport.ts: dispatch
      → withModbusClient(...)  OR  withMqttClient(...)  # connect-per-request, then close
  → formatResults(title, results)  /  errorResult(error)  # helpers.ts
```

**Transport abstraction (`src/transport.ts`) is the key seam.** Both Modbus and MQTT return an identical `RegisterReadResult[]`, so tools and formatting are transport-agnostic. Modbus reads raw registers and decodes/scales them locally; MQTT reads already-scaled values from Venus OS topics. When the MQTT `deviceInstance` is omitted, a wildcard subscribe finds the first matching device.

**Tools are one-file-per-device-type** under `src/tools/`. Each exports a `registerXxxTools(server)` function; all are wired together in `src/tools/index.ts` → `registerAllTools()`. `src/server.ts` calls that plus `registerAllPrompts` and `registerAllResources`. Adding a device tool means: (1) ensure its category exists in `data/*.json` and is exported from `src/registers/index.ts`, (2) create `src/tools/<name>.ts` following the existing pattern (see `battery.ts` as the canonical template), (3) wire it into `registerAllTools()`.

**Registers are data, not code.** `data/ccgx-registers.json` (CCGX official list) and `data/evcs-registers.json` are loaded at import time by `src/registers/loader.ts` into `allCategories`. `src/registers/index.ts` exposes one named export per category (e.g. `batteryRegisters`) via lookup by D-Bus service string. To change which fields a tool reads, edit the JSON (or regenerate via `npm run convert`), not the tool.

Regenerating runtime data via `npm run convert` has sharp edges: `xlsx` is not a declared dependency — install the SheetJS **CDN** build ad-hoc (`npm i --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`; npm's `xlsx@0.18.5` lacks top-level `readFile` under ESM). SheetJS can only read a spreadsheet inside the repo dir (not `/tmp`). The converter normalizes Type-column typos and skips `RESERVED` rows; if a Victron sheet adds a category, update the loader test's category count.

**Config (`src/config.ts`)** centralizes all `process.env` access behind a lazily-loaded `config` Proxy. Read configuration through `config`, never `process.env` directly in tools. Tool-call arguments always override env defaults inside `buildConnectionParams`.

## Critical constraints

- **stdout is reserved for the JSON-RPC stream.** All logging goes to **stderr** via `src/logger.ts` (`log.info/warn/error`). Never `console.log` or write to stdout. The logger redacts sensitive keys (token, password, secret, …) from context.
- **Modbus batching uses `maxGap = 0`** (`src/modbus/decoders.ts` `groupIntoBatches`). The Victron FAQ warns that including a non-existent register in a batch read fails the *entire* request, so only truly consecutive registers are batched. Do not "optimize" by allowing gaps.
- **Disconnected-sensor sentinels** (`0xFFFF` for uint16, `0x7FFF` for int16, etc.) decode to the string `"Not available"` and are filtered out of formatted output — don't treat them as real values.
- **All current tools are read-only**, declared via `READ_ONLY_ANNOTATIONS` in `helpers.ts`. Write support is a planned Phase 2 (MQTT `W/` topics); `WRITE_ANNOTATIONS` and `data/ess-control-registers.json` are placeholders for it. Discovery tools and `victron_evcs_status` use `openWorldHint: true`; `evcs`, `discover`, and raw register tools are **Modbus-only**.
- Device-status tools return `{ readings: [...] }` (`outputSchemas.readings` in `src/tools/output_schemas.ts`); discovery/doc tools have their own output shapes. Reuse these shared shapes rather than inlining new ones.

## Coding conventions

- TypeScript strict mode; typed interfaces over `any`. Keep `.js` import extensions.
- Errors flow through `errorResult()`, which calls `enrichErrorMessage()` to turn raw socket errors (ECONNREFUSED, ETIMEDOUT, …) into actionable hints so the LLM can self-correct. Add new error mappings there, not in individual tools.
- Comments explain *why* (e.g. the `maxGap=0` rationale), not *what*.
