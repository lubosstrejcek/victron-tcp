import { z } from 'zod';

/**
 * Shared outputSchema shapes used across tool definitions. MCP SDK accepts
 * either a zod shape object (`ZodRawShapeCompat`) or a raw JSON Schema — we
 * use zod shapes so the SDK converts them to JSON Schema on the wire.
 *
 * Most tcp device-status tools return `{ readings: [...] }`; discovery and
 * doc tools have their own shapes.
 */

export const readingsSchema = {
  readings: z.array(
    z.object({
      group: z.string().optional(),
      name: z.string(),
      description: z.string().optional(),
      value: z.union([z.number(), z.string(), z.boolean(), z.null()]).optional(),
      unit: z.string().optional(),
      enumLabel: z.string().optional(),
      raw: z.union([z.number(), z.string()]).optional(),
    }).passthrough(),
  ),
  serviceInstance: z.union([z.number(), z.string()]).optional(),
};

export const outputSchemas = {
  readings: readingsSchema,

  discovery: {
    success: z.boolean().optional(),
    devices: z.array(z.unknown()).optional(),
    services: z.array(z.unknown()).optional(),
    foundHosts: z.array(z.unknown()).optional(),
    portalId: z.string().optional(),
  },

  docs: {
    source: z.string().optional(),
    matches: z.array(z.unknown()).optional(),
    query: z.string().optional(),
  },

  onlineSource: {
    url: z.string(),
    label: z.string(),
  },

  registerList: {
    service: z.string(),
    registerCount: z.number(),
    registers: z.array(z.unknown()),
  },

  rawRegister: {
    address: z.union([z.number(), z.string()]),
    value: z.union([z.number(), z.string(), z.array(z.number())]).optional(),
    raw: z.unknown().optional(),
  },

  category: {
    service: z.string().optional(),
    readings: z.array(z.unknown()).optional(),
  },
} as const;
