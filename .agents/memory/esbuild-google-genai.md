---
name: esbuild externals and @google/genai
description: @google/genai must be bundled (not externalized) and added as a direct api-server dep.
---

## Rule
`@google/genai` is a pure-JS package that esbuild CAN bundle. It must NOT be in the `external` list in `build.mjs`, AND it must be a direct dependency of the api-server package (not just a transitive dep via `@workspace/integrations-gemini-ai`).

**Why:** The build.mjs had `"@google/*"` in externals (added to catch `@google-cloud/*` proto-file packages). When externalized, Node looks for the package in the local `node_modules` at runtime, but pnpm only installs it under the integrations workspace package, not the api-server. Result: `ERR_MODULE_NOT_FOUND` at startup.

**How to apply:**
1. Keep `"@google-cloud/*"` in externals (those load .proto files at runtime).
2. Remove `"@google/*"` from externals.
3. Run `pnpm --filter @workspace/api-server add @google/genai` to make it a direct dep.
