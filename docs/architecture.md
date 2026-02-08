# Architecture

## Project Structure

```
victron-tcp/
├── src/
│   ├── index.ts              # Entry point (stdio transport)
│   ├── server.ts             # MCP server setup
│   ├── config.ts             # Environment variable config
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
│       ├── index.ts          # registerAllTools() — wires all 30 tools
│       ├── helpers.ts        # Shared schemas, transport params, formatResults(), errorResult()
│       ├── network-scan.ts   # victron_network_scan (subnet scanning)
│       ├── setup.ts          # victron_setup (full system setup wizard)
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
6. **Error handling** — Modbus errors return `isError: true` with actionable messages, allowing the LLM to self-correct.

### MQTT transport

1. **Connection per request** — Each tool call connects to the Venus OS MQTT broker, subscribes to topics, collects data, and disconnects.
2. **Topic structure** — Data lives at `N/{portalId}/{serviceType}/{deviceInstance}/{dbusPath}`.
3. **Pre-scaled values** — Venus OS publishes already-scaled values via MQTT (JSON `{"value": ...}`), so no scale factor math is needed.
4. **Keepalive** — The server publishes to `R/{portalId}/keepalive` to trigger data publication from the GX device.
5. **Wildcard discovery** — When `deviceInstance` is omitted, MQTT wildcards (`+`) find the first matching device automatically.
6. **Same output** — Both transports produce identical `RegisterReadResult` arrays, so tools and formatting work unchanged.

## Tool Annotations

All tools include [MCP tool annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools):

| Annotation | Value | Meaning |
|------------|-------|---------|
| `readOnlyHint` | `true` | Tools only read data, never modify device state |
| `destructiveHint` | `false` | No risk of data loss or system changes |
| `idempotentHint` | `true` | Safe to call repeatedly with same parameters |
| `openWorldHint` | `false` | Local network only (except discovery tools and `victron_evcs_status`) |

## Register Map

901 registers across 33 device categories — the complete official CCGX Modbus TCP register list v3.60 (Rev 50).

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
