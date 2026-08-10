import { Router } from "express";
import { db } from "@workspace/db";
import { users, households, recommendations, aiAnalyses, tariffConfigs } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { gemini, GEMINI_MODEL } from "../lib/gemini";
import { calculateSavings } from "../lib/tariff";

const router = Router();
router.use(requireAuth);

async function getUserHouseholdId(userId: number): Promise<number | null> {
  const [u] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.householdId ?? null;
}

// GET /api/plan/recommendations — return AI recommendations from latest analysis
router.get("/recommendations", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.json([]); return; }

    const recs = await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.householdId, hhId))
      .orderBy(desc(recommendations.createdAt))
      .limit(10);

    res.json(recs);
  } catch {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// POST /api/plan/generate — generate a new AI conservation plan for a given goal
router.post("/generate", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household found" }); return; }

    const goalPercent: number = Number(req.body.goalPercent) || 15;
    const language: "ar" | "en" = req.body.language ?? "ar";

    // Load household + latest analysis
    const [hh] = await db.select().from(households).where(eq(households.id, hhId)).limit(1);
    const [analysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, hhId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
    const [tariff] = await db.select().from(tariffConfigs).where(eq(tariffConfigs.isActive, true)).limit(1);

    const current = analysis?.currentConsumptionM3 ?? null;
    const targetM3 = current ? Math.round(current * (1 - goalPercent / 100) * 10) / 10 : null;
    const tiers = tariff?.tiers as { min_m3: number; max_m3: number | null; rate_sar_per_m3: number }[] | null;
    const savings = current && targetM3 && tiers ? calculateSavings(current, targetM3, tiers) : null;

    const langInstr = language === "ar" ? "Respond in Arabic. Use natural, conversational Arabic." : "Respond in English.";

    const prompt = `You are RASHED, a water conservation AI assistant for Saudi households. ${langInstr}

Household profile:
- Property type: ${hh?.propertyType ?? "unknown"}
- Members: ${hh?.memberCount ?? "unknown"}
- Has garden: ${hh?.hasGarden ?? false}
- Has pool: ${hh?.hasPool ?? false}
- Current monthly consumption: ${current ?? "unknown"} m³
- Conservation goal: reduce by ${goalPercent}% (target: ${targetM3 ?? "unknown"} m³)

Generate a personalized conservation plan with exactly 5 practical actions to achieve a ${goalPercent}% water reduction goal.
Each action must be specific, actionable, and relevant to this household's profile.

Return ONLY valid JSON (no markdown):
{
  "actions": [
    {
      "id": 1,
      "icon": "🔧",
      "title_ar": "...",
      "title_en": "...",
      "description_ar": "...",
      "description_en": "...",
      "saving_m3": 2.5,
      "category": "leak|irrigation|appliance|behavior|general",
      "priority": 1
    }
  ],
  "summary_ar": "brief summary of the plan in Arabic",
  "summary_en": "brief summary of the plan in English"
}`;

    const resp = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(resp.text ?? "{}");
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];

    res.json({
      goalPercent,
      targetM3,
      savings,
      actions,
      summaryAr: parsed.summary_ar ?? "",
      summaryEn: parsed.summary_en ?? "",
      tariffVersion: tariff?.version ?? null,
      verificationStatus: tariff?.verificationStatus ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Plan generation failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
