---
name: Zod v4 + Orval codegen
description: Orval 8.23 generates Zod v4 APIs; catalog must use ^4.x and OpenAPI integers must be numbers.
---

## Rule
Orval 8.23 generates `z.int()` and `z.email()` which are Zod v4 APIs. The pnpm catalog must use `zod: "^4.4.3"` (not `^3.x`). All `type: integer` fields in the OpenAPI spec must be changed to `type: number` to avoid `z.int()` generation.

**Why:** `z.int()` does not exist in Zod v3. Using Orval 8.23 with Zod v3 causes TypeScript errors in all generated validators.

**How to apply:** If codegen breaks after an Orval upgrade, check the generated file for `z.int()` or `z.email()` — if present, upgrade the Zod catalog entry and change integer types in openapi.yaml.
