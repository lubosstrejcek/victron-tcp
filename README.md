<!-- mcp-name: io.github.lubosstrejcek/victron-tcp -->

# Victron TCP — MCP Server

Connect AI assistants to Victron Energy systems. Read real-time solar, battery, grid, and inverter data from your local network — no cloud required.

> 32 tools | 23 prompts | 2 resources | 900+ registers | Modbus TCP + MQTT

---

## Which package do I want?

This is the **local / LAN** half of a pair. The remote / cloud half is **[`victron-vrm-mcp`](https://github.com/lubosstrejcek/victron-vrm-mcp)**.

| | **`victron-tcp`** (this repo) | **[`victron-vrm-mcp`](https://github.com/lubosstrejcek/victron-vrm-mcp)** |
|---|---|---|
| Transport | stdio (local subprocess) | Streamable HTTP (remote) |
| Data source | Modbus TCP + MQTT on your LAN | VRM cloud API |
| Needs access to the GX on your LAN | **Yes** | No |
| Works when you're away from the boat / house | No | **Yes** |
| Works when the internet is down | **Yes** | No |
| Latency | Real-time (~50 ms) | ~15 min (VRM sampling) |
| Raw register access | **Yes** (900+ registers) | No |
| Write coverage (planned) | Broad — anything D-Bus exposes | Narrow — only what VRM sanctions remotely (Dynamic ESS, clear-alarm, tags, …) |
| MCP Connector API compatible | No (stdio) | **Yes** (HTTPS) |
| Clients | Claude Code, Claude Desktop, Cursor, Windsurf | Anthropic Messages API + anything that speaks MCP over HTTP |
| Auth | None locally (trusts LAN) | Per-request VRM personal access token |

**Use this package when:** you're on the same LAN as a GX device and want real-time, low-latency read access with raw-register support.
**Use `victron-vrm-mcp` when:** you need remote access, you're building an API-backed app via the MCP Connector, or you don't want to expose anything on your LAN.

You can use **both** simultaneously — they serve different use cases and carry different risk profiles.

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

### Remote usage (MCP Connector API)

This package speaks **stdio**, which the [Anthropic MCP Connector API](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) cannot reach directly (Connector needs HTTPS). For cloud-backed remote access, use the sibling package [`victron-vrm-mcp`](https://github.com/lubosstrejcek/victron-vrm-mcp).

If you really need the Connector API to reach *this* package (e.g. to use raw register reads remotely), you'd put it behind your own HTTPS gateway that speaks Streamable HTTP upstream and spawns `victron-tcp` downstream — not recommended for typical use.

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

- [ ] **Write support** — ESS mode control, grid setpoint, charge current limits, relay control (via MQTT `W/` topics)
- [x] MCP Resources — register list + unit ID mapping (VRM API spec moved to [`victron-vrm-mcp`](https://github.com/lubosstrejcek/victron-vrm-mcp))
- [x] MCP Prompts — 23 guided workflows
- [x] NPM package (`npx victron-tcp`)
- [x] Sibling package for VRM cloud access — [`victron-vrm-mcp`](https://github.com/lubosstrejcek/victron-vrm-mcp)

## References

- [Victron Modbus TCP FAQ](https://www.victronenergy.com/live/ccgx:modbustcp_faq)
- [CCGX Register List (Excel)](https://www.victronenergy.com/support-and-downloads/technical-information)
- [Venus OS](https://github.com/victronenergy/venus) | [MQTT docs](https://github.com/victronenergy/dbus-mqtt)
- [VRM API](https://vrm-api-docs.victronenergy.com/) | [MCP Protocol](https://modelcontextprotocol.io)

## License

MIT
