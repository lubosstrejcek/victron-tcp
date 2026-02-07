# Installation Guide for LLM Clients

## Quick Install

This MCP server uses **stdio transport** and requires **Node.js 18+**.

### npx (recommended — no install needed)

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

### From source

```bash
git clone https://github.com/lubosstrejcek/victron-tcp.git
cd victron-tcp
npm install
npm run build
```

Then configure:

```json
{
  "mcpServers": {
    "victron-tcp": {
      "command": "node",
      "args": ["/absolute/path/to/victron-tcp/dist/index.js"]
    }
  }
}
```

## Prerequisites

1. A **Victron Energy GX device** (Ekrano, Cerbo, Venus GX, etc.) on the local network
2. **Modbus TCP enabled** on the GX device: Settings → Services → Modbus TCP → Enable
3. **Node.js 18+** installed on the machine running the MCP client

## No API Keys Required

This server connects directly to hardware on the local network via Modbus TCP (port 502). No API keys, tokens, or cloud accounts are needed.

## Verification

After installation, test with this prompt:

> "Use victron_discover to scan for devices at 192.168.1.50"

Replace `192.168.1.50` with your GX device's IP address. The tool should return a list of connected Victron devices with their unit IDs.

## Available Tools

- `victron_system_overview` — Battery SOC, PV power, grid power, consumption
- `victron_battery_status` — Detailed battery metrics
- `victron_solar_status` — Solar charger data and yields
- `victron_grid_status` — Grid power per phase
- `victron_vebus_status` — Multi/Quattro inverter/charger
- `victron_tank_levels` — Tank levels and fluid types
- `victron_temperature` — Temperature sensor readings
- `victron_inverter_status` — Standalone inverter data
- `victron_discover` — Find all connected devices
- `victron_read_register` — Raw register access
- `victron_list_registers` — List registers by category
