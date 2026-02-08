# Troubleshooting

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
