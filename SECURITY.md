# Security Policy

## Overview

This MCP server connects directly to Victron Energy GX devices on the local network via Modbus TCP (port 502) and MQTT (port 1883). It does **not** connect to the internet, cloud services, or external APIs. All communication happens on the local network between the machine running the MCP server and the GX device.

## Architecture

```
MCP Client (Claude Code, etc.)
    │ stdio (JSON-RPC)
    ▼
victron-tcp (this server)
    │ Modbus TCP / MQTT (local network only)
    ▼
Victron GX Device (Cerbo, Ekrano, Venus GX)
```

## Current Security Posture

### What this server does

- **Reads** Modbus registers and MQTT topics from Victron GX devices
- **Serves** bundled documentation files (register list, VRM API spec)
- **Searches** local documentation for register/API information
- All 32 tools are annotated `readOnlyHint: true`, `destructiveHint: false`

### What this server does NOT do

- Write to any Modbus register or MQTT topic (Phase 2, not yet implemented)
- Connect to the internet or any external service
- Store, cache, or transmit device data beyond the current MCP session
- Require or handle any authentication credentials
- Access the filesystem beyond its own bundled documentation files

### No authentication required

Victron GX devices expose Modbus TCP and MQTT without authentication by default. This is by design — these protocols are intended for local network integration. The MCP server inherits this model: if you can reach the GX device on the network, you can read its data.

## Network Exposure

### Modbus TCP (port 502)

- Unencrypted, no authentication
- Must be explicitly enabled on the GX device (Settings → Services → Modbus TCP)
- Only accessible from the local network (unless firewall rules expose it)

### MQTT (port 1883)

- Unencrypted, no authentication (Venus OS default)
- Enabled by default on Venus OS
- Only accessible from the local network

### Recommendations

- Keep GX devices on a dedicated IoT VLAN or subnet
- Do not expose ports 502/1883 to the internet
- Use firewall rules to restrict access to trusted machines
- If remote access is needed, use a VPN rather than port forwarding

## MCP Server Transport

The MCP server communicates with AI clients via **stdio** (standard input/output). There is no HTTP server, no open ports, and no network listener on the MCP server side.

## Data Sensitivity

Data accessible through this server includes:

| Data | Sensitivity | Notes |
|------|-------------|-------|
| Battery SOC, voltage, power | Low | Energy state data |
| Solar production, yields | Low | Performance data |
| Grid power, frequency | Low | Utility connection data |
| GPS coordinates | Medium | Physical location of the installation |
| GX serial number | Medium | Device identifier |
| Tank levels | Low | Fuel/water levels |
| Energy consumption patterns | Medium | Can reveal occupancy and usage habits |

### GPS Data

If a GPS module is connected to the GX device, the `victron_gps_status` tool exposes latitude, longitude, altitude, and speed. This reveals the physical location of the installation. Consider this when sharing MCP session logs or outputs.

### Consumption Patterns

Detailed energy data (hourly snapshots, load patterns) can reveal when a household is occupied, what appliances are used, and daily routines. Treat energy data with the same care as other personal information.

## Phase 2: Write Support (Planned)

When write tools are added, they will:

- Be annotated with `destructiveHint: true`, `readOnlyHint: false`
- Require explicit user confirmation in the MCP client before execution
- Be limited to safe operational parameters (ESS mode, grid setpoint, relay control)
- Not allow firmware updates, factory resets, or irreversible operations

## Reporting Vulnerabilities

If you discover a security issue in this MCP server, please report it privately:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting feature
3. Include steps to reproduce and potential impact

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.1.x | Yes |
| < 1.1 | No |

## Dependencies

| Package | Purpose | Risk |
|---------|---------|------|
| `@modelcontextprotocol/sdk` | MCP protocol handling | Low — maintained by Anthropic |
| `modbus-serial` | Modbus TCP client | Low — no network listener, outbound only |
| `mqtt` | MQTT client | Low — no broker, client only |
| `zod` | Input validation | Low — pure validation library |

All dependencies are outbound-only clients. None open network ports or accept inbound connections.
