---
name: JWT auth for Replit iframe
description: Why we switched from session cookies to JWT tokens, and how the auth flow works.
---

## Rule
Use JWT tokens (Authorization: Bearer) for auth, NOT session cookies.

## Why
Replit's webview is an iframe embedded in replit.com. The app runs at `*.pike.replit.dev`.
Browsers block `SameSite=Lax` cookies in cross-site iframes (top-level site = replit.com).
Even `SameSite=None; Secure` can break because:
1. Chrome 120+ deprecates third-party cookies in iframes.
2. Express with `secure: true` requires `req.secure=true` (needs `trust proxy: 1` + proxy sending `X-Forwarded-Proto: https`).
JWT stored in `localStorage` is unaffected by all of these — it's sent as an Authorization header.

## How to apply
- Server: `src/lib/jwt.ts` — `signToken(payload)` / `verifyToken(token)` using SESSION_SECRET.
- Auth routes: login + register return `{ user, token }` instead of just `UserData`.
- `requireAuth` middleware: checks `Authorization: Bearer <JWT>` first, falls back to session cookie.
- Client: `src/lib/api.ts` — `getToken()`/`setToken()`/`clearToken()` in localStorage.
  All requests add `Authorization: Bearer <token>` header automatically.
- `src/lib/auth.tsx`: `login()` and `register()` destructure `{ user, token }` from response, call `setToken(token)`.
- `GET /api/auth/me` still returns `UserData` directly (no token needed in response).
