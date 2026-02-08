# Usage Examples

Real-world prompts and what the AI does with each one. Replace `192.168.1.50` with your GX device IP.

## Discovery & Setup

### Find your GX device on the network

**Prompt:**
```
I just set up my Victron system. Can you find it on my network?
```

**What the AI will do:**
1. Call `victron_network_scan` to scan the local subnet
2. Probe ports 502 (Modbus TCP) and 1883 (MQTT) on each IP
3. Verify found devices by reading a Modbus system register
4. Return a table of discovered hosts with available transports

---

### First-time setup

**Prompt:**
```
Set up the Victron MCP server for my GX device at 192.168.1.50.
```

**What the AI will do:**
1. Call `victron_setup` with host `192.168.1.50`
2. Test both Modbus TCP and MQTT connectivity
3. If MQTT is available: discover portal ID and all services
4. If Modbus is available: scan all unit IDs for connected devices
5. Recommend the best transport and output ready-to-paste MCP server config

---

### Discover devices (Modbus)

**Prompt:**
```
What Victron devices are connected to my GX at 192.168.1.50?
```

**What the AI will do:**
1. Call `victron_discover` with host `192.168.1.50`
2. Scan unit IDs 0-247, probing each for known device types
3. Return a table with unit IDs, service types, and names

---

### Discover MQTT services

**Prompt:**
```
Discover what services are available via MQTT on my GX at 192.168.1.50.
```

**What the AI will do:**
1. Call `victron_mqtt_discover` with mqttHost `192.168.1.50`
2. Auto-detect the portal ID
3. List all services with device instances
4. Output ready-to-paste config

---

## Monitoring

### Full system overview

**Prompt:**
```
Show me the current state of my solar system at 192.168.1.50 — battery, solar, grid, everything.
```

**What the AI will do:**
1. Call `victron_system_overview` to get battery SOC, voltage, current, PV power, grid import/export, AC consumption, and ESS status
2. Present the data in a readable summary

---

### Monitor battery health

**Prompt:**
```
How is my battery doing? GX is at 192.168.1.50, battery monitor is unit 225.
I want SOC, voltage, temperature, and time-to-go.
```

**What the AI will do:**
1. Call `victron_battery_status` with unitId 225
2. Read all 108 battery registers: SOC, voltage, current, power, temperature, cell data, time-to-go, cycle history
3. Highlight any concerning values

---

### Check solar production

**Prompt:**
```
What's my solar production right now and how much energy did I generate today?
GX at 192.168.1.50, solar charger unit 226.
```

**What the AI will do:**
1. Call `victron_solar_status` with unitId 226
2. Read PV voltage, current, power, charger state, yield today/yesterday/total
3. Show current production and daily energy yield

---

### Multi-phase grid analysis

**Prompt:**
```
Show me the grid power on all three phases. Are we importing or exporting?
GX at 192.168.1.50, grid meter unit 30.
```

**What the AI will do:**
1. Call `victron_grid_status` with unitId 30
2. Read per-phase power (L1/L2/L3), voltage, current, frequency, and energy counters
3. Calculate total grid power and indicate import vs export

---

### Monitor all tanks

**Prompt:**
```
What are my tank levels? I have a fresh water tank on unit 20
and a fuel tank on unit 21. GX at 192.168.1.50.
```

**What the AI will do:**
1. Call `victron_tank_levels` for each unit ID (20 and 21)
2. Read tank level percentage, capacity, remaining volume, fluid type
3. Present a clear summary of each tank

---

### Inverter/charger status

**Prompt:**
```
What's the status of my MultiPlus-II? Check AC input, AC output, current limits,
and any active alarms. GX at 192.168.1.50, VE.Bus unit 227.
```

**What the AI will do:**
1. Call `victron_vebus_status` with unitId 227
2. Read AC input/output per phase, input current limit, mode, state, alarms, ESS settings
3. Flag any active alarms

---

### EV Charging Station

**Prompt:**
```
What's the status of my Victron EV Charging Station? It's at 192.168.1.60.
Is it charging? How much power is it using?
```

**What the AI will do:**
1. Call `victron_evcs_status` with host `192.168.1.60` (direct EVCS connection, not via GX)
2. Read charger status, L1/L2/L3 power, session energy, temperatures
3. Show charging status with human-readable labels

---

### Daily energy report

**Prompt:**
```
Give me a daily energy report for my system at 192.168.1.50.
Solar charger is unit 226, grid meter is unit 30, VE.Bus is unit 227.
```

**What the AI will do:**
1. Call `victron_system_overview` for overall consumption and battery data
2. Call `victron_solar_status` (unit 226) for today's solar yield
3. Call `victron_grid_status` (unit 30) for grid energy counters
4. Call `victron_vebus_status` (unit 227) for inverter/charger energy data
5. Compile a comprehensive daily report

---

## MQTT Transport

### Read data via MQTT

**Prompt:**
```
Show me battery status via MQTT. GX at 192.168.1.50, portal ID ca0f0e2e2261.
```

**What the AI will do:**
1. Call `victron_battery_status` with `transport: "mqtt"`, host `192.168.1.50`, portalId `ca0f0e2e2261`
2. Subscribe to MQTT topics for battery data, collect pre-scaled values
3. Return the same formatted output as Modbus

---

## Advanced

### Read a specific register

**Prompt:**
```
Read register 840 (battery voltage) at unit 100 from my GX at 192.168.1.50.
It's a uint16 with scale factor 10.
```

**What the AI will do:**
1. Call `victron_read_register` with address 840, dataType "uint16", scaleFactor 10
2. Return the raw and decoded value (e.g., raw 488 → 48.8V)

---

### Explore available registers

**Prompt:**
```
What registers are available for the solar charger?
```

**What the AI will do:**
1. Call `victron_list_registers` with category "solarcharger"
2. Return all 55 registers with address, name, data type, unit, and dbus path
