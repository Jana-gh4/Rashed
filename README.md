<div align="center">

<img src="artifacts/rashed/public/icon.png" alt="رشّد Logo" width="80" height="80" />

# رشّد · RASHED

### ذكاء استهلاك المياه · Water Intelligence

**AI-powered household water intelligence for Saudi Arabia**

*Submitted to AI Champion 2026 — Google for Developers × Tuwaiq Academy*
*Track 02: Environmental Sustainability*

[![Built with Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)

</div>

---

## 📖 Overview

Saudi Arabia is one of the world's most water-scarce countries, yet household water waste remains high due to a lack of visibility and actionable guidance. **رشّد (RASHED)** addresses this by turning a paper water bill into a full AI-powered intelligence report — tracking consumption, predicting costs, surfacing personalised conservation plans, and providing a bilingual Arabic/English AI assistant.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **Smart Bill Upload** | Photograph your SWCC/NWC water bill — Gemini Vision extracts consumption, period, and cost automatically |
| 📊 **Consumption Dashboard** | Historical usage trends, cost breakdowns by tariff tier, and month-over-month comparisons |
| 🤖 **AI Conservation Assistant** | Bilingual chat assistant (Arabic & English) answers water-saving questions with household context |
| 💡 **Personalised Plan** | Select a savings goal (10–30%) and Gemini generates 5 actionable conservation steps with projected impact |
| 💧 **What-If Simulator** | Model how behaviour changes translate to SAR savings and m³ reductions |
| 🏠 **Household Profiling** | Household size and meter data feed all AI recommendations |
| 🌐 **Bilingual RTL/LTR** | Full Arabic (RTL) and English (LTR) support with instant toggle |

---

## 🏗️ Architecture

```
├── artifacts/
│   ├── rashed/          # React 19 + Vite mobile-first PWA (port $PORT)
│   └── api-server/      # Express 5 REST API (port $PORT)
├── packages/
│   ├── db/              # Drizzle ORM schema + migrations (PostgreSQL)
│   ├── api-spec/        # OpenAPI spec + Orval codegen (Zod v4 + React Query)
│   └── lib/             # Shared TypeScript utilities
```

### Tech Stack

**Frontend**
- React 19, Vite, TypeScript 5.9
- Tailwind CSS v4, Lucide icons
- TanStack Query (via Orval codegen)
- `react-i18next` — Arabic / English i18n

**Backend**
- Express 5, Node.js 24
- Drizzle ORM + PostgreSQL
- `@google/genai` (Gemini 2.5 Flash) via Replit AI proxy
- JWT Bearer token auth (cross-origin iframe safe)
- `multer` + Gemini Vision for bill image extraction

**Infrastructure**
- pnpm workspaces monorepo
- esbuild CJS bundle for production
- Replit managed PostgreSQL + secrets

---

## 🚀 Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database (`DATABASE_URL` env var)
- Replit AI Integrations keys (`AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`)
- `SESSION_SECRET` for JWT signing

### Install & Run

```bash
# Install all workspace dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Seed demo data (optional)
pnpm --filter @workspace/db run seed

# Start API server (dev)
pnpm --filter @workspace/api-server run dev

# Start frontend (dev, separate terminal)
pnpm --filter @workspace/rashed run dev
```

### Type-check & Build

```bash
pnpm run typecheck      # Full typecheck across all packages
pnpm run build          # Typecheck + production build

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## 🗄️ Database Schema

Core tables (Drizzle ORM, PostgreSQL):

| Table | Purpose |
|---|---|
| `users` | Auth accounts with household linkage |
| `households` | Size, city, meter count |
| `meters` | Individual water meters per household |
| `bills` | Uploaded bill images + extracted data |
| `analyses` | Gemini analysis results per bill |
| `recommendations` | AI conservation recommendations |
| `consumption_records` | Monthly m³ readings |
| `savings_estimates` | Projected savings per scenario |
| `conversations` / `messages` | AI assistant chat history |
| `user_sessions` | connect-pg-simple session store |

---

## 🌍 Localisation

All UI strings are in `artifacts/rashed/src/locales/`:
- `ar.json` — Arabic (default, RTL)
- `en.json` — English (LTR)

Language toggle is instant and persists in `localStorage`.

---

## 📱 Design

Mobile-first at 390 px viewport. Five bottom-nav pages:

1. **الرئيسية / Home** — dashboard with latest reading & cost
2. **رفع الفاتورة / Upload** — camera/file bill upload
3. **المساعد / Assistant** — AI chat
4. **التوفير / Savings** — what-if simulator & projections
5. **الخطة / Plan** — goal selector + AI-generated action plan

---

## 🏆 Competition Context

**AI Champion 2026** — Google for Developers × Tuwaiq Academy
**Track 02: Environmental Sustainability**

RASHED demonstrates how generative AI can make a measurable environmental impact at the household level by closing the feedback loop between consumption data and behaviour change — in a region where water scarcity is a national strategic priority.

---

## 📄 License

MIT © 2026 RASHED Team
