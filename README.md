<!-- mcp-name: io.github.lubosstrejcek/victron-tcp -->

# Victron TCP — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects to Victron Energy GX devices via **Modbus TCP** or **MQTT** on your local network. Get direct, low-latency access to real-time solar, battery, grid, and inverter data — no cloud required.

Built from the official [CCGX Modbus TCP register list](https://www.victronenergy.com/support-and-downloads/technical-information) (Rev 50, 900+ registers across 33 device categories). Supports both Modbus TCP (direct register reads) and MQTT (Venus OS built-in broker) transports.

## Features

- **28 specialized tools** for reading Victron device data
- **Dual transport** — Modbus TCP (port 502) or MQTT (port 1883), selectable per request or via environment variables
- **900+ registers** from the complete Modbus TCP register map
- **33 device categories** — system, battery, solar, inverter, grid, genset, alternator, charger, DC-DC, tank, temperature, GPS, meteo, and more
- **MQTT auto-discovery** — detect portal ID, list all services with device instances, and get ready-to-paste config
- **Device discovery** — automatically find all connected devices and their unit IDs (Modbus) or service instances (MQTT)
- **Generic category reader** — read any device category by service name, even those without a dedicated tool
- **Raw register access** — read any register by address for advanced use
- **Environment variable config** — set `VICTRON_HOST`, `VICTRON_TRANSPORT`, `VICTRON_PORTAL_ID` once, skip repetitive parameters
- **Stateless connections** — connect-per-request, no persistent state to manage
- **Read-only** — Phase 1 is read-only, all tools annotated with `readOnlyHint: true`

## Supported Devices

Works with any Victron GX device running [Venus OS](https://github.com/victronenergy/venus) with Modbus TCP or MQTT enabled:

| Device | Description |
|--------|-------------|
| **Ekrano GX** | Touch-screen GX device with 7" display |
| **Cerbo GX** | Most popular GX device, versatile connectivity |
| **Venus GX** | Original GX device |
| **CCGX** | Color Control GX (legacy) |
| **Octo GX** | 8 VE.Direct ports for large systems |
| **MultiPlus-II GX** | Inverter/charger with built-in GX |
| **EasySolar-II GX** | All-in-one solar solution with GX |
| **GlobalLink 520** | Remote monitoring gateway |

Also works with any device running Venus OS Large, including Raspberry Pi installations.

### Supported Accessories

These accessories connect to a GX device via USB or VE.Direct and their data is accessible through the GX device's Modbus TCP interface:

| Accessory | Connection | Data Available Via |
|-----------|------------|-------------------|
| **GX IO-Extender 150** | USB | Digital inputs/outputs, relays → `digitalinput` registers |
| **GX Tank 140** | USB | Tank levels → `victron_tank_levels` |
| **GX LTE 4G / GX GSM** | USB | Connectivity module (no register data) |
| **VE.Direct devices** (MPPT, BMV, Phoenix, etc.) | VE.Direct | Solar → `victron_solar_status`, Battery → `victron_battery_status`, Inverter → `victron_inverter_status` |
| **VE.Bus devices** (Multi, Quattro) | VE.Bus | `victron_vebus_status` |
| **VE.Can devices** (Lynx, MPPT RS, etc.) | VE.Can | Various tools depending on device type |
| **Energy meters** (EM24, EM540, ET series) | Wired/wireless | `victron_grid_status` |
| **Temperature sensors** | Connected via GX or IO-Extender | `victron_temperature` |

All accessory data flows through the GX device — you always connect to the GX device's IP address, never to the accessories directly.

## Prerequisites

1. **A Victron GX device** on your local network
2. **At least one transport enabled** on the GX device:
   - **Modbus TCP**: Go to **Settings → Services → Modbus TCP** → Enable (or **Settings → Integrations → Modbus TCP server** on Venus OS 3.x)
   - **MQTT**: Enabled by default on Venus OS. The built-in MQTT broker runs on port 1883 with no authentication.
3. **Node.js 18+** installed

## Installation

### Option 1: npx (no install needed)

```bash
npx victron-tcp
```

### Option 2: Clone and build

```bash
git clone https://github.com/lubosstrejcek/victron-tcp.git
cd victron-tcp
npm install
npm run build
```

## Quick Start

### Claude Code (recommended)

The fastest way — one command:

```bash
claude mcp add --transport stdio victron-tcp -- npx victron-tcp
```

Or if you built from source:

```bash
claude mcp add --transport stdio victron-tcp -- node /absolute/path/to/victron-tcp/dist/index.js
```

### Claude Code — with environment variables

Pre-configure the host and transport so you don't have to pass them on every tool call:

```bash
claude mcp add --transport stdio \
  -e VICTRON_HOST=192.168.1.50 \
  -e VICTRON_TRANSPORT=mqtt \
  -e VICTRON_PORTAL_ID=ca0f0e2e2261 \
  victron-tcp -- npx victron-tcp
```

### Claude Code — Project scope (share with your team)

Add a `.mcp.json` file to your project root and commit it:

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["victron-tcp"],
      "env": {
        "VICTRON_HOST": "192.168.1.50",
        "VICTRON_TRANSPORT": "mqtt",
        "VICTRON_PORTAL_ID": "your-portal-id"
      }
    }
  }
}
```

Omit the `env` block to pass parameters per tool call instead.

### Claude Code — User scope (all your projects)

```bash
claude mcp add --transport stdio --scope user victron-tcp -- npx victron-tcp
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["-y", "victron-tcp"],
      "env": {
        "VICTRON_HOST": "192.168.1.50",
        "VICTRON_TRANSPORT": "mqtt",
        "VICTRON_PORTAL_ID": "your-portal-id"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for all projects):

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["-y", "victron-tcp"],
      "env": {
        "VICTRON_HOST": "192.168.1.50",
        "VICTRON_TRANSPORT": "mqtt",
        "VICTRON_PORTAL_ID": "your-portal-id"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["-y", "victron-tcp"],
      "env": {
        "VICTRON_HOST": "192.168.1.50",
        "VICTRON_TRANSPORT": "mqtt",
        "VICTRON_PORTAL_ID": "your-portal-id"
      }
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport. The JSON format is the same — `mcpServers` → `command` + `args` + `env`. Add it to your client's MCP configuration file.

## Available Tools

### Core Monitoring Tools

| Tool | Description | Default Unit ID |
|------|-------------|-----------------|
| `victron_system_overview` | Battery SOC, voltage, current, PV power, grid power, AC consumption, Dynamic ESS status | 100 |
| `victron_battery_status` | Detailed battery: SOC, voltage, current, power, temperature, cell data, time-to-go, history | per device |
| `victron_solar_status` | PV voltage, current, power, yield today/yesterday/total, charger state, tracker data | per device |
| `victron_grid_status` | Grid power per phase (L1/L2/L3), voltage, current, frequency, energy counters | per device |
| `victron_vebus_status` | Multi/Quattro: AC in/out power, input current limit, mode, state, alarms, ESS settings | per device |
| `victron_tank_levels` | Tank level, capacity, remaining, fluid type (fuel, fresh water, waste, etc.) | per device |
| `victron_temperature` | Temperature readings with sensor type (battery, fridge, generic), humidity, pressure | per device |
| `victron_inverter_status` | Standalone inverter: AC output, state, alarms (Phoenix, Inverter RS) | per device |
| `victron_evcs_status` | EV Charging Station (direct connection): power, status, session energy, temperatures | 1 |

### Extended Device Tools

| Tool | Description | Default Unit ID |
|------|-------------|-----------------|
| `victron_multi_status` | Multi RS inverter/charger: AC in/out per phase, battery data, charge/inverter state, alarms | 100 |
| `victron_pvinverter_status` | AC-coupled PV inverters (Fronius, SolarEdge, ABB): power per phase, energy totals, power limit | 31 |
| `victron_genset_status` | AC genset controllers (Fischer Panda, ComAp, DSE, CRE, DEIF): 3-phase AC, engine data, oil/coolant/exhaust temps | 23 |
| `victron_dcgenset_status` | DC generators (Fischer Panda, Hatz fiPMG): DC voltage/current, engine data, temperatures, error codes | 100 |
| `victron_alternator_status` | NMEA 2000 alternators (Wakespeed WS500, Arco Zeus, Revatek Altion): voltage/current, RPM, field drive % | 100 |
| `victron_charger_status` | AC chargers (Skylla-i, Skylla-IP44, Smart IP43, Blue Smart IP22): up to 3 outputs, charge state, alarms | 100 |
| `victron_dcdc_status` | Orion XS DC-DC converter: battery voltage/current/temperature, input power, charge state | 100 |
| `victron_acload_status` | AC load / current sensors: per-phase power, voltage, current, energy totals, frequency | 100 |
| `victron_dcenergy_status` | DC energy meters (SmartShunts in DC meter mode): voltage, current, energy. Types: source, load, system | 100 |
| `victron_gx_info` | GX device identity: serial number, relay states, system time | 100 |
| `victron_digital_inputs` | Digital input state (open/closed), input type (door, bilge, alarm, generator), pulse count | 100 |
| `victron_gps_status` | GPS position: latitude, longitude, altitude, course, speed, fix status, satellite count | 100 |
| `victron_meteo_status` | IMT Solar irradiance sensors: irradiance (W/m²), wind speed, cell/external temperatures | 100 |
| `victron_generator_status` | GX generator auto start/stop: runtime, start condition, quiet hours, service countdown, alarms | 100 |

### Discovery & Utility Tools

| Tool | Description |
|------|-------------|
| `victron_mqtt_discover` | Auto-discover portal ID, list all MQTT services and device instances, output ready-to-paste config |
| `victron_discover` | Scan Modbus unit IDs to find all connected devices and their types |
| `victron_read_category` | Read all registers for any device category by service name (partial match supported) |
| `victron_read_register` | Read raw register(s) by address — advanced/debugging (Modbus only) |
| `victron_list_registers` | List all available registers for a device category |

### Tool Annotations

All tools include [MCP tool annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) for better client integration:

| Annotation | Value | Meaning |
|------------|-------|---------|
| `readOnlyHint` | `true` | Tools only read data, never modify device state |
| `destructiveHint` | `false` | No risk of data loss or system changes |
| `idempotentHint` | `true` | Safe to call repeatedly with same parameters |
| `openWorldHint` | `false` | Operates on local network only (except `victron_discover` which scans the LAN and `victron_evcs_status` which connects to EVCS devices) |

### Common Parameters

All monitoring tools accept:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` | string | required* | GX device IP address or hostname |
| `port` | number | 502 | Modbus TCP port |
| `unitId` | number | varies | Modbus unit ID (use `victron_discover` to find) |
| `transport` | string | `"modbus"` | Transport protocol: `"modbus"` or `"mqtt"` |
| `mqttHost` | string | same as `host` | MQTT broker hostname (if different from Modbus host) |
| `mqttPort` | number | 1883 | MQTT broker port |
| `portalId` | string | — | Venus OS portal ID for MQTT (use `victron_mqtt_discover` to find) |
| `deviceInstance` | string/number | — | MQTT device instance (omit to auto-detect via wildcard) |

*\*Can be set via `VICTRON_HOST` environment variable.*

### Environment Variables

Set these to avoid repeating parameters on every tool call:

| Variable | Description | Example |
|----------|-------------|---------|
| `VICTRON_HOST` | Default host for all connections | `192.168.1.50` |
| `VICTRON_TRANSPORT` | Default transport (`modbus` or `mqtt`) | `mqtt` |
| `VICTRON_MODBUS_PORT` | Default Modbus TCP port | `502` |
| `VICTRON_MQTT_PORT` | Default MQTT broker port | `1883` |
| `VICTRON_PORTAL_ID` | Default portal ID for MQTT | `ca0f0e2e2261` |
| `VICTRON_UNIT_ID` | Default Modbus unit ID | `100` |

Tool arguments always override environment variables.

## Usage Examples

### Example 1: Discover your system

**Prompt:**
```
What Victron devices are connected to my GX at 192.168.1.50?
```

**What the AI will do:**
1. Call `victron_discover` with host `192.168.1.50`
2. Scan unit IDs 0–247, probing each for known device types
3. Return a table of all connected devices with their unit IDs, service types, and names

---

### Example 2: Full system overview

**Prompt:**
```
Show me the current state of my solar system at 192.168.1.50 — battery, solar, grid, everything.
```

**What the AI will do:**
1. Call `victron_system_overview` to get battery SOC, voltage, current, PV power, grid import/export, AC consumption, and ESS status
2. Present the data in a readable summary with all key metrics

---

### Example 3: Monitor battery health

**Prompt:**
```
How is my battery doing? GX is at 192.168.1.50, battery monitor is unit 225.
I want SOC, voltage, temperature, and time-to-go.
```

**What the AI will do:**
1. Call `victron_battery_status` with host and unitId 225
2. Read all 108 battery registers: SOC, voltage, current, power, temperature, cell min/max, consumed Ah, time-to-go, cycle history
3. Highlight any concerning values (low SOC, high temperature, cell imbalance)

---

### Example 4: Check solar production

**Prompt:**
```
What's my solar production right now and how much energy did I generate today?
GX at 192.168.1.50, solar charger unit 226.
```

**What the AI will do:**
1. Call `victron_solar_status` with unitId 226
2. Read PV voltage, current, power, charger state, yield today/yesterday/total, and tracker data
3. Show current production and daily energy yield

---

### Example 5: Multi-phase grid analysis

**Prompt:**
```
Show me the grid power on all three phases. Are we importing or exporting?
GX at 192.168.1.50, grid meter unit 30.
```

**What the AI will do:**
1. Call `victron_grid_status` with unitId 30
2. Read per-phase power (L1/L2/L3), voltage, current, frequency, and energy counters
3. Calculate total grid power and indicate import (positive) vs export (negative)

---

### Example 6: Monitor all tanks

**Prompt:**
```
What are my tank levels? I have a fresh water tank on unit 20
and a fuel tank on unit 21. GX at 192.168.1.50.
```

**What the AI will do:**
1. Call `victron_tank_levels` for each unit ID (20 and 21)
2. Read tank level percentage, capacity, remaining volume, fluid type, and status
3. Present a clear summary of each tank

---

### Example 7: Inverter/charger status (Multi or Quattro)

**Prompt:**
```
What's the status of my MultiPlus-II? Check AC input, AC output, current limits,
and any active alarms. GX at 192.168.1.50, VE.Bus unit 227.
```

**What the AI will do:**
1. Call `victron_vebus_status` with unitId 227
2. Read AC input/output voltage, current, power per phase, input current limit, mode, state, alarms, and ESS settings
3. Flag any active alarms or warnings

---

### Example 8: Read a specific register by address

**Prompt:**
```
Read register 840 (battery voltage) at unit 100 from my GX at 192.168.1.50.
It's a uint16 with scale factor 10.
```

**What the AI will do:**
1. Call `victron_read_register` with address 840, dataType "uint16", scaleFactor 10
2. Return the raw and decoded value (e.g., raw 488 → 48.8V)

---

### Example 9: Explore available registers

**Prompt:**
```
What registers are available for the solar charger? I want to know what data I can read.
```

**What the AI will do:**
1. Call `victron_list_registers` with category "solarcharger"
2. Return all 55 registers with their address, name, data type, unit, and dbus path

---

### Example 10: Daily energy report

**Prompt:**
```
Give me a daily energy report for my system at 192.168.1.50.
I want solar yield, grid import/export, battery cycles, and total consumption.
Solar charger is unit 226, grid meter is unit 30, VE.Bus is unit 227.
```

**What the AI will do:**
1. Call `victron_system_overview` for overall consumption and battery data
2. Call `victron_solar_status` (unit 226) for today's solar yield
3. Call `victron_grid_status` (unit 30) for grid energy counters
4. Call `victron_vebus_status` (unit 227) for inverter/charger energy data
5. Compile all data into a comprehensive daily energy report

### Example 11: EV Charging Station status

**Prompt:**
```
What's the status of my Victron EV Charging Station? It's at 192.168.1.60.
Is it charging? How much power is it using? What's the session energy so far?
```

**What the AI will do:**
1. Call `victron_evcs_status` with host `192.168.1.60` (connecting directly to the EVCS, not the GX)
2. Read charger status, L1/L2/L3 power, charging current, mode, session energy, temperatures
3. Show charging status with human-readable labels (Disconnected, Charging, Charged, etc.)

---

### Example 12: Discover MQTT services

**Prompt:**
```
Discover what services are available via MQTT on my GX at 192.168.1.50.
```

**What the AI will do:**
1. Call `victron_mqtt_discover` with mqttHost `192.168.1.50`
2. Auto-detect the portal ID from the MQTT broker
3. List all available services (battery, solarcharger, vebus, grid, etc.) with their device instances
4. Output a ready-to-paste MCP server config with the discovered portal ID and environment variables

---

### Example 13: Read data via MQTT

**Prompt:**
```
Show me battery status via MQTT. GX at 192.168.1.50, portal ID ca0f0e2e2261.
```

**What the AI will do:**
1. Call `victron_battery_status` with `transport: "mqtt"`, host `192.168.1.50`, portalId `ca0f0e2e2261`
2. Subscribe to MQTT topics for battery data, collect pre-scaled values
3. Return the same formatted output as the Modbus path — SOC, voltage, current, temperature, etc.

---

## Modbus TCP vs MQTT

| | Modbus TCP | MQTT |
|---|-----------|------|
| **Port** | 502 | 1883 |
| **Setup** | Must enable on GX | Enabled by default |
| **Device addressing** | Unit ID (0–247) | Service type + device instance |
| **Discovery** | `victron_discover` (scans unit IDs) | `victron_mqtt_discover` (instant) |
| **Data format** | Raw registers with scale factors | Pre-scaled JSON values |
| **Best for** | Direct register access, raw reads | Easy setup, no unit ID hunting |
| **Limitations** | Must enable Modbus TCP on GX, unit IDs are dynamic | Requires portal ID (auto-discovered) |

Both transports return identical output. You can switch between them by changing the `transport` parameter or the `VICTRON_TRANSPORT` environment variable.

## Finding Unit IDs

Unit IDs identify specific devices on the Modbus bus. There are two ways to find them:

### 1. Use the discover tool

The `victron_discover` tool scans unit IDs 0-247 and reports what it finds. This is the easiest method.

### 2. Check the GX device

On the GX device, go to:
- **Settings → Integrations → Modbus TCP server → Available services**
- This shows each service with its assigned unit ID

### Common Unit ID Defaults

| Unit ID | Service |
|---------|---------|
| 100 | System overview (com.victronenergy.system) |
| 227 | VE.Bus (first Multi/Quattro on Cerbo GX) |
| 247 | First VE.Direct device (CCGX) |
| 226 | VE.Direct port 1 (Cerbo GX) |

Note: Since Venus OS 2.60, unit IDs are assigned dynamically. Always verify with `victron_discover` or the GX device settings.

## Register Map

The complete register map is derived from Victron's official CCGX Modbus TCP register list v3.60 (Rev 50). It covers 33 device categories:

<details>
<summary>All supported device categories (click to expand)</summary>

| Category | Service | Registers |
|----------|---------|-----------|
| System | com.victronenergy.system | 53 |
| Battery | com.victronenergy.battery | 108 |
| VE.Bus | com.victronenergy.vebus | 94 |
| Solar Charger | com.victronenergy.solarcharger | 55 |
| Inverter | com.victronenergy.inverter | 51 |
| Genset | com.victronenergy.genset | 45 |
| Multi RS | com.victronenergy.multi | 105 |
| AC System | com.victronenergy.acsystem | 42 |
| EVCS (direct) | victron.evcs | 42 |
| Settings | com.victronenergy.settings | 34 |
| Grid Meter | com.victronenergy.grid | 32 |
| DC Genset | com.victronenergy.dcgenset | 26 |
| PV Inverter | com.victronenergy.pvinverter | 24 |
| AC Load | com.victronenergy.acload | 22 |
| Alternator | com.victronenergy.alternator | 20 |
| EV Charger (via GX) | com.victronenergy.evcharger | 17 |
| Charger | com.victronenergy.charger | 16 |
| DC System | com.victronenergy.dcsystem | 12 |
| Fuel Cell | com.victronenergy.fuelcell | 11 |
| DC Source | com.victronenergy.dcsource | 11 |
| DC Load | com.victronenergy.dcload | 11 |
| DC-DC | com.victronenergy.dcdc | 11 |
| Generator | com.victronenergy.generator | 11 |
| Temperature | com.victronenergy.temperature | 9 |
| GPS | com.victronenergy.gps | 7 |
| Tank | com.victronenergy.tank | 6 |
| Motor Drive | com.victronenergy.motordrive | 6 |
| Heat Pump | com.victronenergy.heatpump | 6 |
| Meteo | com.victronenergy.meteo | 5 |
| Digital Input | com.victronenergy.digitalinput | 4 |
| Pulse Meter | com.victronenergy.pulsemeter | 2 |
| Hub-4 | com.victronenergy.hub4 | 2 |
| Pump | com.victronenergy.pump | 1 |

</details>

## Architecture

```
victron-tcp/
├── src/
│   ├── index.ts              # Entry point (stdio transport)
│   ├── server.ts             # MCP server setup
│   ├── config.ts             # Environment variable config (VICTRON_HOST, VICTRON_TRANSPORT, etc.)
│   ├── transport.ts          # Unified transport abstraction (Modbus or MQTT → same result)
│   ├── modbus/
│   │   ├── client.ts         # Modbus TCP client + withModbusClient() wrapper
│   │   ├── decoders.ts       # Data decoding, batch grouping, error wrapping
│   │   └── types.ts          # RegisterDefinition, RegisterCategory interfaces
│   ├── mqtt/
│   │   ├── client.ts         # VictronMqttClient + withMqttClient() wrapper
│   │   └── decoders.ts       # MQTT topic building, payload parsing, value conversion
│   ├── registers/
│   │   ├── index.ts          # Named exports for all 33 categories
│   │   └── loader.ts         # Loads JSON register databases at import time
│   └── tools/                # MCP tool implementations (one file per device type)
│       ├── index.ts          # registerAllTools() — wires all 28 tools
│       ├── helpers.ts        # Shared schemas, transport params, formatResults(), errorResult()
│       ├── mqtt-discover.ts  # victron_mqtt_discover
│       ├── system.ts         # victron_system_overview
│       ├── battery.ts        # victron_battery_status
│       ├── solar.ts          # victron_solar_status
│       ├── grid.ts           # victron_grid_status
│       ├── vebus.ts          # victron_vebus_status
│       ├── tanks.ts          # victron_tank_levels
│       ├── temperature.ts    # victron_temperature
│       ├── inverter.ts       # victron_inverter_status
│       ├── evcs.ts           # victron_evcs_status (Modbus only — direct EVCS connection)
│       ├── multi.ts          # victron_multi_status
│       ├── pvinverter.ts     # victron_pvinverter_status
│       ├── genset.ts         # victron_genset_status
│       ├── dcgenset.ts       # victron_dcgenset_status
│       ├── alternator.ts     # victron_alternator_status
│       ├── charger.ts        # victron_charger_status
│       ├── dcdc.ts           # victron_dcdc_status
│       ├── acload.ts         # victron_acload_status
│       ├── dcenergy.ts       # victron_dcenergy_status
│       ├── gx-info.ts        # victron_gx_info
│       ├── digital-inputs.ts # victron_digital_inputs
│       ├── gps.ts            # victron_gps_status
│       ├── meteo.ts          # victron_meteo_status
│       ├── generator.ts      # victron_generator_status
│       ├── discover.ts       # victron_discover (Modbus only — scans unit IDs)
│       ├── category.ts       # victron_read_category
│       └── raw.ts            # victron_read_register + victron_list_registers (Modbus only)
├── data/
│   ├── ccgx-registers.json   # 859 registers across 32 CCGX categories
│   ├── evcs-registers.json   # 42 EVCS direct connection registers
│   ├── enum-overrides.json   # Human-readable labels for enum values
│   └── ess-control-registers.json  # Reserved for Phase 2 write support
├── tests/                    # Vitest test suite
├── scripts/
│   ├── convert-excel.ts      # Convert Victron Excel spreadsheet → JSON
│   └── modbus-simulator.ts   # Local Modbus TCP simulator for testing
├── server.json               # MCP Registry metadata
└── dist/                     # Compiled output
```

## How It Works

### Modbus TCP transport (default)

1. **Connection per request** — Each tool call opens a Modbus TCP connection, reads the requested registers, and closes the connection. Simple and stateless.
2. **Batch reads** — Consecutive registers are read in a single Modbus request for efficiency.
3. **Data decoding** — Raw register values are decoded according to their data type (uint16, int16, uint32, int32, uint64, string) and scale factor.
4. **Enum mapping** — Numeric values are mapped to human-readable labels where applicable (e.g., battery state: 0 → "Idle", 1 → "Charging", 2 → "Discharging").
5. **Disconnected detection** — Values like 0xFFFF (uint16) or 0x7FFF (int16) indicate a disconnected sensor and are shown as "Not available".
6. **Error handling** — Modbus errors return `isError: true` with actionable messages, allowing the LLM to self-correct (e.g., suggest checking the unit ID).

### MQTT transport

1. **Connection per request** — Each tool call connects to the Venus OS MQTT broker, subscribes to topics, collects data, and disconnects.
2. **Topic structure** — Data lives at `N/{portalId}/{serviceType}/{deviceInstance}/{dbusPath}`. The server subscribes to the relevant topics for each register.
3. **Pre-scaled values** — Venus OS publishes already-scaled values via MQTT (JSON `{"value": ...}`), so no scale factor math is needed.
4. **Keepalive** — The server publishes to `R/{portalId}/keepalive` to trigger data publication from the GX device.
5. **Wildcard discovery** — When `deviceInstance` is omitted, the server uses MQTT wildcards (`+`) to find the first matching device automatically.
6. **Same output** — Both transports produce identical `RegisterReadResult` arrays, so tools and formatting work unchanged.

## Troubleshooting

### "Connection timeout" or "ECONNREFUSED"
- Verify the GX device IP address is correct
- Check that Modbus TCP is enabled: **Settings → Services → Modbus TCP**
- Ensure no firewall is blocking port 502
- Try pinging the GX device: `ping 192.168.1.50`

### "Illegal Data Address" errors
- The register might not be supported by your device/firmware version
- Use `victron_list_registers` to see available registers
- Check that you're using the correct unit ID for the device

### "Gateway Target Device Failed to Respond"
- The unit ID doesn't correspond to any connected device
- Run `victron_discover` to find valid unit IDs
- The device might be temporarily offline or disconnected

### No devices found during discovery
- Modbus TCP must be enabled on the GX device
- The scan range might not include your device's unit ID
- Try specifying a narrower range if the scan is timing out

### MQTT "Connection timeout"
- Verify the GX device IP address is correct
- Check that the MQTT broker is running: `mosquitto_sub -h 192.168.1.50 -t '#' -C 1`
- The default MQTT port is 1883 (no authentication required)
- Venus OS enables MQTT by default — if it's not working, the device may not be reachable

### MQTT "Portal ID discovery timeout"
- The GX device may need a moment to start publishing after boot
- Try running `victron_mqtt_discover` again after a few seconds
- Verify the MQTT broker has data: `mosquitto_sub -h 192.168.1.50 -t 'N/+/system/+/Serial' -C 1`

### MQTT returns "Not available" for all registers
- The portal ID may be incorrect — run `victron_mqtt_discover` to auto-detect it
- The device instance may not match — omit `deviceInstance` to use wildcard auto-detection
- Publish a keepalive to trigger data: the server does this automatically, but stale brokers may need a moment

### Debugging on the GX device
- **Error log on the GX**: Go to **Settings → Services → Modbus TCP** — the last error is shown on this page
- **SSH debug log**: Connect via SSH and check `/var/log/dbus-modbustcp/current` for detailed request/error logs
- **Unit ID mapping**: The GX assigns unit IDs dynamically. Check **Settings → Services → Modbus TCP → Available services** to see the current mapping

## FAQ

<details>
<summary><strong>What hardware do I need?</strong></summary>

Any Victron GX device (Ekrano, Cerbo, Venus GX, CCGX, etc.) with Modbus TCP enabled. The GX device must be on the same local network as the machine running this MCP server. No cloud account or VRM portal access is required.
</details>

<details>
<summary><strong>How do I enable Modbus TCP on the GX device?</strong></summary>

On the GX device, go to **Settings → Services → Modbus TCP** and enable it. On Venus OS 3.x, the path may be **Settings → Integrations → Modbus TCP server**. The default port is 502.
</details>

<details>
<summary><strong>How do I find the IP address of my GX device?</strong></summary>

Check your router's DHCP client list, or look on the GX device itself under **Settings → Ethernet** or **Settings → WiFi**. You can also try `ping cerbo.local` or `ping venus.local` if mDNS is supported on your network.
</details>

<details>
<summary><strong>What are unit IDs and how do I find them?</strong></summary>

Unit IDs are Modbus addresses that identify specific devices on the GX bus. Unit ID 100 is always the system overview. Other devices get dynamically assigned IDs. Use the `victron_discover` tool to scan all unit IDs, or check the GX device at **Settings → Services → Modbus TCP → Available services**.
</details>

<details>
<summary><strong>Should I use Modbus TCP or MQTT?</strong></summary>

Both transports return identical data. **MQTT** is easier to set up — it's enabled by default, doesn't require unit IDs, and auto-discovers devices. **Modbus TCP** gives you raw register access and works with the `victron_read_register` tool for advanced debugging. If you're unsure, start with MQTT and `victron_mqtt_discover`.
</details>

<details>
<summary><strong>What is a portal ID and how do I find it?</strong></summary>

The portal ID is a unique identifier for your Venus OS installation (e.g., `ca0f0e2e2261`). It's used as the root of all MQTT topics. Run `victron_mqtt_discover` to auto-detect it, or find it on the GX device under **Settings → VRM online portal → VRM Portal ID**.
</details>

<details>
<summary><strong>Can I use MQTT without knowing device instance numbers?</strong></summary>

Yes. When you omit the `deviceInstance` parameter, the server uses MQTT wildcard subscriptions (`+`) to automatically find the first matching device for each service type. This works for most setups. If you have multiple devices of the same type, specify the instance to target a specific one.
</details>

<details>
<summary><strong>Can this MCP server control my system (write values)?</strong></summary>

Not yet. Phase 1 is read-only — all tools are annotated with `readOnlyHint: true`. Phase 2 will add write support for ESS mode control, grid setpoints, charge current limits, and relay control.
</details>

<details>
<summary><strong>Does this work with the Victron EV Charging Station (EVCS)?</strong></summary>

Yes, fully. Two options: (1) Use `victron_evcs_status` to connect directly to the EVCS device's own Modbus TCP server (42 registers — power per phase, status, session energy, mode, temperatures, error codes). (2) Read the 17 GX-proxied registers via `victron_read_category` with category "evcharger" if the EVCS is connected through a GX device.
</details>

<details>
<summary><strong>How many registers does this cover?</strong></summary>

901 registers across 33 device categories — the complete official CCGX Modbus TCP register list v3.60 (Rev 50) with 859 registers, plus 42 registers for direct EV Charging Station connections. Every service from `com.victronenergy.system` to `com.victronenergy.pump` is included.
</details>

<details>
<summary><strong>Is this safe to use? Can it damage my system?</strong></summary>

Yes, it's safe. Phase 1 is completely read-only. The server never writes to any registers. All tools are annotated with `readOnlyHint: true` and `destructiveHint: false`. Each connection is opened, registers are read, and the connection is closed — no persistent state.
</details>

<details>
<summary><strong>Does this work with Venus OS Large on a Raspberry Pi?</strong></summary>

Yes. Any device running Venus OS with Modbus TCP enabled works — including Raspberry Pi installations running Venus OS Large.
</details>

<details>
<summary><strong>What MCP clients are supported?</strong></summary>

Any MCP client that supports stdio transport: Claude Code, Claude Desktop, Cursor, Windsurf, Cline, and others. See the Quick Start section for setup instructions for each client.
</details>

## Claude Desktop Extension

This server is also available as a Claude Desktop Extension (`.mcpb`) for one-click installation:

1. Download the `.mcpb` file from the [Releases](https://github.com/lubosstrejcek/victron-tcp/releases) page
2. Double-click to open with Claude Desktop
3. Click **Install**

To build the extension from source:

```bash
npm run build
npx @anthropic-ai/mcpb pack
```

## Roadmap

- [ ] **Phase 2**: Write support — ESS mode control, grid setpoint, charge current limits, relay control (registers 2700–2709, Mode 2/3 setpoints)
- [ ] **Phase 3**: Resources — real-time monitoring via MCP resources with SSE subscriptions
- [ ] Claude Desktop Extension publishing
- [ ] NPM package publishing

## References

- [Victron Modbus TCP FAQ](https://www.victronenergy.com/live/ccgx:modbustcp_faq)
- [CCGX Modbus TCP Register List (Excel)](https://www.victronenergy.com/support-and-downloads/technical-information)
- [ESS Design & Installation Manual](https://www.victronenergy.com/media/pg/Energy_Storage_System/en/index-en.html)
- [Venus OS on GitHub](https://github.com/victronenergy/venus)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [MCP Tools Specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- [Venus OS MQTT documentation](https://github.com/victronenergy/dbus-mqtt)
- [venus-docker — Venus OS simulator](https://github.com/victronenergy/venus-docker)
- [modbus-serial npm package](https://www.npmjs.com/package/modbus-serial)
- [mqtt.js npm package](https://www.npmjs.com/package/mqtt)

## License

MIT
