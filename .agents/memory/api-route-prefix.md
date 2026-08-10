---
name: API route double-prefix bug
description: Auth router route paths had the mount prefix baked in, causing 404s.
---

## Rule
When a router is mounted at a prefix (e.g. `router.use("/auth", authRouter)`), the handler paths inside that router must NOT repeat the prefix. Use `/login` not `/auth/login`.

**Why:** Express concatenates the mount path with the handler path. Double-prefixing silently creates routes at `/api/auth/auth/login` instead of `/api/auth/login`, returning 404 with no warning.

**How to apply:** After adding a new router file, grep for `router.post("/routerName/` or `router.get("/routerName/` — any match is a double-prefix bug. Fix: strip the mount-path segment from the handler strings.

Other routers in this project (household, meters, bills, dashboard, assistant, savings) use correct relative paths (`/`, `/:id`, `/what-if` etc.) — only auth.ts had this bug.
