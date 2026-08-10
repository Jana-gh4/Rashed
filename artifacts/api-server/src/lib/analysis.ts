/**
 * Post-extraction analysis pipeline.
 * Deterministic calculations happen here; Gemini only adds interpretation.
 */
import { db } from "@workspace/db";
import {
  users,
  households,
  bills,
  consumptionRecords,
  aiAnalyses,
  leakAlerts,
  anomalies,
  forecasts,
  recommendations,
  savingsEstimates,
  tariffConfigs,
} from "@workspace/db/schema";
import { eq, desc, avg, and } from "drizzle-orm";
import { householdBaselineM3, calculateSavings, calculateCost } from "./tariff";
import { gemini, GEMINI_MODEL, UNTRUSTED_CONTENT_INSTRUCTION } from "./gemini";

export async function analyzeBillWithGemini(
  bill: typeof bills.$inferSelect,
  householdId: number,
  language: "ar" | "en" = "ar",
  isDemo = false
) {
  // ── 1. Load household profile ─────────────────────────────────────────────
  const [hh] = await db.select().from(households).where(eq(households.id, householdId)).limit(1);
  if (!hh) return null;

  // ── 2. Historical average (deterministic) ─────────────────────────────────
  const history = await db.select().from(consumptionRecords)
    .where(eq(consumptionRecords.householdId, householdId))
    .orderBy(desc(consumptionRecords.createdAt))
    .limit(12);

  const historicalAvg = history.length > 0
    ? history.reduce((s, r) => s + r.consumptionM3, 0) / history.length
    : null;

  // ── 3. Household baseline (deterministic) ─────────────────────────────────
  const baseline = householdBaselineM3(
    hh.memberCount,
    hh.propertyType,
    hh.hasGarden,
    hh.hasPool,
    historicalAvg
  );

  const current = bill.currentConsumptionM3;
  const previous = bill.previousConsumptionM3;
  const changePercent = current && previous && previous > 0
    ? ((current - previous) / previous) * 100
    : null;

  const statusVsBaseline = current
    ? current > baseline.max ? "above_expected"
      : current < baseline.min ? "below_expected"
        : "within_expected"
    : null;

  const anomalyDetected = statusVsBaseline === "above_expected" || (changePercent !== null && changePercent > 20);

  // ── 4. Load active tariff config ──────────────────────────────────────────
  const [tariff] = await db.select().from(tariffConfigs).where(eq(tariffConfigs.isActive, true)).limit(1);

  // ── 5. Gemini interpretation (non-arithmetic) ─────────────────────────────
  let smartSummary = "";
  let whySummary = "";
  let possibleCauses: { reason: string; confidence: number }[] = [];
  let geminiRecs: { titleAr: string; titleEn: string; descAr: string; descEn: string; category: string; priority: number }[] = [];

  try {
    const langInstr = language === "ar"
      ? "Respond in Arabic. Use natural, conversational Arabic."
      : "Respond in English.";

    const contextData = {
      current_m3: current,
      previous_m3: previous,
      change_percent: changePercent ? Math.round(changePercent * 10) / 10 : null,
      baseline_min_m3: baseline.min,
      baseline_max_m3: baseline.max,
      baseline_basis: baseline.basis,
      status_vs_baseline: statusVsBaseline,
      household_size: hh.memberCount,
      property_type: hh.propertyType,
      has_garden: hh.hasGarden,
      has_pool: hh.hasPool,
      is_demo_data: isDemo,
      gastat_reference: "102.1 L/person/day (GASTAT Water Accounts 2023 — statistical reference only)",
    };

    const prompt = `You are RASHED, an AI water intelligence assistant for Saudi households. ${langInstr}

Context (do not invent values — use only what is provided below):
${JSON.stringify(contextData, null, 2)}

${isDemo ? "NOTE: This is demo/synthetic data. Make that clear in your responses." : ""}

Important rules:
- Never state an inference as confirmed fact
- Never calculate money — cost calculations are done by the backend
- Never quote "93% of Saudi homes have leaks" — the correct phrasing is "NWC's Rasshid initiative found 93% of examined high-consumption cases were due to leaks"
- Label all AI inferences as possibilities, not certainties
- The tariff used for cost estimates is unverified — always say "estimated cost based on an unverified tariff"

Return ONLY valid JSON with this shape:
{
  "smart_analysis_summary": "2-3 sentence bilingual-ready analysis summary",
  "why_increased_summary": "explanation of possible reasons for change (if change_percent > 10)",
  "possible_causes": [{"reason": "...", "confidence": 0.0-1.0}],
  "recommendations": [
    {
      "title_ar": "...", "title_en": "...",
      "description_ar": "...", "description_en": "...",
      "category": "leak|irrigation|appliance|behavior|general",
      "priority": 1
    }
  ]
}`;

    const resp = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(resp.text ?? "{}");
    smartSummary = parsed.smart_analysis_summary ?? "";
    whySummary = parsed.why_increased_summary ?? "";
    possibleCauses = Array.isArray(parsed.possible_causes) ? parsed.possible_causes : [];
    geminiRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  } catch (_err) {
    // Non-fatal — analysis proceeds without AI text
    smartSummary = isDemo
      ? "Demo analysis: consumption is above the expected range."
      : "Analysis unavailable — please try again.";
  }

  // ── 6. Persist analysis ───────────────────────────────────────────────────
  const [analysis] = await db.insert(aiAnalyses).values({
    householdId,
    billId: bill.id,
    currentConsumptionM3: current,
    previousConsumptionM3: previous,
    changePercentage: changePercent,
    baselineMinM3: baseline.min,
    baselineMaxM3: baseline.max,
    baselineBasis: baseline.basis,
    statusVsBaseline,
    anomalyDetected,
    smartAnalysisSummary: smartSummary,
    whyIncreasedSummary: whySummary,
    possibleCauses,
    geminiModel: GEMINI_MODEL,
    geminiPromptVersion: "v1",
    tariffConfigId: tariff?.id ?? null,
    dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
  }).returning();

  // ── 7. Leak alert (if anomaly) ────────────────────────────────────────────
  if (anomalyDetected && current !== null) {
    const leakProbability = isDemo ? 0.72 : Math.min(0.9, (changePercent ?? 0) / 100);
    await db.insert(anomalies).values({
      householdId,
      analysisId: analysis.id,
      reason: possibleCauses[0]?.reason ?? "Abnormal consumption pattern detected",
      confidence: possibleCauses[0]?.confidence ?? 0.6,
      dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
    });
    await db.insert(leakAlerts).values({
      householdId,
      analysisId: analysis.id,
      riskLevel: leakProbability > 0.7 ? "high" : leakProbability > 0.4 ? "medium" : "low",
      probability: leakProbability,
      reason: "Potential leak — consumption above expected household baseline",
      isDemo,
      dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
    });
  }

  // ── 8. Forecast (simple linear trend, deterministic) ─────────────────────
  if (history.length >= 2 && current !== null) {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = 30;
    const projectedMonthEnd = Math.round((current / dayOfMonth) * daysInMonth * 10) / 10;
    const confidence = history.length < 3 ? "Limited history — forecast confidence is low" : null;

    const periodStart = new Date();
    periodStart.setDate(1);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    await db.insert(forecasts).values({
      householdId,
      analysisId: analysis.id,
      periodStart,
      periodEnd,
      projectedM3: projectedMonthEnd,
      projectedMinM3: projectedMonthEnd * 0.85,
      projectedMaxM3: projectedMonthEnd * 1.15,
      confidenceNote: confidence,
      method: "linear_daily_rate",
      dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
    });
  }

  // ── 9. Persist recommendations ────────────────────────────────────────────
  for (const r of geminiRecs.slice(0, 5)) {
    await db.insert(recommendations).values({
      householdId,
      analysisId: analysis.id,
      titleAr: r.titleAr,
      titleEn: r.titleEn,
      descriptionAr: r.descAr,
      descriptionEn: r.descEn,
      priority: r.priority ?? 1,
      category: r.category ?? "general",
      dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
    });
  }

  // ── 10. Savings estimate (if tariff available) ────────────────────────────
  if (tariff && current !== null) {
    const tiers = tariff.tiers as { min_m3: number; max_m3: number | null; rate_sar_per_m3: number }[];
    const targetM3 = Math.round(current * 0.85 * 10) / 10; // 15% reduction target
    const savings = calculateSavings(current, targetM3, tiers);

    await db.insert(savingsEstimates).values({
      householdId,
      tariffConfigId: tariff.id,
      tariffVersion: tariff.version,
      periodLabel: "monthly",
      currentCostSar: savings.currentCostSar,
      projectedCostSar: savings.targetCostSar,
      savingSar: savings.savingSar,
      savingM3: savings.savingM3,
      reductionPercent: savings.reductionPercent,
      dataClassification: isDemo ? "synthetic_demo_data" : "ai_inferred_data",
    });
  }

  return analysis;
}
