<!-- mcp-name: io.github.lubosstrejcek/victron-tcp -->

# Victron TCP — MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects to Victron Energy GX devices on your local network via **MQTT** (recommended) or **Modbus TCP**. Get direct, low-latency access to real-time solar, battery, grid, and inverter data — no cloud required.

900+ registers across 33 device categories, built from the official [CCGX Modbus TCP register list](https://www.victronenergy.com/support-and-downloads/technical-information) (Rev 50). MQTT transport uses the Venus OS built-in broker for zero-config auto-discovery.

## Features

- **30 specialized tools** for reading Victron device data
- **Dual transport** — MQTT (port 1883, zero-config) or Modbus TCP (port 502, raw register access)
- **900+ registers** across 33 device categories
- **Network discovery** — scan the local network to find GX devices, no IP needed
- **One-shot setup** — `victron_setup` probes both transports, discovers everything, generates ready-to-use config
- **Read-only and safe** — all tools annotated with `readOnlyHint: true`

## Prerequisites

1. A **Victron GX device** on your local network (Ekrano, Cerbo, Venus GX, etc.)
2. **MQTT** (enabled by default) or **Modbus TCP** (Settings → Services → Modbus TCP)
3. **Node.js 18+**

## Quick Start

### Claude Code (recommended)

```bash
claude mcp add --transport stdio victron-tcp -- npx victron-tcp
```

With environment variables pre-configured:

```bash
claude mcp add --transport stdio \
  -e VICTRON_HOST=192.168.1.50 \
  -e VICTRON_TRANSPORT=mqtt \
  -e VICTRON_PORTAL_ID=ca0f0e2e2261 \
  victron-tcp -- npx victron-tcp
```

### Claude Desktop / Cursor / Windsurf

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

See [docs/setup.md](docs/setup.md) for per-client config paths, project/user scopes, and building from source.

### Don't know your GX device IP?

Ask the AI:

```
Find my Victron GX device on the network and set it up.
```

The AI will use `victron_network_scan` to find it, then `victron_setup` to configure everything.

## Available Tools

### Core Monitoring

| Tool | Description |
|------|-------------|
| `victron_system_overview` | Battery SOC, PV power, grid power, AC consumption, ESS status |
| `victron_battery_status` | SOC, voltage, current, power, temperature, cell data, time-to-go |
| `victron_solar_status` | PV power, yield today/yesterday/total, charger state, tracker data |
| `victron_grid_status` | Grid power per phase (L1/L2/L3), voltage, current, frequency |
| `victron_vebus_status` | Multi/Quattro: AC in/out, current limit, mode, state, alarms |
| `victron_tank_levels` | Tank level, capacity, remaining, fluid type |
| `victron_temperature` | Temperature, sensor type, humidity, pressure |
| `victron_inverter_status` | Standalone inverter: AC output, state, alarms |
| `victron_evcs_status` | EV Charging Station (direct connection): power, status, session energy |

### Extended Devices

| Tool | Description |
|------|-------------|
| `victron_multi_status` | Multi RS inverter/charger |
| `victron_pvinverter_status` | AC-coupled PV inverters (Fronius, SolarEdge, ABB) |
| `victron_genset_status` | AC genset controllers |
| `victron_dcgenset_status` | DC generators |
| `victron_alternator_status` | NMEA 2000 alternators |
| `victron_charger_status` | AC chargers (Skylla, Blue Smart) |
| `victron_dcdc_status` | Orion XS DC-DC converter |
| `victron_acload_status` | AC load / current sensors |
| `victron_dcenergy_status` | DC energy meters (SmartShunts in DC meter mode) |
| `victron_gx_info` | GX device identity, relay states |
| `victron_digital_inputs` | Digital input state and type |
| `victron_gps_status` | GPS position, altitude, speed |
| `victron_meteo_status` | Solar irradiance, wind speed, temperatures |
| `victron_generator_status` | Generator auto start/stop, runtime, alarms |

### Discovery & Setup

| Tool | Description |
|------|-------------|
| `victron_network_scan` | Scan local network to find GX devices by probing Modbus TCP and MQTT ports |
| `victron_setup` | Full system setup: test transports, discover devices, generate MCP config |
| `victron_mqtt_discover` | Auto-discover MQTT portal ID, services, and device instances |
| `victron_discover` | Scan Modbus unit IDs to find all connected devices |

### Utility

| Tool | Description |
|------|-------------|
| `victron_read_category` | Read all registers for any device category by service name |
| `victron_read_register` | Read raw register(s) by address (Modbus only) |
| `victron_list_registers` | List available registers for a device category |

## Environment Variables

Set these to skip repetitive parameters:

| Variable | Description | Example |
|----------|-------------|---------|
| `VICTRON_HOST` | GX device IP or hostname | `192.168.1.50` |
| `VICTRON_TRANSPORT` | `modbus` or `mqtt` | `mqtt` |
| `VICTRON_PORTAL_ID` | Portal ID for MQTT | `ca0f0e2e2261` |
| `VICTRON_MODBUS_PORT` | Modbus TCP port | `502` |
| `VICTRON_MQTT_PORT` | MQTT broker port | `1883` |
| `VICTRON_UNIT_ID` | Default Modbus unit ID | `100` |

## Documentation

| Guide | Content |
|-------|---------|
| **[Setup](docs/setup.md)** | Client configuration, transport comparison, finding unit IDs, supported devices |
| **[Examples](docs/examples.md)** | 15 real-world prompts with step-by-step AI behavior |
| **[Troubleshooting](docs/troubleshooting.md)** | Common errors and debugging |
| **[FAQ](docs/faq.md)** | Frequently asked questions |
| **[Architecture](docs/architecture.md)** | Code structure, how it works, register map |

## Roadmap

- [ ] **Phase 2**: Write support — ESS mode control, grid setpoint, charge current limits, relay control
- [ ] **Phase 3**: Resources — real-time monitoring via MCP resources with SSE subscriptions
- [x] Claude Desktop Extension packaging (`.mcpb`)
- [x] NPM package publishing (`npx victron-tcp`)

## References

- [Victron Modbus TCP FAQ](https://www.victronenergy.com/live/ccgx:modbustcp_faq)
- [CCGX Modbus TCP Register List (Excel)](https://www.victronenergy.com/support-and-downloads/technical-information)
- [Venus OS on GitHub](https://github.com/victronenergy/venus)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Venus OS MQTT documentation](https://github.com/victronenergy/dbus-mqtt)

## License

MIT
