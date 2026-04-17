<!-- mcp-name: io.github.lubosstrejcek/victron-tcp -->

# Victron TCP — MCP Server

Connect AI assistants to Victron Energy systems. Read real-time solar, battery, grid, and inverter data from your local network — no cloud required.

> 32 tools | 24 prompts | 3 resources | 900+ registers | Modbus TCP + MQTT

---

## Installation

### Claude Code

```bash
claude mcp add-json victron-tcp '{"type":"stdio","command":"npx","args":["-y","victron-tcp"]}'
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

### Don't know your device IP?

Just ask the AI:

```
Find my Victron GX device on the network and set it up.
```

It will scan your network, test connectivity, and generate the config for you.

### Requirements

- **Victron GX device** on your local network (Ekrano, Cerbo, Venus GX, etc.)
- **MQTT** (enabled by default on Venus OS) or **Modbus TCP** (Settings → Services → Modbus TCP)
- **Node.js 18+**

---

## What you can do

### Energy Reporting

| Prompt | What it does |
|--------|-------------|
| `hourly-snapshot` | Quick power flow snapshot — SOC, PV, grid, load |
| `daily-report` | Production, consumption, self-consumption ratio, grid dependency |
| `weekly-review` | Yield trends, battery health, load patterns, scheduling tips |
| `monthly-analysis` | Energy balance, cost savings, battery aging, seasonal comparison |

### Energy Optimization

| Prompt | What it does |
|--------|-------------|
| `energy-optimizer` | AI-driven tuning — choose goal: self-consumption, cost savings, battery longevity, backup readiness, or balanced |
| `ess-tuning` | Review ESS mode, grid setpoint, battery limits, Dynamic ESS |
| `storm-prep` | Pre-outage readiness check |

### Monitoring & Troubleshooting

| Prompt | What it does |
|--------|-------------|
| `diagnose-system` | Full health check with alarm scan |
| `solar-performance` | PV yield analysis, tracker comparison, shading detection |
| `troubleshoot` | Guided debugging with error code lookup |
| `tank-monitor` | Fuel, water, waste levels (marine/RV/off-grid) |
| `generator-management` | Auto-start conditions, runtime, quiet hours |

### Device Discovery

| Prompt | What it does |
|--------|-------------|
| `setup-guide` | First-time setup wizard |
| `find-devices` | Scan network, discover all GX devices and their connected devices |
| `identify-device` | "What is unit ID 247?" — identify any device |
| `system-topology` | Map AC/DC buses, connections, energy flow paths |
| `device-inventory` | Full device table for documentation or support |
| `register-explorer` | Browse registers, explain types and scale factors |
| `firmware-check` | Firmware versions across all devices |

### For Installers

| Prompt | What it does |
|--------|-------------|
| `commissioning` | New system checklist — inventory, wiring, config, pass/fail |
| `site-audit` | Communication, alarms, measurements, performance audit |

### Integration

| Prompt | What it does |
|--------|-------------|
| `nodered-check` | Node-RED on Venus OS — MQTT topics, flow debugging |
| `vrm-api-guide` | VRM cloud API — auth, endpoints, local vs cloud comparison |
| `mqtt-debug` | Broker connectivity, topic tracing, keepalive debugging |

---

## Tools Reference

<details>
<summary><strong>Core Monitoring (9 tools)</strong></summary>

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
| `victron_evcs_status` | EV Charging Station: power, status, session energy |

</details>

<details>
<summary><strong>Extended Devices (14 tools)</strong></summary>

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

</details>

<details>
<summary><strong>Discovery & Setup (4 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `victron_network_scan` | Scan local network to find GX devices |
| `victron_setup` | Full setup: test transports, discover devices, generate config |
| `victron_mqtt_discover` | Auto-discover MQTT portal ID, services, device instances |
| `victron_discover` | Scan Modbus unit IDs to find connected devices |

</details>

<details>
<summary><strong>Utility & Documentation (5 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `victron_read_category` | Read all registers for any device category |
| `victron_read_register` | Read raw register(s) by address (Modbus only) |
| `victron_list_registers` | List available registers for a device category |
| `victron_search_docs` | Search offline docs (registers + VRM API) |
| `victron_check_online` | Get URLs for latest Victron docs |

</details>

### Resources

| URI | Content |
|-----|---------|
| `victron://register-list` | CCGX Modbus TCP register list (Rev 3.71) — 943 registers |
| `victron://unit-id-mapping` | Device type to unit ID mapping |
| `victron://vrm-api` | VRM cloud API OpenAPI 3.1 spec — 47 endpoints |

---

## Configuration

### Environment Variables

All optional. Set them to avoid repeating parameters on every tool call.

| Variable | Default | Description |
|----------|---------|-------------|
| `VICTRON_HOST` | _(none)_ | GX device IP or hostname |
| `VICTRON_TRANSPORT` | `modbus` | `modbus` or `mqtt` |
| `VICTRON_PORTAL_ID` | _(auto)_ | Portal ID for MQTT |
| `VICTRON_MODBUS_PORT` | `502` | Modbus TCP port |
| `VICTRON_MQTT_PORT` | `1883` | MQTT broker port |
| `VICTRON_UNIT_ID` | `100` | Default Modbus unit ID |

### MCP Connector (API usage)

> **Note:** The [MCP Connector API](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) only accepts remote MCP servers exposed over HTTPS (Streamable HTTP or SSE). This package ships a **stdio** server and is not directly reachable by the Connector — it is intended for local clients (Claude Code, Claude Desktop, Cursor, Windsurf). To use it with the Connector, you would need to run your own HTTPS gateway that bridges to this stdio server, and accept the security trade-off of exposing local Victron control to the internet.

If you are running such a gateway, defer rarely-used tools to reduce token overhead:

```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "victron-tcp",
  "default_config": { "defer_loading": true },
  "configs": {
    "victron_system_overview": { "defer_loading": false },
    "victron_battery_status": { "defer_loading": false },
    "victron_solar_status": { "defer_loading": false },
    "victron_grid_status": { "defer_loading": false },
    "victron_setup": { "defer_loading": false },
    "victron_discover": { "defer_loading": false },
    "victron_search_docs": { "defer_loading": false }
  }
}
```

---

## Documentation

| Guide | Content |
|-------|---------|
| [Setup](docs/setup.md) | Client configs, transport comparison, unit IDs, supported devices |
| [Examples](docs/examples.md) | Real-world prompts with step-by-step AI behavior |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and fixes |
| [FAQ](docs/faq.md) | Frequently asked questions |
| [Architecture](docs/architecture.md) | Code structure, register map, how it works |
| [Security](SECURITY.md) | Security model, data sensitivity, network exposure |

---

## Roadmap

- [ ] **Write support** — ESS mode control, grid setpoint, charge current limits, relay control
- [x] MCP Resources — register list, unit ID mapping, VRM API spec
- [x] MCP Prompts — 24 guided workflows
- [x] NPM package (`npx victron-tcp`)

## References

- [Victron Modbus TCP FAQ](https://www.victronenergy.com/live/ccgx:modbustcp_faq)
- [CCGX Register List (Excel)](https://www.victronenergy.com/support-and-downloads/technical-information)
- [Venus OS](https://github.com/victronenergy/venus) | [MQTT docs](https://github.com/victronenergy/dbus-mqtt)
- [VRM API](https://vrm-api-docs.victronenergy.com/) | [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
