# Troubleshooting & FAQ

## Common Errors

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

### MQTT "Connection timeout"
- Verify the GX device IP address is correct
- Check that the MQTT broker is running: `mosquitto_sub -h 192.168.1.50 -t '#' -C 1`
- The default MQTT port is 1883 (no authentication required)
- Venus OS enables MQTT by default — if it's not working, the device may not be reachable

### MQTT "Portal ID discovery timeout"
- The GX device may need a moment to start publishing after boot
- Try running `victron_mqtt_discover` again after a few seconds
- Verify the MQTT broker has data: `mosquitto_sub -h 192.168.1.50 -t 'N/+/system/+/Serial' -C 1`

### MQTT returns "Not available" for all registers
- The portal ID may be incorrect — run `victron_mqtt_discover` to auto-detect it
- The device instance may not match — omit `deviceInstance` to use wildcard auto-detection
- Publish a keepalive to trigger data: the server does this automatically, but stale brokers may need a moment

### Debugging on the GX device
- **Error log**: Settings → Services → Modbus TCP — last error is shown on this page
- **SSH debug log**: `/var/log/dbus-modbustcp/current` for detailed request/error logs
- **Unit ID mapping**: Settings → Services → Modbus TCP → Available services

---

## FAQ

<details>
<summary><strong>What hardware do I need?</strong></summary>

Any Victron GX device (Ekrano, Cerbo, Venus GX, CCGX, etc.) on the same local network. MQTT is enabled by default — no configuration needed. For Modbus TCP, enable it in the GX device settings. No cloud account or VRM portal access is required.
</details>

<details>
<summary><strong>How do I enable Modbus TCP on the GX device?</strong></summary>

On the GX device, go to **Settings → Services → Modbus TCP** and enable it. On Venus OS 3.x, the path may be **Settings → Integrations → Modbus TCP server**. The default port is 502.
</details>

<details>
<summary><strong>How do I find the IP address of my GX device?</strong></summary>

Use `victron_network_scan` to automatically scan your local network for GX devices. It probes for Modbus TCP and MQTT ports and verifies Victron devices. Alternatively, check your router's DHCP client list, look on the GX device under **Settings → Ethernet** or **Settings → WiFi**, or try `ping venus.local` if mDNS is supported.
</details>

<details>
<summary><strong>What are unit IDs and how do I find them?</strong></summary>

Unit IDs are Modbus addresses that identify specific devices on the GX bus. Unit ID 100 is always the system overview. Other devices get dynamically assigned IDs. Use `victron_discover` to scan all unit IDs, or check the GX device at **Settings → Services → Modbus TCP → Available services**.
</details>

<details>
<summary><strong>Should I use Modbus TCP or MQTT?</strong></summary>

Both transports return identical data. **MQTT** is easier to set up — it's enabled by default, doesn't require unit IDs, and auto-discovers devices. **Modbus TCP** gives you raw register access and works with `victron_read_register` for advanced debugging. If you're unsure, run `victron_setup` — it tests both and recommends the best one.
</details>

<details>
<summary><strong>What is a portal ID and how do I find it?</strong></summary>

The portal ID is a unique identifier for your Venus OS installation (e.g., `ca0f0e2e2261`). It's used as the root of all MQTT topics. Run `victron_mqtt_discover` to auto-detect it, or find it on the GX device under **Settings → VRM online portal → VRM Portal ID**.
</details>

<details>
<summary><strong>Can I use MQTT without knowing device instance numbers?</strong></summary>

Yes. When you omit the `deviceInstance` parameter, the server uses MQTT wildcard subscriptions (`+`) to automatically find the first matching device for each service type. This works for most setups. If you have multiple devices of the same type, specify the instance to target a specific one.
</details>

<details>
<summary><strong>Can this MCP server control my system (write values)?</strong></summary>

Not yet. Phase 1 is read-only — all tools are annotated with `readOnlyHint: true`. Phase 2 will add write support for ESS mode control, grid setpoints, charge current limits, and relay control.
</details>

<details>
<summary><strong>Does this work with the Victron EV Charging Station (EVCS)?</strong></summary>

Yes, fully. Two options: (1) Use `victron_evcs_status` to connect directly to the EVCS device's own Modbus TCP server (42 registers). (2) Read the 17 GX-proxied registers via `victron_read_category` with category "evcharger" if the EVCS is connected through a GX device.
</details>

<details>
<summary><strong>How many registers does this cover?</strong></summary>

901 registers across 33 device categories — the complete official CCGX Modbus TCP register list v3.60 (Rev 50) with 859 registers, plus 42 registers for direct EV Charging Station connections.
</details>

<details>
<summary><strong>Is this safe to use? Can it damage my system?</strong></summary>

Yes, it's safe. Phase 1 is completely read-only. The server never writes to any registers. All tools are annotated with `readOnlyHint: true` and `destructiveHint: false`.
</details>

<details>
<summary><strong>Does this work with Venus OS Large on a Raspberry Pi?</strong></summary>

Yes. Any device running Venus OS works — including Raspberry Pi installations running Venus OS Large.
</details>

<details>
<summary><strong>What MCP clients are supported?</strong></summary>

Any MCP client that supports stdio transport: Claude Code, Claude Desktop, Cursor, Windsurf, Cline, and others. See the [Setup Guide](setup.md) for per-client instructions.
</details>

<details>
<summary><strong>Do I need to pass the host and transport on every tool call?</strong></summary>

No. Set environment variables (`VICTRON_HOST`, `VICTRON_TRANSPORT`, `VICTRON_PORTAL_ID`) in your MCP client config and they'll be used as defaults. Tool arguments override env vars when provided.
</details>

<details>
<summary><strong>What is MCP (Model Context Protocol)?</strong></summary>

[MCP](https://modelcontextprotocol.io) is an open standard that lets AI assistants call external tools. This server exposes Victron device data as MCP tools — the AI decides which tool to call based on your question, reads the data, and presents it in a readable format. You don't need to know register addresses or device protocols.
</details>

<details>
<summary><strong>Can I use this with Home Assistant or Node-RED?</strong></summary>

This server is designed for AI assistants via MCP, not for general-purpose automation. For Home Assistant, use the [Victron integration](https://www.home-assistant.io/integrations/victron/) or direct Modbus TCP. For Node-RED, use the modbus or MQTT nodes directly. This server adds value when you want an AI to interpret and reason about the data.
</details>
