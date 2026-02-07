<!-- mcp-name: io.github.lubosstrejcek/victron-tcp -->

# Victron TCP — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects to Victron Energy GX devices via **Modbus TCP** on your local network. Get direct, low-latency access to real-time solar, battery, grid, and inverter data — no cloud required.

Built from the official [CCGX Modbus TCP register list](https://www.victronenergy.com/support-and-downloads/technical-information) (Rev 50, 860+ registers across 32 device categories).

## Features

- **12 specialized tools** for reading Victron device data
- **860+ registers** from the complete Modbus TCP register map
- **32 device categories** — system, battery, solar, inverter, grid, tank, temperature, and more
- **Device discovery** — automatically find all connected devices and their unit IDs
- **Raw register access** — read any register by address for advanced use
- **Stateless connections** — connect-per-request, no persistent state to manage
- **Read-only** — Phase 1 is read-only, all tools annotated with `readOnlyHint: true`

## Supported Devices

Works with any Victron GX device running [Venus OS](https://github.com/victronenergy/venus) with Modbus TCP enabled:

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
2. **Modbus TCP enabled** on the GX device:
   - Go to **Settings → Services → Modbus TCP** → Enable
   - Or: **Settings → Integrations → Modbus TCP server** → Enable (Venus OS 3.x)
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

### Claude Code — Project scope (share with your team)

Add a `.mcp.json` file to your project root and commit it:

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["victron-tcp"]
    }
  }
}
```

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
      "args": ["-y", "victron-tcp"]
    }
  }
}
```

### Cursor / Windsurf / Other MCP Clients

The server uses stdio transport. Add it to your MCP client's configuration:

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "npx",
      "args": ["-y", "victron-tcp"]
    }
  }
}
```

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

### Utility Tools

| Tool | Description |
|------|-------------|
| `victron_discover` | Scan unit IDs to find all connected devices and their types |
| `victron_read_register` | Read raw register(s) by address — advanced/debugging |
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
| `host` | string | (required) | GX device IP address or hostname |
| `port` | number | 502 | Modbus TCP port |
| `unitId` | number | varies | Modbus unit ID (use `victron_discover` to find) |

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

The complete register map is derived from Victron's official CCGX Modbus TCP register list v3.60 (Rev 50). It covers 32 device categories:

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
| Settings | com.victronenergy.settings | 34 |
| Grid Meter | com.victronenergy.grid | 32 |
| DC Genset | com.victronenergy.dcgenset | 26 |
| PV Inverter | com.victronenergy.pvinverter | 24 |
| AC Load | com.victronenergy.acload | 22 |
| Alternator | com.victronenergy.alternator | 20 |
| EV Charger | com.victronenergy.evcharger | 17 |
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
│   ├── modbus/
│   │   ├── client.ts         # Modbus TCP client wrapper
│   │   └── types.ts          # Register definition types
│   ├── registers/            # Typed register maps (from Excel)
│   │   ├── index.ts          # Re-exports all categories
│   │   ├── system.ts         # 53 system registers
│   │   ├── battery.ts        # 108 battery registers
│   │   ├── solar.ts          # 55 solar charger registers
│   │   ├── vebus.ts          # 94 VE.Bus registers
│   │   ├── grid.ts           # 32 grid meter registers
│   │   ├── tank.ts           # 6 tank registers
│   │   ├── temperature.ts    # 9 temperature registers
│   │   ├── inverter.ts       # 51 inverter registers
│   │   ├── pvinverter.ts     # 24 PV inverter registers
│   │   ├── genset.ts         # 45 genset registers
│   │   ├── settings.ts       # 34 settings registers
│   │   ├── evcs.ts           # 42 EVCS direct registers
│   │   └── other.ts          # 21 additional services
│   └── tools/                # MCP tool implementations
│       ├── index.ts          # Registers all tools
│       ├── helpers.ts         # Shared formatting and error handling
│       ├── system.ts         # System overview
│       ├── battery.ts        # Battery monitoring
│       ├── solar.ts          # Solar charger
│       ├── grid.ts           # Grid meter
│       ├── vebus.ts          # VE.Bus inverter/charger
│       ├── tanks.ts          # Tank levels
│       ├── temperature.ts    # Temperature sensors
│       ├── inverter.ts       # Standalone inverters
│       ├── evcs.ts           # EV Charging Station (direct)
│       ├── discover.ts       # Device discovery
│       └── raw.ts            # Raw register read + list
├── server.json               # MCP Registry metadata
└── dist/                     # Compiled output
```

## How It Works

1. **Connection per request** — Each tool call opens a Modbus TCP connection, reads the requested registers, and closes the connection. Simple and stateless.
2. **Batch reads** — Consecutive registers are read in a single Modbus request for efficiency.
3. **Data decoding** — Raw register values are decoded according to their data type (uint16, int16, uint32, int32, uint64, string) and scale factor.
4. **Enum mapping** — Numeric values are mapped to human-readable labels where applicable (e.g., battery state: 0 → "Idle", 1 → "Charging", 2 → "Discharging").
5. **Disconnected detection** — Values like 0xFFFF (uint16) or 0x7FFF (int16) indicate a disconnected sensor and are shown as "Not available".
6. **Error handling** — Modbus errors return `isError: true` with actionable messages, allowing the LLM to self-correct (e.g., suggest checking the unit ID).

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
<summary><strong>Can this MCP server control my system (write values)?</strong></summary>

Not yet. Phase 1 is read-only — all tools are annotated with `readOnlyHint: true`. Phase 2 will add write support for ESS mode control, grid setpoints, charge current limits, and relay control.
</details>

<details>
<summary><strong>Does this work with the Victron EV Charging Station (EVCS)?</strong></summary>

Yes, partially. The GX device proxies 17 EV charger registers (power, status, charge mode, current) accessible via `victron_read_register` or `victron_list_registers` with category "evcharger". For the full 115+ EVCS registers, you'd need to connect directly to the EVCS device's own Modbus TCP server (unit ID 1, addresses 5000–5140) — that's a separate interface not proxied through the GX.
</details>

<details>
<summary><strong>How many registers does this cover?</strong></summary>

859 registers across 32 device categories — that's 99.9% of the official CCGX Modbus TCP register list v3.60 (Rev 50). Every service from `com.victronenergy.system` to `com.victronenergy.pump` is included.
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
- [modbus-serial npm package](https://www.npmjs.com/package/modbus-serial)

## License

MIT
