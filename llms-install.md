# Installation Guide for LLM Clients

## Quick Install

This MCP server uses **stdio transport** and requires **Node.js 18+**.

### npx (recommended — no install needed)

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

Omit the `env` block to pass parameters per tool call instead.

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
2. **At least one transport enabled** on the GX device:
   - **MQTT**: Enabled by default on Venus OS (port 1883, no authentication)
   - **Modbus TCP**: Settings → Services → Modbus TCP → Enable (port 502)
3. **Node.js 18+** installed on the machine running the MCP client

## No API Keys Required

This server connects directly to hardware on the local network via Modbus TCP (port 502) or MQTT (port 1883). No API keys, tokens, or cloud accounts are needed.

## Environment Variables

Set these to avoid repeating parameters on every tool call:

| Variable | Description | Example |
|----------|-------------|---------|
| `VICTRON_HOST` | GX device IP or hostname | `192.168.1.50` |
| `VICTRON_TRANSPORT` | `modbus` or `mqtt` | `mqtt` |
| `VICTRON_PORTAL_ID` | Portal ID for MQTT | `ca0f0e2e2261` |
| `VICTRON_MODBUS_PORT` | Modbus TCP port | `502` |
| `VICTRON_MQTT_PORT` | MQTT broker port | `1883` |
| `VICTRON_UNIT_ID` | Default Modbus unit ID | `100` |

## Verification

After installation, test with one of these prompts:

**MQTT (recommended):**
> "Use victron_mqtt_discover to find services on my GX at 192.168.1.50"

**Modbus TCP:**
> "Use victron_discover to scan for devices at 192.168.1.50"

Replace `192.168.1.50` with your GX device's IP address.

## Available Tools (28 total)

### Core Monitoring
- `victron_system_overview` — Battery SOC, PV power, grid power, consumption
- `victron_battery_status` — Detailed battery metrics
- `victron_solar_status` — Solar charger data and yields
- `victron_grid_status` — Grid power per phase
- `victron_vebus_status` — Multi/Quattro inverter/charger
- `victron_tank_levels` — Tank levels and fluid types
- `victron_temperature` — Temperature sensor readings
- `victron_inverter_status` — Standalone inverter data
- `victron_evcs_status` — EV Charging Station (direct Modbus connection)

### Extended Devices
- `victron_multi_status` — Multi RS inverter/charger
- `victron_pvinverter_status` — AC-coupled PV inverters
- `victron_genset_status` — AC genset controllers
- `victron_dcgenset_status` — DC generators
- `victron_alternator_status` — NMEA 2000 alternators
- `victron_charger_status` — AC chargers
- `victron_dcdc_status` — DC-DC converters
- `victron_acload_status` — AC load sensors
- `victron_dcenergy_status` — DC energy meters
- `victron_gx_info` — GX device identity
- `victron_digital_inputs` — Digital input state
- `victron_gps_status` — GPS position
- `victron_meteo_status` — Meteo/irradiance sensors
- `victron_generator_status` — Generator auto start/stop

### Discovery & Utility
- `victron_mqtt_discover` — Auto-discover MQTT services and portal ID
- `victron_discover` — Scan Modbus unit IDs
- `victron_read_category` — Read any device category by name
- `victron_read_register` — Raw register access (Modbus only)
- `victron_list_registers` — List registers by category
