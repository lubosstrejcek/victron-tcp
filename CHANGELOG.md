# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **`VICTRON_HOST` and related env vars now work as documented defaults** (#44).
  `host` (and `port`) were required at the tool input-schema level, so calls
  omitting them were rejected by schema validation before the env-var fallback
  in `buildConnectionParams` could run. `host`, `port`, and (for
  `victron_read_register`) `unitId` are now optional, falling back to
  `VICTRON_HOST`, `VICTRON_MODBUS_PORT`, and `VICTRON_UNIT_ID`; explicit tool
  arguments still override env vars. Omitting the host with no env var set now
  returns an actionable error instead of a raw validation failure.
  `victron_evcs_status` intentionally still requires an explicit `host`, since
  it connects to the EVCS directly rather than the GX device that
  `VICTRON_HOST` points at.

## [1.4.0] - 2026-06-17

### Fixed
- **Modbus uint32 decoding** no longer overflows to a negative number for values
  ≥ 2³¹ (it used a signed 32-bit bit-shift). This also restores detection of the
  `0xFFFFFFFF` "not available" sentinel for uint32 registers, which previously
  surfaced as `-1`.
- **int16 readings of `-1`** are no longer incorrectly reported as "Not available"
  (a bogus sentinel check flagged the legitimate value `-1`).

### Changed
- Regenerated the runtime register database from the official **CCGX Modbus TCP
  register list Rev 3.71** (890 CCGX registers across 33 categories, plus 42 EVCS
  direct-connection registers), adding the `com.victronenergy.platform` category.
  The Excel converter now normalizes Type-column typos and skips `RESERVED`
  placeholder rows (matched in both the dbus-path and description columns).
- **Disconnected-sensor detection** now also covers `uint64` registers
  (`0xFFFFFFFFFFFFFFFF` → "Not available").
- **MQTT reads** now return as soon as Venus OS publishes
  `N/<portalId>/full_publish_completed`, instead of always waiting out the read
  timeout when a device does not expose some of the requested registers.

### Added
- A stdio smoke test (`npm run smoke`) that boots the built server, verifies its
  advertised capabilities, and performs an end-to-end Modbus read against the
  bundled simulator.
- GitHub Actions CI (build → test → smoke) on Node 24.
- `npm run inspect:cli` for ad-hoc MCP Inspector CLI queries.

## [1.3.1]

- Baseline prior to this changelog.
