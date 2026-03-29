import { describe, it, expect } from 'vitest';
import { errorResult, formatResults } from '../src/tools/helpers.js';

describe('errorResult', () => {
  it('wraps string error', () => {
    const result = errorResult('something failed');
    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as { text: string }).text).toContain('something failed');
  });

  it('wraps Error object', () => {
    const result = errorResult(new Error('test error'));
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toContain('test error');
  });

  it('enriches ECONNREFUSED on port 502 with Modbus hint', () => {
    const result = errorResult(new Error('connect ECONNREFUSED 192.168.1.50:502'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Modbus TCP');
    expect(text).toContain('Settings');
  });

  it('enriches ECONNREFUSED on port 1883 with MQTT hint', () => {
    const result = errorResult(new Error('connect ECONNREFUSED 192.168.1.50:1883'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('MQTT');
    expect(text).toContain('Venus OS');
  });

  it('enriches ECONNREFUSED on other ports with generic hint', () => {
    const result = errorResult(new Error('connect ECONNREFUSED 192.168.1.50:8080'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Connection refused');
  });

  it('enriches EHOSTUNREACH', () => {
    const result = errorResult(new Error('connect EHOSTUNREACH 10.0.0.1'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('unreachable');
    expect(text).toContain('same network');
  });

  it('enriches EHOSTDOWN', () => {
    const result = errorResult(new Error('connect EHOSTDOWN 192.168.1.99:502'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('unreachable');
  });

  it('enriches ENETUNREACH', () => {
    const result = errorResult(new Error('connect ENETUNREACH'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('unreachable');
  });

  it('enriches Connection timeout', () => {
    const result = errorResult(new Error('Connection timeout'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('timed out');
  });

  it('enriches TCP Connection Timed Out', () => {
    const result = errorResult(new Error('TCP Connection Timed Out'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('timed out');
  });

  it('enriches ETIMEDOUT', () => {
    const result = errorResult(new Error('connect ETIMEDOUT 192.168.1.50:502'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('timed out');
    expect(text).toContain('firewall');
  });

  it('enriches Portal ID discovery timeout', () => {
    const result = errorResult(new Error('Portal ID discovery timeout — no MQTT data received'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('MQTT broker');
  });

  it('does not enrich unknown errors', () => {
    const result = errorResult(new Error('some random error'));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toBe('Error: some random error');
  });
});

describe('formatResults', () => {
  it('formats register results as markdown', () => {
    const result = formatResults('Test', [
      { name: 'voltage', description: 'Battery Voltage', rawValue: 5200, value: 52, unit: 'V', },
      { name: 'current', description: 'Battery Current', rawValue: 100, value: 10, unit: 'A', },
    ]);

    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('# Test');
    expect(text).toContain('**Battery Voltage**: 52 V');
    expect(text).toContain('**Battery Current**: 10 A');
  });

  it('uses enumLabel when present', () => {
    const result = formatResults('Test', [
      { name: 'state', description: 'State', rawValue: 1, value: 1, unit: '', enumLabel: 'Charging' },
    ]);

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('**State**: Charging');
  });

  it('skips unavailable registers', () => {
    const result = formatResults('Test', [
      { name: 'ok', description: 'OK Value', rawValue: 42, value: 42, unit: 'W' },
      { name: 'na', description: 'Not Available', rawValue: 65535, value: 'Not available', unit: 'V' },
      { name: 'err', description: 'Error', rawValue: 0, value: 'Error reading register', unit: 'A' },
    ]);

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('OK Value');
    expect(text).not.toContain('Not Available');
    expect(text).not.toContain('Error');
  });

  it('shows fallback message when all registers unavailable', () => {
    const result = formatResults('Test', [
      { name: 'na', description: 'NA', rawValue: 65535, value: 'Not available', unit: '' },
    ]);

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('No data available');
  });
});
