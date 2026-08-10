---
name: Seed script location
description: RASHED seed must live in lib/db/src/seed.ts with tsx as a devDep.
---

## Rule
The seed script must live at `lib/db/src/seed.ts` and be run via `pnpm --filter @workspace/db run seed` (which calls `tsx src/seed.ts`). Add `tsx` to `lib/db`'s devDependencies.

**Why:** Running from workspace root or the scripts package fails because `drizzle-orm` and `@workspace/db` resolve from the wrong package context. The db package already has drizzle-orm, pg, and bcrypt as direct dependencies.

**How to apply:** `lib/db/package.json` scripts: `"seed": "tsx src/seed.ts"`, devDependencies: `"tsx": "catalog:"`. Run with `pnpm --filter @workspace/db run seed`.
