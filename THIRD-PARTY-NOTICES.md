# Third-Party Notices

This project includes data derived from the following third-party sources.

## Victron Energy — CCGX Modbus TCP Register List

- **File:** `docs/register-list.md` (converted from Excel), `data/ccgx-registers.json`
- **Source:** [CCGX Modbus TCP Register List](https://www.victronenergy.com/support-and-downloads/technical-information)
- **Version:** Rev 3.71
- **Copyright:** Victron Energy B.V.
- **Usage:** This register list is published by Victron Energy for the purpose of enabling third-party Modbus TCP integrations with their GX devices. It is included here in converted form to provide offline documentation within the MCP server.

## Victron Energy — VRM API OpenAPI Specification

- **File:** `docs/vrm-api-openapi.yaml`
- **Source:** [VRM API Documentation](https://vrm-api-docs.victronenergy.com/)
- **Copyright:** Victron Energy B.V.
- **Usage:** The VRM API specification is publicly available for third-party integration. It is included here as a reference resource within the MCP server. Per Victron's documentation disclaimer, this API is provided without official support for third-party implementations.

## npm Dependencies

All npm dependencies use permissive open-source licenses (MIT, ISC, BSD, Apache-2.0, MPL-2.0, 0BSD). No copyleft (GPL/AGPL/LGPL) dependencies are included. Run `npx license-checker --summary` for a full breakdown.
