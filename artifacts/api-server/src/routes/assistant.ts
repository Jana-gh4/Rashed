import { Router } from "express";
import { db } from "@workspace/db";
import {
  users, households, consumptionRecords, aiAnalyses, leakAlerts,
  forecasts, recommendations, tariffConfigs, dataSources,
  conversations, messages,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { gemini, GEMINI_MODEL } from "../lib/gemini";
import { calculateSavings, gastatBaselineM3 } from "../lib/tariff";

const router = Router();
router.use(requireAuth);

async function getUserHouseholdId(userId: number) {
  const [u] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.householdId ?? null;
}

// ── Function-calling tool implementations ────────────────────────────────────
// All read-only; each enforces household ownership server-side.

async function getHouseholdProfile(householdId: number) {
  const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
  return hh ?? null;
}

async function getRecentConsumption(householdId: number) {
  return db.select().from(consumptionRecords).where(eq(consumptionRecords.householdId, householdId)).orderBy(desc(consumptionRecords.createdAt)).limit(6);
}

async function getConsumptionHistory(householdId: number) {
  return db.select().from(consumptionRecords).where(eq(consumptionRecords.householdId, householdId)).orderBy(desc(consumptionRecords.createdAt)).limit(24);
}

async function getLatestBill(householdId: number) {
  const [a] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, householdId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
  return a ?? null;
}

async function getLatestAnalysis(householdId: number) {
  const [a] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, householdId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
  return a ?? null;
}

async function getActiveAlerts(householdId: number) {
  return db.select().from(leakAlerts).where(and(eq(leakAlerts.householdId, householdId), eq(leakAlerts.isResolved, false))).orderBy(desc(leakAlerts.createdAt));
}

async function getForecast(householdId: number) {
  const [f] = await db.select().from(forecasts).where(eq(forecasts.householdId, householdId)).orderBy(desc(forecasts.createdAt)).limit(1);
  return f ?? null;
}

async function getRecommendations(householdId: number) {
  return db.select().from(recommendations).where(and(eq(recommendations.householdId, householdId), eq(recommendations.isCompleted, false))).orderBy(recommendations.priority).limit(10);
}

async function calculateSavingsTool(householdId: number, reductionPercent: number) {
  const [a] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, householdId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
  const [tariff] = await db.select().from(tariffConfigs).where(eq(tariffConfigs.isActive, true)).limit(1);
  if (!a?.currentConsumptionM3 || !tariff) return null;
  const tiers = tariff.tiers as { min_m3: number; max_m3: number | null; rate_sar_per_m3: number }[];
  const targetM3 = a.currentConsumptionM3 * (1 - reductionPercent / 100);
  return { ...calculateSavings(a.currentConsumptionM3, targetM3, tiers), tariffVersion: tariff.version, verificationStatus: tariff.verificationStatus };
}

async function runWhatIfSimulation(householdId: number, targetM3: number) {
  const [a] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, householdId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
  const [tariff] = await db.select().from(tariffConfigs).where(eq(tariffConfigs.isActive, true)).limit(1);
  if (!a?.currentConsumptionM3 || !tariff) return null;
  const tiers = tariff.tiers as { min_m3: number; max_m3: number | null; rate_sar_per_m3: number }[];
  return { ...calculateSavings(a.currentConsumptionM3, targetM3, tiers), tariffVersion: tariff.version, verificationStatus: tariff.verificationStatus };
}

async function getVerifiedWaterReference() {
  return [
    { source: "GASTAT Water Accounts 2023", fact: "Household water consumption per capita was 102.1 L/day in 2023", use: "Statistical reference only — never a household limit", url: "https://www.stats.gov.sa/documents/20117/2067030/Water%2BAccounts%2BPublication%2B2023%2BEN.pdf" },
    { source: "NWC Rasshid Initiative", fact: "93% of high-consumption cases examined through the Rasshid initiative were attributed to leaks inside houses", use: "Evidence for household leak detection importance", url: "https://www.nwc.com.sa/EN/HousingSector/Pages/RashedInitiative.aspx" },
  ];
}

// Tool declarations for Gemini function calling
const TOOLS = [
  { name: "get_household_profile", description: "Get the user's household profile (size, type, features)" },
  { name: "get_recent_consumption", description: "Get the last 6 consumption records" },
  { name: "get_consumption_history", description: "Get up to 24 months of consumption history" },
  { name: "get_latest_bill", description: "Get the latest analyzed bill" },
  { name: "get_latest_analysis", description: "Get the latest AI analysis" },
  { name: "get_active_alerts", description: "Get active leak/anomaly alerts" },
  { name: "get_forecast", description: "Get the current consumption forecast" },
  { name: "get_recommendations", description: "Get active conservation recommendations" },
  { name: "get_verified_water_reference", description: "Get verified Saudi water statistics (GASTAT, NWC Rasshid). Use this for any official statistics." },
  {
    name: "calculate_savings",
    description: "Calculate estimated savings for a target reduction percentage. Returns SAR amounts — tariff is unverified.",
    parameters: {
      type: "object",
      properties: { reduction_percent: { type: "number", description: "Target reduction percentage (0-100)" } },
      required: ["reduction_percent"],
    },
  },
  {
    name: "run_what_if_simulation",
    description: "Simulate what would happen if consumption reaches a target m³ value.",
    parameters: {
      type: "object",
      properties: { target_m3: { type: "number", description: "Target monthly consumption in m³" } },
      required: ["target_m3"],
    },
  },
];

async function dispatchTool(name: string, args: Record<string, unknown>, householdId: number): Promise<unknown> {
  switch (name) {
    case "get_household_profile": return getHouseholdProfile(householdId);
    case "get_recent_consumption": return getRecentConsumption(householdId);
    case "get_consumption_history": return getConsumptionHistory(householdId);
    case "get_latest_bill": return getLatestBill(householdId);
    case "get_latest_analysis": return getLatestAnalysis(householdId);
    case "get_active_alerts": return getActiveAlerts(householdId);
    case "get_forecast": return getForecast(householdId);
    case "get_recommendations": return getRecommendations(householdId);
    case "get_verified_water_reference": return getVerifiedWaterReference();
    case "calculate_savings": return calculateSavingsTool(householdId, (args.reduction_percent as number) ?? 15);
    case "run_what_if_simulation": return runWhatIfSimulation(householdId, args.target_m3 as number);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// POST /api/assistant/conversations
router.post("/conversations", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    const [conv] = await db.insert(conversations).values({
      userId: req.session.userId!,
      title: req.body.title ?? null,
    }).returning();
    res.status(201).json(conv);
  } catch { res.status(500).json({ error: "Failed to create conversation" }); }
});

// GET /api/assistant/conversations
router.get("/conversations", async (req, res) => {
  try {
    const convs = await db.select().from(conversations).where(eq(conversations.userId, req.session.userId!)).orderBy(desc(conversations.createdAt)).limit(20);
    res.json(convs);
  } catch { res.status(500).json({ error: "Failed to fetch conversations" }); }
});

// POST /api/assistant/conversations/:id/messages — main chat endpoint
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }

    const convId = parseInt(req.params.id);
    const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, convId), eq(conversations.userId, req.session.userId!))).limit(1);
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

    const userText: string = req.body.content;
    const language: "ar" | "en" = req.body.language ?? "ar";

    // Save user message
    const [userMsg] = await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content: userText,
    }).returning();

    // Load recent messages for context
    const history = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(messages.createdAt).limit(20);

    const langInstr = language === "ar"
      ? "Always respond in Arabic (Modern Standard Arabic, conversational). Use the user's own data only — never invent values."
      : "Always respond in English. Use the user's own data only — never invent values.";

    const systemPrompt = `You are RASHED (رَشَد), an AI water intelligence assistant for Saudi households. ${langInstr}

Rules:
- Always distinguish: observed facts vs backend-calculated values vs AI inferences vs official references vs synthetic demo data
- Never state an inference as a confirmed fact
- When quoting leak statistics, always say "NWC's Rasshid initiative found 93% of examined high-consumption cases were due to leaks" — never "93% of Saudi homes have leaks"
- The tariff used for cost estimates is unverified_estimate — always say so
- If you don't have enough data, say so plainly (e.g. "لا توجد بيانات كافية")
- Never hallucinate user data — only use what the tools return
- Call tools before answering questions about the user's data`;

    // Build conversation history for Gemini
    const geminiContents = [
      ...history.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: userText }] },
    ];

    // Agentic loop with function calling
    let finalText = "";
    let loopContents = [...geminiContents];
    const toolCallsLog: { tool: string; args: unknown; result: unknown }[] = [];

    for (let i = 0; i < 5; i++) { // max 5 tool call rounds
      const resp = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents: loopContents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: (t as any).parameters })) }],
        },
      });

      const candidate = resp.candidates?.[0];
      if (!candidate) break;

      const functionCalls = candidate.content?.parts?.filter((p: any) => p.functionCall) ?? [];
      if (functionCalls.length === 0) {
        finalText = candidate.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") ?? "";
        break;
      }

      // Execute tool calls
      const toolResults = await Promise.all(
        functionCalls.map(async (part: any) => {
          const { name, args } = part.functionCall;
          const result = await dispatchTool(name, args ?? {}, hhId);
          toolCallsLog.push({ tool: name, args, result });
          return { functionResponse: { name, response: { result } } };
        })
      );

      loopContents = [
        ...loopContents,
        { role: "model", parts: functionCalls.map((p: any) => ({ functionCall: p.functionCall })) },
        { role: "user", parts: toolResults.map((r) => ({ functionResponse: r.functionResponse })) },
      ];
    }

    // Save assistant message
    const [assistantMsg] = await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: finalText,
      metadata: toolCallsLog.length > 0 ? { toolCalls: toolCallsLog } : null,
    }).returning();

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Assistant error";
    res.status(500).json({ error: msg });
  }
});

// GET /api/assistant/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, convId), eq(conversations.userId, req.session.userId!))).limit(1);
    if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(messages.createdAt);
    res.json(msgs);
  } catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

export default router;
