import { z } from 'zod';
import * as net from 'node:net';
import * as os from 'node:os';
import * as dns from 'node:dns/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VictronModbusClient } from '../modbus/client.js';
import { errorResult, DISCOVERY_ANNOTATIONS } from './helpers.js';

const PROBE_TIMEOUT = 1500;
const BATCH_SIZE = 30;

const KNOWN_HOSTNAMES = [
  'venus.local',
  'einstein.local',
];

function probePort(host: string, port: number, timeout: number = PROBE_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

interface ScanResult {
  host: string;
  hostname?: string;
  modbus: boolean;
  mqtt: boolean;
  verified: boolean;
}

async function verifyVictronModbus(host: string, port: number = 502): Promise<boolean> {
  const client = new VictronModbusClient();
  try {
    await client.connect(host, port);
    client.setUnitId(100);
    await client.readRawRegisters(800, 1);
    return true;
  } catch {
    return false;
  } finally {
    await client.close();
  }
}

function getLocalSubnets(): string[] {
  const interfaces = os.networkInterfaces();
  const subnets: string[] = [];
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`);
      }
    }
  }
  return [...new Set(subnets)];
}

export function registerNetworkScanTools(server: McpServer): void {
  server.registerTool(
    'victron_network_scan',
    {
      title: 'Network Scan',
      description:
        'Scan the local network to find Victron GX devices. Probes for Modbus TCP (port 502) and MQTT (port 1883) services, then verifies Victron devices via Modbus. Use this when you don\'t know the IP address of the GX device. Specify a subnet or let it auto-detect from local network interfaces.',
      inputSchema: {
        subnet: z.string().optional().describe(
          'Subnet base to scan in "192.168.1" format (scans .1-.254). Auto-detects from local interfaces if omitted.',
        ),
        timeout: z.number().int().min(500).max(5000).default(1500).describe(
          'TCP probe timeout per host in milliseconds (default: 1500)',
        ),
      },
      annotations: DISCOVERY_ANNOTATIONS,
    },
    async ({ subnet, timeout }) => {
      try {
        const results: ScanResult[] = [];
        const probeMs = timeout ?? PROBE_TIMEOUT;
        const foundIps = new Set<string>();

        // Phase 1: Try known .local hostnames via mDNS
        const hostnameChecks = KNOWN_HOSTNAMES.map(async (hostname) => {
          try {
            const { address } = await dns.lookup(hostname);
            const [modbus, mqtt] = await Promise.all([
              probePort(address, 502, probeMs),
              probePort(address, 1883, probeMs),
            ]);
            if (modbus || mqtt) {
              return { host: address, hostname, modbus, mqtt, verified: false } satisfies ScanResult;
            }
          } catch {
            // hostname not resolvable
          }
          return null;
        });

        const hostnameResults = await Promise.all(hostnameChecks);
        for (const r of hostnameResults) {
          if (r) {
            results.push(r);
            foundIps.add(r.host);
          }
        }

        // Phase 2: Subnet scan
        const subnets = subnet ? [subnet] : getLocalSubnets();

        if (subnets.length === 0 && results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No network interfaces found and no subnet specified. Provide a subnet (e.g., "192.168.1").',
            }],
          };
        }

        for (const subnetBase of subnets) {
          for (let batch = 1; batch < 255; batch += BATCH_SIZE) {
            const end = Math.min(batch + BATCH_SIZE, 255);
            const promises: Promise<ScanResult | null>[] = [];

            for (let i = batch; i < end; i++) {
              const host = `${subnetBase}.${i}`;
              if (foundIps.has(host)) continue;

              promises.push((async () => {
                const [modbus, mqtt] = await Promise.all([
                  probePort(host, 502, probeMs),
                  probePort(host, 1883, probeMs),
                ]);
                if (modbus || mqtt) {
                  return { host, modbus, mqtt, verified: false } satisfies ScanResult;
                }
                return null;
              })());
            }

            const batchResults = await Promise.all(promises);
            for (const r of batchResults) {
              if (r) results.push(r);
            }
          }
        }

        // Phase 3: Verify Victron devices via Modbus system register
        for (const result of results) {
          if (result.modbus) {
            result.verified = await verifyVictronModbus(result.host);
          }
        }

        if (results.length === 0) {
          const scannedSubnets = subnets.join(', ');
          return {
            content: [{
              type: 'text',
              text: [
                '# Network Scan Results\n',
                `No devices found with Modbus TCP (502) or MQTT (1883) on subnet(s): ${scannedSubnets}.x\n`,
                '**Troubleshooting:**',
                '- Ensure the GX device is powered on and connected to the network',
                '- Check that Modbus TCP is enabled: Settings → Services → Modbus TCP',
                '- MQTT is enabled by default on Venus OS',
                '- Try specifying the subnet manually if auto-detection picked the wrong interface',
                '- If the device is on a different VLAN/subnet, specify it with the `subnet` parameter',
              ].join('\n'),
            }],
          };
        }

        // Sort: verified first, then by IP
        results.sort((a, b) => {
          if (a.verified !== b.verified) return a.verified ? -1 : 1;
          return a.host.localeCompare(b.host, undefined, { numeric: true });
        });

        const lines = ['# Network Scan Results\n'];
        lines.push(`Found ${results.length} device(s) with Modbus TCP or MQTT ports open.\n`);
        lines.push('| Host | Hostname | Modbus (502) | MQTT (1883) | Victron Verified |');
        lines.push('|------|----------|:------------:|:-----------:|:----------------:|');

        for (const r of results) {
          const hostname = r.hostname ?? '-';
          const modbus = r.modbus ? 'yes' : '-';
          const mqtt = r.mqtt ? 'yes' : '-';
          const verified = r.verified ? 'yes' : '-';
          lines.push(`| ${r.host} | ${hostname} | ${modbus} | ${mqtt} | ${verified} |`);
        }

        const victronHosts = results.filter(r => r.verified);
        if (victronHosts.length > 0) {
          lines.push('');
          lines.push('## Next Step');
          lines.push(`Run \`victron_setup\` with host \`${victronHosts[0].host}\` for full system discovery and configuration.`);
        } else {
          lines.push('');
          lines.push('## Note');
          lines.push('No hosts were verified as Victron devices via Modbus. The listed hosts have the right ports open');
          lines.push('but may not be Victron GX devices. Try `victron_setup` with the most likely IP to investigate.');
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
