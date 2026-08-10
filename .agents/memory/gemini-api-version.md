---
name: Gemini apiVersion empty string
description: Why GoogleGenAI SDK needs apiVersion:"" when using Replit AI Integrations proxy.
---

## Rule
Always set `apiVersion: ""` in `httpOptions` when creating the `GoogleGenAI` client with the Replit AI Integrations proxy.

```ts
export const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",  // REQUIRED — Replit proxy uses its own prefix; don't prepend /v1beta/
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});
```

## Why
Without `apiVersion: ""`, the SDK defaults to appending `/v1beta/` to the base URL, producing:
  `POST /v1beta/models/gemini-2.5-flash:generateContent`
The Replit AI Integrations proxy uses its own path structure (e.g., `/modelfarm/gemini/...`) and does NOT support the `/v1beta/` or `/v1/` prefixed formats. It returns `INVALID_ENDPOINT`.

## How to apply
- Every new `GoogleGenAI` instantiation in this project that uses `AI_INTEGRATIONS_GEMINI_BASE_URL` must include `apiVersion: ""`.
- The reference implementation is in `lib/integrations-gemini-ai/src/client.ts`.
- Supported model names (check skill for updates): `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-flash-preview`, `gemini-3.1-pro-preview`.
- `gemini-2.0-flash` and other older models are NOT supported by the Replit proxy.
