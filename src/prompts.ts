import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const hostArg = {
  host: z.string().optional().describe('GX device IP (auto-detected if VICTRON_HOST is set)'),
};

function hint(host?: string): string {
  return host ? ` at ${host}` : '';
}

export function registerAllPrompts(server: McpServer): void {

  // === End-user prompts ===

  server.registerPrompt(
    'setup-guide',
    {
      title: 'Setup Guide',
      description: 'Interactive first-time setup: find the GX device, test connectivity, configure the MCP server.',
    },
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            'Help me set up the Victron MCP server for the first time.',
            '',
            '1. Run victron_network_scan to find my GX device on the local network',
            '2. Run victron_setup with the discovered IP to test both Modbus and MQTT',
            '3. Show me the recommended MCP server configuration to paste into my settings',
            '4. Verify the setup by running victron_system_overview',
            '',
            'Guide me through each step and explain what you find.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'diagnose-system',
    {
      title: 'Diagnose System',
      description: 'Step-by-step system diagnosis: discover devices, read system overview, check battery health, and flag any anomalies.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Diagnose the Victron system${hint(host)}. Follow these steps:`,
            '',
            '1. Run victron_setup (or victron_network_scan if no host is known) to discover the system',
            '2. Run victron_system_overview to get the current state',
            '3. Run victron_battery_status to check battery health (SOC, voltage, temperature, alarms)',
            '4. If solar is present, run victron_solar_status to check PV yield and charger state',
            '5. If grid is present, run victron_grid_status to check grid power and frequency',
            '',
            'After collecting all data, provide a summary with:',
            '- Overall system health (good / warning / critical)',
            '- Any active alarms or anomalies',
            '- Battery state assessment',
            '- Energy flow summary (what is producing, what is consuming)',
            '- Any recommendations',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'hourly-snapshot',
    {
      title: 'Hourly Snapshot',
      description: 'Quick snapshot of current energy state — power flows, SOC, grid, PV. Designed for frequent polling to build a picture over time.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Take an hourly energy snapshot of the Victron system${hint(host)}.`,
            '',
            '1. Run victron_system_overview for current power flows',
            '2. Run victron_battery_status for SOC and charge/discharge power',
            '',
            'Output a compact one-screen summary:',
            '```',
            'Time: [current time]  SOC: XX%  Battery: +/-XXX W',
            'PV: XXX W  Grid: +/-XXX W  Load: XXX W',
            'Charger: [Bulk/Absorption/Float/Off]  ESS: [mode]',
            '```',
            '',
            'Flag if anything unusual:',
            '- SOC dropping while PV is producing (unexpected load?)',
            '- Grid importing while battery is full (ESS misconfigured?)',
            '- PV producing 0 during daylight hours',
            '- Battery discharging below 20% SOC',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'daily-report',
    {
      title: 'Daily Energy Report',
      description: 'End-of-day energy report: total production, consumption, self-consumption ratio, battery cycles, grid dependency, and efficiency analysis.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Generate a daily energy report for the Victron system${hint(host)}.`,
            '',
            '**Data collection:**',
            '1. Run victron_system_overview for current state and Dynamic ESS',
            '2. Run victron_solar_status for PV yield today/yesterday, charger state',
            '3. Run victron_battery_status for SOC, consumed Ah, charged/discharged energy, time-to-go',
            '4. Run victron_grid_status for grid power, energy counters (import/export)',
            '5. Run victron_vebus_status for inverter state, AC consumption',
            '',
            '**Daily report:**',
            '',
            '| Metric | Value |',
            '|--------|-------|',
            '| Solar production today | kWh |',
            '| Solar production yesterday | kWh (trend: up/down/flat) |',
            '| Grid imported today | kWh |',
            '| Grid exported today | kWh |',
            '| Battery SOC now | % |',
            '| Battery cycles today | estimated from Ah consumed |',
            '| Self-consumption ratio | % (solar used directly vs exported) |',
            '| Grid dependency | % (grid import vs total consumption) |',
            '',
            '**Analysis:**',
            '- Compare today vs yesterday — what changed?',
            '- Self-consumption ratio: > 70% is good, < 50% means excess export',
            '- Grid dependency: < 30% is good for a solar+battery system',
            '- If exporting a lot: consider shifting loads to midday or increasing battery',
            '- If importing a lot at night: battery may be undersized or SOC minimum too high',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'weekly-review',
    {
      title: 'Weekly Energy Review',
      description: 'Weekly energy trends: compare daily yields, identify patterns, detect degradation, suggest schedule optimizations for loads and charging.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Generate a weekly energy review for the Victron system${hint(host)}.`,
            '',
            '**Data collection (take multiple snapshots to build the picture):**',
            '1. Run victron_solar_status — yield today and yesterday give 2 data points',
            '2. Run victron_battery_status — charged/discharged energy, cycle count, health',
            '3. Run victron_grid_status — energy counters (cumulative, so track the total)',
            '4. Run victron_system_overview — current state as context',
            '',
            'Note: Modbus registers provide current state and limited history (today/yesterday yield).',
            'For full 7-day history, the VRM API (/installations/{id}/stats) provides daily breakdowns.',
            'Use victron_search_docs with "stats" in "vrm-api" source for the endpoint details.',
            '',
            '**Weekly review:**',
            '',
            '1. **Production trend** — Is daily PV yield consistent or declining?',
            '   - Sudden drops: weather, shading from new obstruction, dirty panels, charger issue',
            '   - Gradual decline: seasonal (normal), panel degradation (if >1% over months)',
            '',
            '2. **Battery health** — How is the battery performing?',
            '   - SOC range over the week: does it reach 100% daily? Drop below 20%?',
            '   - Cycle depth: shallow cycles (80-100%) are better than deep (20-100%)',
            '   - Time-to-go accuracy: does it match actual discharge duration?',
            '',
            '3. **Grid interaction** — Are we minimizing grid dependency?',
            '   - Weekly import vs export balance',
            '   - Peak import times: can loads be shifted to solar hours?',
            '   - Feed-in: is the tariff favorable or should we store more?',
            '',
            '4. **Load patterns** — What does consumption look like?',
            '   - AC consumption from system overview',
            '   - High-power events (EV charging, heat pump, cooking)',
            '   - Opportunity to shift loads to solar peak (10:00-15:00)',
            '',
            '**Recommendations for the coming week:**',
            '- Load scheduling suggestions (run dishwasher/washing at midday)',
            '- ESS setting adjustments (if self-consumption is low)',
            '- Battery SOC limits (adjust min SOC for expected weather)',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'monthly-analysis',
    {
      title: 'Monthly Energy Analysis',
      description: 'Monthly deep analysis: energy balance, cost savings estimate, battery aging, seasonal comparison, and optimization recommendations.',
      argsSchema: {
        ...hostArg,
        electricityPrice: z.string().optional().describe('Electricity price per kWh (e.g. "0.25 EUR" or "0.15 USD") for cost analysis'),
        feedInTariff: z.string().optional().describe('Feed-in tariff per kWh for exported solar (e.g. "0.08 EUR")'),
      },
    },
    async ({ host, electricityPrice, feedInTariff }) => {
      const priceHint = electricityPrice ? `\nElectricity price: ${electricityPrice}` : '';
      const feedInHint = feedInTariff ? `\nFeed-in tariff: ${feedInTariff}` : '';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Generate a monthly energy analysis for the Victron system${hint(host)}.${priceHint}${feedInHint}`,
              '',
              '**Data collection:**',
              '1. Run victron_solar_status — total yield (lifetime kWh), today/yesterday',
              '2. Run victron_battery_status — charged/discharged energy (kWh), cycle history, health (%)',
              '3. Run victron_grid_status — energy counters (total imported/exported kWh)',
              '4. Run victron_system_overview — current state + Dynamic ESS',
              '5. For full monthly data, suggest using VRM API: victron_search_docs query "overallstats" source "vrm-api"',
              '',
              'Note: Modbus provides cumulative counters — monthly totals need baseline tracking.',
              'The VRM API /installations/{id}/stats endpoint can provide daily/monthly breakdowns.',
              '',
              '**Monthly analysis:**',
              '',
              '**1. Energy Balance**',
              '| Source/Sink | kWh | % of Total |',
              '|------------|-----|-----------|',
              '| Solar produced | | |',
              '| Grid imported | | |',
              '| Grid exported | | |',
              '| Battery throughput | | |',
              '| Total consumption | | |',
              '',
              '**2. Financial Analysis** (if electricity price provided)',
              '- Grid cost avoided (solar self-consumption x price)',
              '- Grid import cost (imported kWh x price)',
              '- Feed-in revenue (exported kWh x feed-in tariff)',
              '- Net savings this month',
              '- Projected annual savings',
              '- System payback estimate (if system cost is known)',
              '',
              '**3. Battery Analysis**',
              '- Estimated cycles this month (from Ah throughput)',
              '- Average cycle depth',
              '- State of health trend',
              '- Battery utilization: is the battery capacity well-matched to the system?',
              '  - Rarely below 50%? Battery may be oversized (good for longevity)',
              '  - Frequently below 20%? Battery undersized or ESS min SOC too low',
              '',
              '**4. Seasonal Context**',
              '- Expected solar yield for this month/latitude (rough estimate)',
              '- Are we above or below expected? (weather, shading, issues)',
              '- Recommendations for next month based on seasonal forecast',
              '',
              '**5. Optimization Recommendations**',
              '- ESS mode: should strategy change for the coming month?',
              '- Min SOC adjustment: lower in summer (more solar), higher in winter (less solar)',
              '- Grid setpoint: optimize for time-of-use tariffs if applicable',
              '- Load shifting opportunities identified from consumption patterns',
              '- Dynamic ESS: is it active? Should it be enabled/disabled?',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'energy-optimizer',
    {
      title: 'Energy Optimizer',
      description: 'AI-driven energy optimization: analyze current system configuration, power flows, and usage patterns to recommend ESS tuning, load scheduling, and battery management strategies.',
      argsSchema: {
        ...hostArg,
        goal: z.enum(['self-consumption', 'cost-savings', 'battery-longevity', 'backup-ready', 'balanced']).default('balanced')
          .describe('Optimization goal: maximize self-consumption, minimize cost, extend battery life, maintain backup readiness, or balanced approach'),
        electricityPrice: z.string().optional().describe('Electricity price per kWh (e.g. "0.25 EUR")'),
        feedInTariff: z.string().optional().describe('Feed-in tariff per kWh (e.g. "0.08 EUR")'),
        peakHours: z.string().optional().describe('Peak/expensive hours (e.g. "17:00-21:00")'),
      },
    },
    async ({ host, goal, electricityPrice, feedInTariff, peakHours }) => {
      const goalDescriptions: Record<string, string> = {
        'self-consumption': 'Maximize the percentage of solar energy used on-site instead of exporting to grid.',
        'cost-savings': 'Minimize electricity bills by optimizing import/export and time-of-use tariffs.',
        'battery-longevity': 'Extend battery lifespan by limiting cycle depth, avoiding extreme SOC, and reducing throughput.',
        'backup-ready': 'Keep batteries charged and ready for power outages, prioritizing backup capacity over optimization.',
        'balanced': 'Balance between self-consumption, cost savings, and battery health.',
      };

      const extras: string[] = [];
      if (electricityPrice) extras.push(`Electricity price: ${electricityPrice}`);
      if (feedInTariff) extras.push(`Feed-in tariff: ${feedInTariff}`);
      if (peakHours) extras.push(`Peak/expensive hours: ${peakHours}`);
      const extrasBlock = extras.length > 0 ? `\n\n**User inputs:**\n${extras.map(e => `- ${e}`).join('\n')}` : '';

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Optimize the energy system${hint(host)}.`,
              `**Goal:** ${goalDescriptions[goal ?? 'balanced']}${extrasBlock}`,
              '',
              '**Phase 1 — Understand the current system**',
              '1. Run victron_system_overview — power flows, battery SOC, Dynamic ESS state',
              '2. Run victron_battery_status — SOC, capacity, charge/discharge limits, health, cycles',
              '3. Run victron_solar_status — PV capacity, current yield, charger state',
              '4. Run victron_vebus_status — ESS mode, grid setpoint, input current limit, inverter capacity',
              '5. Run victron_grid_status — grid power, frequency, energy counters',
              '',
              '**Phase 2 — Analyze current configuration**',
              '',
              goal === 'self-consumption' ? [
                '**Self-consumption optimization:**',
                '- What % of solar is being exported? (grid export / solar production)',
                '- Is the battery absorbing enough solar? Check charge rate vs PV capacity',
                '- ESS mode: "Optimized (with BatteryLife)" is best for self-consumption',
                '- Grid setpoint: should be slightly negative (e.g. -50W) to avoid export',
                '- Min SOC: lower = more battery capacity for solar, but less backup',
                '- Time-based scheduling: can high loads (EV, heat pump, pool) run during solar peak?',
              ].join('\n') : '',
              goal === 'cost-savings' ? [
                '**Cost optimization:**',
                '- Time-of-use tariff: charge from grid during off-peak, discharge during peak',
                '- Dynamic ESS: should be enabled — it optimizes based on hourly electricity prices',
                '- Feed-in: if tariff is low, minimize export (increase self-consumption)',
                '- If tariff is high, consider allowing more export during peak feed-in hours',
                '- Grid setpoint: tune to balance between self-use and profitable export',
                '- EV/heat pump scheduling: shift to cheapest hours or solar hours',
              ].join('\n') : '',
              goal === 'battery-longevity' ? [
                '**Battery longevity optimization:**',
                '- Ideal SOC range: 20-80% (avoid full charge/discharge cycles)',
                '- Set min SOC to 20%, max charge to 80% if backup is not critical',
                '- Reduce charge/discharge current limits to 0.5C or lower',
                '- Temperature: keep battery 15-25°C — check temperature sensor readings',
                '- Avoid leaving battery at 100% SOC for extended periods',
                '- Shallow cycles (60-80%) are much better than deep cycles (10-100%)',
                '- Current cycle count and state of health: how is the battery aging?',
              ].join('\n') : '',
              goal === 'backup-ready' ? [
                '**Backup readiness optimization:**',
                '- Min SOC: set to 60-80% to always have backup capacity',
                '- Charge from grid if solar is insufficient to maintain min SOC',
                '- ESS mode: "Keep Batteries Charged" during storm season',
                '- Input current limit: set high enough for simultaneous charging + loads',
                '- Test: is the system configured to go off-grid automatically?',
                '- Generator: is auto-start configured as a secondary backup?',
              ].join('\n') : '',
              goal === 'balanced' ? [
                '**Balanced optimization:**',
                '- Self-consumption: target >70% solar utilization',
                '- Battery: keep SOC between 15-95%, shallow cycles preferred',
                '- Grid: minimize import during peak hours',
                '- ESS mode: "Optimized (with BatteryLife)" for most situations',
                '- Dynamic ESS: enable if time-of-use tariff available',
                '- Min SOC: 15-20% in summer, 30-40% in winter (more backup needed)',
              ].join('\n') : '',
              '',
              '**Phase 3 — Recommendations**',
              'Provide specific, actionable recommendations:',
              '1. ESS mode and grid setpoint changes (with exact values)',
              '2. Battery SOC limits (min/max)',
              '3. Charge/discharge current limits',
              '4. Load scheduling suggestions (which appliances, what times)',
              '5. Dynamic ESS enable/disable recommendation',
              '6. Seasonal adjustments (what to change next month)',
              '7. Any hardware observations (system undersized/oversized?)',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'storm-prep',
    {
      title: 'Storm Preparation',
      description: 'Pre-outage checklist: verify battery SOC, check grid status, review ESS settings, ensure system is ready for grid loss.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Prepare the Victron system${hint(host)} for a potential power outage.`,
            '',
            '1. Run victron_system_overview — check battery SOC and current grid status',
            '2. Run victron_battery_status — verify SOC is above 80%, check time-to-go, review alarms',
            '3. Run victron_vebus_status — check inverter mode, ESS settings, input current limit',
            '4. If Dynamic ESS is active, check its state in the system overview',
            '',
            'Report:',
            '- Battery readiness (SOC, estimated runtime at current load)',
            '- Inverter mode and state (is it ready to go off-grid?)',
            '- Any active alarms that could prevent backup operation',
            '- ESS mode — is it set to keep batteries charged or optimizing?',
            '- Recommendation: should anything be changed before the storm?',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'troubleshoot',
    {
      title: 'Troubleshoot Issue',
      description: 'Guided troubleshooting: describe the problem, then systematically read alarms, device states, and error codes to identify the cause.',
      argsSchema: {
        ...hostArg,
        issue: z.string().optional().describe('Description of the problem (e.g. "inverter not charging", "low solar yield", "grid alarm")'),
      },
    },
    async ({ host, issue }) => {
      const issueHint = issue ? `\n\nReported issue: "${issue}"` : '';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Troubleshoot the Victron system${hint(host)}.${issueHint}`,
              '',
              '1. Run victron_system_overview — get baseline state',
              '2. Run victron_battery_status — check for battery alarms (low voltage, high temp, cell imbalance)',
              '3. Run victron_vebus_status — check for VE.Bus alarms and warnings (overload, high temp, short circuit)',
              '4. Run victron_solar_status — check for charger errors and tracker state',
              '5. Run victron_grid_status — check grid voltage and frequency (out of range?)',
              '6. If relevant, run victron_search_docs to look up any error codes in the register documentation',
              '',
              'For each device with an issue:',
              '- Identify the specific alarm or error code',
              '- Use victron_search_docs to look up what the code means',
              '- Suggest the most likely cause and fix',
              '',
              'Provide a prioritized list of issues found, from most critical to least.',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'ess-tuning',
    {
      title: 'ESS Configuration Review',
      description: 'Review and optimize Energy Storage System settings: ESS mode, grid setpoint, battery limits, Dynamic ESS state.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Review the ESS (Energy Storage System) configuration on the Victron system${hint(host)}.`,
            '',
            '1. Run victron_system_overview — check Dynamic ESS state, battery SOC, grid power',
            '2. Run victron_vebus_status — check ESS mode, grid setpoint, input current limit, and inverter state',
            '3. Run victron_battery_status — check max charge/discharge current, SOC limits, battery health',
            '4. Run victron_solar_status — check PV production relative to load',
            '',
            'Analyze and recommend:',
            '- Is the ESS mode optimal for this system (Optimized with BatteryLife, Keep Charged, External Control)?',
            '- Is the grid setpoint appropriate for the battery and inverter size?',
            '- Are charge/discharge current limits reasonable for the battery?',
            '- Is Dynamic ESS active and what strategy is it using?',
            '- Self-consumption ratio — how much solar goes to battery vs grid?',
            '- Any settings that could be improved for better self-consumption or battery longevity',
          ].join('\n'),
        },
      }],
    }),
  );

  // === Installer / implementor prompts ===

  server.registerPrompt(
    'commissioning',
    {
      title: 'System Commissioning',
      description: 'Installer checklist for new system commissioning: discover all devices, verify wiring, check firmware, validate configuration.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Commission the Victron system${hint(host)}. Run a full installer checklist:`,
            '',
            '**Phase 1 — Device Inventory**',
            '1. Run victron_setup to discover all devices via both Modbus and MQTT',
            '2. Run victron_gx_info for GX serial number and firmware',
            '3. List every discovered device with unit ID, service type, and description',
            '',
            '**Phase 2 — Device Verification**',
            '4. Run victron_battery_status — verify battery voltage, capacity, cell count, BMS communication',
            '5. Run victron_vebus_status — verify Multi/Quattro AC in/out, mode, firmware',
            '6. Run victron_solar_status — verify each MPPT tracker, PV voltage, charger state',
            '7. If grid meter present, run victron_grid_status — verify per-phase readings',
            '8. Run victron_temperature — verify all temperature sensors are reading',
            '9. Check for any devices in the discover list not covered above — use victron_read_category',
            '',
            '**Phase 3 — Configuration Validation**',
            '10. Check ESS settings via victron_vebus_status',
            '11. Verify battery charge/discharge limits match battery specs',
            '12. Check input current limit matches the installation',
            '',
            'Output a commissioning report with:',
            '- Device inventory table (type, serial/ID, firmware if available)',
            '- AC wiring verification (grid, loads, PV)',
            '- DC wiring verification (battery, solar)',
            '- Any alarms, errors, or misconfigurations found',
            '- Pass/fail checklist',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'device-inventory',
    {
      title: 'Device Inventory',
      description: 'Full inventory of all connected Victron devices with unit IDs, service types, and key parameters — for documentation or support tickets.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Generate a complete device inventory for the Victron system${hint(host)}.`,
            '',
            '1. Run victron_setup to discover all devices',
            '2. For each discovered device, read its status tool to get key parameters:',
            '   - Battery: model, capacity, cell count, firmware',
            '   - Inverter/Multi: model, firmware, AC ratings',
            '   - Solar chargers: model, PV configuration, tracker count',
            '   - Grid meter: type, phase configuration',
            '   - Other devices: type and key identifiers',
            '3. Run victron_gx_info for GX device serial and firmware',
            '',
            'Present as a table:',
            '| Device Type | Unit ID | Description | Key Parameters |',
            '',
            'This inventory can be used for support tickets, documentation, or insurance records.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'site-audit',
    {
      title: 'Site Audit',
      description: 'Comprehensive site audit for installers: verify all devices are communicating, check for alarms, validate AC/DC measurements, flag potential issues.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Perform a site audit on the Victron system${hint(host)}.`,
            '',
            '**1. Communication Check**',
            '- Run victron_setup to discover all devices',
            '- Flag any expected devices that are missing (e.g. known battery count vs discovered)',
            '',
            '**2. Alarm Scan**',
            '- Run victron_battery_status — check all alarm registers (low/high voltage, temperature, cell imbalance, BMS errors)',
            '- Run victron_vebus_status — check VE.Bus alarms and warnings',
            '- Run victron_solar_status — check charger error codes',
            '',
            '**3. Measurement Validation**',
            '- Run victron_grid_status — verify per-phase voltage is within 207-253V (EU) or local standards, frequency 49.5-50.5 Hz',
            '- Run victron_battery_status — verify cell voltages are balanced (mid-point deviation < 2%)',
            '- Run victron_solar_status — compare PV voltage across trackers (large imbalance = wiring issue?)',
            '- Run victron_temperature — verify no sensors reading abnormal values',
            '',
            '**4. Performance Check**',
            '- Run victron_system_overview — check power flows make physical sense',
            '- PV power should match irradiance conditions',
            '- Grid power should equal consumption minus production minus battery',
            '',
            'Output a site audit report with:',
            '- Communication status (all devices online?)',
            '- Active alarms (any?)',
            '- Measurement anomalies (anything out of range?)',
            '- Performance assessment (system operating as expected?)',
            '- Action items for the installer (prioritized)',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'solar-performance',
    {
      title: 'Solar Performance Check',
      description: 'Evaluate solar array performance: PV yield, tracker comparison, charger states, and potential shading or wiring issues.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Check solar performance on the Victron system${hint(host)}.`,
            '',
            '1. Run victron_solar_status — get PV power, voltage, current, yield today/yesterday/total for each charger',
            '2. Run victron_system_overview — check total DC-coupled PV power and AC-coupled PV',
            '3. If AC-coupled PV inverters exist, run victron_pvinverter_status',
            '',
            'Analyze:',
            '- Current PV power vs expected (based on array size if known)',
            '- Yield today vs yesterday — significant drop could indicate issue',
            '- Per-tracker comparison — large imbalance suggests shading, wiring, or panel issue',
            '- Charger state (Bulk/Absorption/Float) — is it appropriate for current conditions?',
            '- PV voltage — is it in the expected range for the string configuration?',
            '- Any charger error codes',
            '',
            'If underperformance is detected, suggest possible causes:',
            '- Shading (partial or full)',
            '- Dirty panels',
            '- String wiring issue (loose connector, damaged cable)',
            '- Incorrect MPPT configuration',
            '- Battery full (charger throttled)',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'tank-monitor',
    {
      title: 'Tank Monitor',
      description: 'Check all tank levels: fuel, fresh water, waste water, black water — with low-level warnings.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Check all tank levels on the Victron system${hint(host)}.`,
            '',
            '1. Run victron_tank_levels to read all connected tank sensors',
            '',
            'For each tank, report:',
            '- Tank type (fuel, fresh water, waste water, black water, LPG, etc.)',
            '- Current level (%) and remaining volume if capacity is known',
            '- Warning if: fuel < 25%, fresh water < 20%, waste water > 80%, black water > 75%',
            '',
            'This is useful for marine, RV, and off-grid systems with tank monitoring.',
          ].join('\n'),
        },
      }],
    }),
  );

  // === Integration / advanced prompts ===

  server.registerPrompt(
    'nodered-check',
    {
      title: 'Node-RED Integration Check',
      description: 'Verify Node-RED integration on Venus OS: check MQTT topics, available data paths, and help debug flow issues.',
      argsSchema: hostArg,
    },
    async ({ host }) => {
      const hostVal = host ?? 'the GX device';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Check Node-RED integration on the Victron system (${hostVal}).`,
              '',
              'Venus OS runs Node-RED at http://<gx-ip>:1880. It communicates with Victron devices via MQTT on the local broker.',
              '',
              '**Step 1 — Verify MQTT broker**',
              '1. Run victron_mqtt_discover to confirm the MQTT broker is reachable and find the portal ID',
              '2. List all discovered MQTT services and device instances',
              '',
              '**Step 2 — Map available data for Node-RED flows**',
              '3. Run victron_search_docs with query "dbus-obj-path" to show available MQTT topic paths',
              '4. Show the MQTT topic structure: N/<portalId>/<service>/<deviceInstance>/<path>',
              '',
              '**Step 3 — Common Node-RED patterns**',
              'Explain how to:',
              '- Subscribe to real-time values (e.g. N/<portalId>/system/0/Dc/Battery/Soc)',
              '- Write values via MQTT (W/<portalId>/<service>/<instance>/<path> with JSON {"value": X})',
              '- Send keepalive (R/<portalId>/keepalive with empty payload, needed every 60s)',
              '- Read the portal ID from N/+/system/+/Serial',
              '',
              '**Step 4 — Troubleshooting**',
              '- If Node-RED flows show no data: is the keepalive being sent?',
              '- If values are stale: check the subscribe topic matches the portal ID',
              '- If writes fail: is the register writable? Check victron_list_registers',
              '',
              'Provide the key MQTT topics for the most commonly used values in Node-RED flows:',
              '- Battery SOC, voltage, power',
              '- PV power, grid power',
              '- ESS mode, grid setpoint',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'vrm-api-guide',
    {
      title: 'VRM API Guide',
      description: 'Guide to using the Victron Remote Monitoring (VRM) cloud API: authentication, key endpoints, and comparing local vs cloud data.',
      argsSchema: {
        ...hostArg,
        siteId: z.string().optional().describe('VRM site/installation ID (numeric)'),
      },
    },
    async ({ host, siteId }) => {
      const siteHint = siteId ? ` (site ID: ${siteId})` : '';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Guide me through the VRM API for the Victron system${hint(host)}${siteHint}.`,
              '',
              'The VRM API is at https://vrmapi.victronenergy.com/v2',
              '',
              '**Step 1 — Authentication**',
              '1. Use victron_search_docs with query "auth/login" to find the login endpoint',
              '2. POST /auth/login with { "username": "email", "password": "pass" } returns a Bearer token',
              '3. Use the token in x-authorization header: "Bearer <token>"',
              '4. For long-lived access: create an access token via /users/{idUser}/accesstokens (Token <value> format)',
              '',
              '**Step 2 — Find your installation**',
              '5. GET /users/{idUser}/installations to list all sites',
              '6. Each site has an idSite used in subsequent calls',
              '',
              '**Step 3 — Key endpoints**',
              '7. Use victron_search_docs with query "installations" source "vrm-api" to see all available endpoints',
              '8. Most useful:',
              '   - /installations/{idSite}/system-overview — live system state',
              '   - /installations/{idSite}/stats — historical stats (energy, power)',
              '   - /installations/{idSite}/overallstats — lifetime statistics',
              '   - /installations/{idSite}/diagnostics — device diagnostics',
              '   - /installations/{idSite}/alarms — active and historical alarms',
              '   - /installations/{idSite}/widgets/BatterySummary — battery details',
              '   - /installations/{idSite}/widgets/SolarChargerSummary — solar details',
              '',
              '**Step 4 — Compare local vs cloud**',
              siteId
                ? `9. Run victron_system_overview for local data, then compare with VRM /installations/${siteId}/system-overview`
                : '9. Run victron_system_overview locally to compare with VRM cloud data',
              '10. Differences may indicate communication delays or VRM portal connectivity issues',
              '',
              '**Rate limits:** Max 200 requests per rolling window, ~3 req/s sustained.',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'mqtt-debug',
    {
      title: 'MQTT Debug',
      description: 'Debug MQTT connectivity and data flow: verify broker, check topics, trace missing data, validate keepalive.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Debug MQTT on the Victron system${hint(host)}.`,
            '',
            '**Step 1 — Broker connectivity**',
            '1. Run victron_mqtt_discover — does it find the portal ID?',
            '   - If timeout: MQTT broker may not be running, check Venus OS Settings → Services',
            '   - If success: note the portal ID and all discovered services',
            '',
            '**Step 2 — Service inventory**',
            '2. List all services found via MQTT and compare with victron_discover (Modbus)',
            '   - More services via MQTT? Normal — MQTT exposes some services Modbus doesn\'t',
            '   - Fewer via MQTT? Device may not be publishing — check dbus-mqtt on Venus OS',
            '',
            '**Step 3 — Topic structure**',
            '3. MQTT topics follow: N/<portalId>/<serviceType>/<deviceInstance>/<dbus-path>',
            '   - Use victron_search_docs to find dbus-path for specific values',
            '   - Example: battery SOC → N/<portalId>/battery/256/Soc',
            '',
            '**Step 4 — Common issues**',
            '- **No data after subscribe**: Must send keepalive to R/<portalId>/keepalive every 60s',
            '- **Stale values**: Venus OS only publishes on change — values that don\'t change won\'t retransmit',
            '- **Wrong device instance**: Use victron_mqtt_discover to find correct instance numbers',
            '- **Write not working**: Publish to W/<portalId>/<service>/<instance>/<path> with JSON {"value": X}',
            '  Only writable registers accept writes — check victron_list_registers for the writable column',
            '',
            '**Step 5 — Useful debug commands (for terminal)**',
            '```',
            'mosquitto_sub -h <gx-ip> -t "N/#" -v          # See all topics',
            'mosquitto_pub -h <gx-ip> -t "R/<portalId>/keepalive" -m ""   # Trigger data',
            '```',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'generator-management',
    {
      title: 'Generator Management',
      description: 'Check generator auto-start conditions, runtime, quiet hours, and troubleshoot start/stop issues.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Check generator management on the Victron system${hint(host)}.`,
            '',
            '1. Run victron_generator_status — check auto-start settings, runtime, conditions, quiet hours',
            '2. Run victron_system_overview — check battery SOC (primary trigger for generator start)',
            '3. If AC genset is connected, run victron_genset_status for genset-specific data',
            '4. If DC genset, run victron_dcgenset_status',
            '',
            'Report:',
            '- Auto-start enabled? What are the start/stop conditions?',
            '- Current generator state (running, stopped, error)',
            '- Total runtime hours',
            '- Quiet hours configuration (if any)',
            '- Battery SOC vs start/stop thresholds',
            '- Any generator alarms or errors',
            '',
            'Common issues:',
            '- Generator starts too often: SOC thresholds too close together, increase the gap',
            '- Generator won\'t start: check relay wiring, auto-start enable, and alarm conditions',
            '- Generator runs during quiet hours: check quiet hours configuration',
            '- Generator runs but doesn\'t charge: check AC input current limit, inverter/charger mode',
          ].join('\n'),
        },
      }],
    }),
  );

  // === Discovery & device mapping prompts ===

  server.registerPrompt(
    'find-devices',
    {
      title: 'Find Victron Devices',
      description: 'Scan the local network for all Victron GX devices, then discover every device behind each GX. No IP needed — auto-detects from network interfaces.',
    },
    async () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            'Find all Victron devices on my network.',
            '',
            '**Phase 1 — Find GX devices on the network**',
            '1. Run victron_network_scan to probe the local subnet for Modbus TCP (port 502) and MQTT (port 1883)',
            '2. For each GX device found, note the IP, hostname (if mDNS), and which ports responded',
            '',
            '**Phase 2 — Discover devices behind each GX**',
            '3. For each GX, run victron_setup to test both transports and discover all connected devices',
            '4. This reveals every battery, inverter, solar charger, tank sensor, etc. on that GX',
            '',
            '**Phase 3 — Present the map**',
            'Output a network map:',
            '```',
            'Network: 192.168.1.0/24',
            '├── GX Device: 192.168.1.50 (venus.local) — Modbus + MQTT',
            '│   ├── Unit 100: System',
            '│   ├── Unit 247: Battery (Lynx Smart BMS)',
            '│   ├── Unit 226: Solar Charger (SmartSolar MPPT)',
            '│   ├── Unit 227: VE.Bus (MultiPlus-II)',
            '│   └── Unit 30: Grid Meter',
            '└── (no other GX devices found)',
            '```',
            '',
            'If multiple GX devices are found, map each one separately.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'identify-device',
    {
      title: 'Identify Device',
      description: 'Identify an unknown Victron device by its unit ID or service type — show what it is, what data it exposes, and which tool to use.',
      argsSchema: {
        ...hostArg,
        unitId: z.string().optional().describe('Modbus unit ID to identify (e.g. "247")'),
        service: z.string().optional().describe('Service type to look up (e.g. "battery", "solarcharger", "vebus")'),
      },
    },
    async ({ host, unitId, service }) => {
      const lookupHint = unitId
        ? `unit ID ${unitId}`
        : service
          ? `service "${service}"`
          : 'the specified device';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Identify the Victron device: ${lookupHint}${hint(host)}.`,
              '',
              unitId
                ? [
                  `1. Run victron_discover to scan the system and find what service is at unit ID ${unitId}`,
                  `2. Once the service type is known, run victron_list_registers with that category to see all available data`,
                  `3. Read the device status using the appropriate tool (e.g. victron_battery_status for batteries)`,
                ].join('\n')
                : [
                  `1. Run victron_search_docs with query "${service ?? 'the device type'}" to find its register definition`,
                  `2. Run victron_list_registers with the category to see all available registers`,
                  `3. Check the default unit ID from the register list`,
                ].join('\n'),
              '',
              'Report:',
              '- **Device type**: What kind of device is this? (battery, inverter, solar charger, etc.)',
              '- **Service name**: The com.victronenergy.* service identifier',
              '- **Default unit ID range**: Where these devices typically appear',
              '- **Available data**: Key registers (voltage, current, power, state, alarms)',
              '- **Recommended tool**: Which victron_* tool to use for this device',
              '- **Register count**: How many registers are available',
              '- **Writable registers**: Any registers that can be written (for control)',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'system-topology',
    {
      title: 'System Topology',
      description: 'Map the full energy system topology: AC/DC buses, device connections, energy flow paths, and phase configuration.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Map the energy system topology${hint(host)}.`,
            '',
            '**Step 1 — Discover all devices**',
            '1. Run victron_setup to find every connected device',
            '',
            '**Step 2 — Read key parameters**',
            '2. Run victron_system_overview — identify AC input source, PV type (DC vs AC coupled)',
            '3. Run victron_vebus_status — determine Multi/Quattro configuration (single/split/three-phase)',
            '4. Run victron_grid_status — identify phase count, grid meter position',
            '5. Run victron_solar_status — DC-coupled PV (MPPT chargers)',
            '6. If present, run victron_pvinverter_status — AC-coupled PV (Fronius, etc.)',
            '7. Run victron_battery_status — battery bank configuration',
            '',
            '**Step 3 — Draw the topology**',
            'Present the system as an energy flow diagram:',
            '```',
            'Grid ──┬── AC Input ── Multi/Quattro ── AC Output ──┬── Loads',
            '       │                    │                        │',
            '       │                DC Bus                  AC-PV (Fronius)',
            '       │               /      \\',
            '       │          Battery    MPPT ── PV Panels',
            '       │',
            '   Grid Meter',
            '```',
            '',
            'Include:',
            '- Phase configuration (1P, 3P, split-phase)',
            '- AC input source (grid, generator, or both via Quattro)',
            '- DC bus: what is connected (battery, MPPT, DC loads)',
            '- AC output: what is connected (loads, AC-coupled PV)',
            '- Current power flow direction on each path',
            '- Any parallel or series configurations (multiple Multis, battery banks)',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'register-explorer',
    {
      title: 'Register Explorer',
      description: 'Explore available Modbus registers for a device: list all registers, explain data types and scale factors, help read specific values.',
      argsSchema: {
        ...hostArg,
        category: z.string().optional().describe('Device category to explore (e.g. "battery", "solar", "system", "vebus")'),
      },
    },
    async ({ host, category }) => {
      const catHint = category ? ` for category "${category}"` : '';
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Explore Victron Modbus registers${catHint}${hint(host)}.`,
              '',
              category
                ? `1. Run victron_list_registers with category="${category}" to see all available registers`
                : '1. Run victron_list_registers with a category (e.g. "system", "battery", "solar", "vebus", "grid")',
              '2. Explain the key registers:',
              '   - What each data type means (uint16, int16, uint32, int32, string)',
              '   - How scale factors work (value = raw_register / scaleFactor)',
              '   - What "Not available" sentinel values are (0xFFFF for uint16, 0x7FFF for int16)',
              '   - Which registers are writable and what values they accept',
              '',
              '3. If a specific register is interesting, use victron_read_register to read it live:',
              '   - Show the raw value and the decoded/scaled value',
              '   - For enum registers, show the meaning of the current value',
              '',
              '4. Use victron_search_docs to find additional context in the official register list',
              '   - The docs include ranges, remarks, and dbus paths not shown in the tool output',
              '',
              'This is useful for:',
              '- Building custom integrations (Node-RED, Home Assistant, Grafana)',
              '- Understanding what data is available for automation',
              '- Debugging register read issues',
              '- Planning which registers to poll in a custom Modbus client',
            ].join('\n'),
          },
        }],
      };
    },
  );

  server.registerPrompt(
    'firmware-check',
    {
      title: 'Firmware Check',
      description: 'Check firmware versions across all devices and GX, flag outdated versions, suggest updates.',
      argsSchema: hostArg,
    },
    async ({ host }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Check firmware versions on the Victron system${hint(host)}.`,
            '',
            '1. Run victron_gx_info — get GX device serial, firmware, and relay states',
            '2. Run victron_setup to discover all devices',
            '3. For each device type, read its status to find firmware/version info if available:',
            '   - victron_vebus_status for Multi/Quattro firmware',
            '   - victron_solar_status for MPPT firmware',
            '   - victron_battery_status for BMS firmware',
            '   - victron_search_docs with "firmware" for any firmware-related registers',
            '',
            'Report:',
            '- GX device firmware version',
            '- Each connected device with its firmware version (if readable)',
            '- Flag any devices where firmware info is not available via Modbus/MQTT',
            '- Note: full firmware version details may require VRM portal access',
            '',
            'Tip: Venus OS firmware updates are managed through the GX device (Settings → Firmware) or via VRM.',
          ].join('\n'),
        },
      }],
    }),
  );
}
