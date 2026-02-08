# Setup Guide

Detailed installation and configuration for all MCP clients.

## Prerequisites

1. **A Victron GX device** on your local network (Ekrano, Cerbo, Venus GX, CCGX, etc.)
2. **At least one transport enabled** on the GX device:
   - **MQTT**: Enabled by default on Venus OS (port 1883, no authentication)
   - **Modbus TCP**: Settings → Services → Modbus TCP → Enable (port 502)
3. **Node.js 18+** installed

## First-Time Setup

Don't know your GX device IP? Use the discovery tools:

```
"Use victron_network_scan to find my Victron GX device on the network"
```

Once you have the IP, run the setup wizard:

```
"Use victron_setup to configure the Victron MCP server for my GX at 192.168.1.50"
```

`victron_setup` tests both transports, discovers all devices/services, and outputs ready-to-paste config.

## Client Configuration

### Claude Code (recommended)

One command:

```bash
claude mcp add --transport stdio victron-tcp -- npx victron-tcp
```

With pre-configured environment:

```bash
claude mcp add --transport stdio \
  -e VICTRON_HOST=192.168.1.50 \
  -e VICTRON_TRANSPORT=mqtt \
  -e VICTRON_PORTAL_ID=ca0f0e2e2261 \
  victron-tcp -- npx victron-tcp
```

**Project scope** — add `.mcp.json` to your project root and commit it:

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

**User scope** (all projects):

```bash
claude mcp add --transport stdio --scope user victron-tcp -- npx victron-tcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

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

Also available as a Claude Desktop Extension (`.mcpb`) — download from the [Releases](https://github.com/lubosstrejcek/victron-tcp/releases) page and double-click to install.

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

The server uses stdio transport. The JSON format is the same everywhere — `mcpServers` → `command` + `args` + `env`.

## Environment Variables

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

## Modbus TCP vs MQTT

| | Modbus TCP | MQTT |
|---|-----------|------|
| **Port** | 502 | 1883 |
| **Setup** | Must enable on GX | Enabled by default |
| **Device addressing** | Unit ID (0-247) | Service type + device instance |
| **Discovery** | `victron_discover` (scans unit IDs) | `victron_mqtt_discover` (instant) |
| **Network scan** | `victron_network_scan` | `victron_network_scan` |
| **Setup wizard** | `victron_setup` | `victron_setup` |
| **Data format** | Raw registers with scale factors | Pre-scaled JSON values |
| **Best for** | Direct register access, raw reads | Easy setup, no unit ID hunting |
| **Limitations** | Must enable on GX, unit IDs are dynamic | Requires portal ID (auto-discovered) |

Both transports return identical output. Switch between them with the `transport` parameter or `VICTRON_TRANSPORT` env var.

**Not sure which to use?** Run `victron_setup` — it tests both and recommends the best one for your system.

## Finding Unit IDs

Unit IDs identify specific devices on the Modbus bus.

### 1. Use the setup tool (recommended)

Run `victron_setup` with your GX device IP. It scans all unit IDs and generates a complete config. If you don't know the IP, run `victron_network_scan` first.

### 2. Use the discover tool

`victron_discover` scans unit IDs 0-247 and reports what it finds.

### 3. Check the GX device

On the GX device, go to **Settings → Integrations → Modbus TCP server → Available services**.

### Common Defaults

| Unit ID | Service |
|---------|---------|
| 100 | System overview (com.victronenergy.system) |
| 227 | VE.Bus (first Multi/Quattro on Cerbo GX) |
| 247 | First VE.Direct device (CCGX) |
| 226 | VE.Direct port 1 (Cerbo GX) |

Since Venus OS 2.60, unit IDs are assigned dynamically. Always verify with `victron_discover` or the GX device settings.

## Supported Devices

Works with any Victron GX device running [Venus OS](https://github.com/victronenergy/venus):

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

Also works with Venus OS Large on Raspberry Pi.

### Supported Accessories

These connect to a GX device and their data is accessible via the GX:

| Accessory | Connection | Tool |
|-----------|------------|------|
| **VE.Direct devices** (MPPT, BMV, Phoenix) | VE.Direct | `victron_solar_status`, `victron_battery_status`, `victron_inverter_status` |
| **VE.Bus devices** (Multi, Quattro) | VE.Bus | `victron_vebus_status` |
| **VE.Can devices** (Lynx, MPPT RS) | VE.Can | Various tools |
| **Energy meters** (EM24, EM540, ET series) | Wired/wireless | `victron_grid_status` |
| **GX Tank 140** | USB | `victron_tank_levels` |
| **GX IO-Extender 150** | USB | `victron_digital_inputs` |
| **Temperature sensors** | GX / IO-Extender | `victron_temperature` |

All accessory data flows through the GX device — always connect to the GX device's IP.
