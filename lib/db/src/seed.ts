/**
 * RASHED seed script — run from lib/db: pnpm --filter @workspace/db run seed
 * Seeds verified data sources, tariff config, and demo household data.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🌱 Seeding RASHED database...");

  // ── 1. Verified data sources (Section 3.1) ────────────────────────────────
  console.log("  → Data sources");
  await db.insert(schema.dataSources).values([
    {
      name: "GASTAT Water Accounts Publication 2023",
      organization: "General Authority for Statistics (GASTAT)",
      description: "Household water consumption per capita was 102.1 L/day in 2023. Statistical reference only — never a household limit.",
      url: "https://www.stats.gov.sa/documents/20117/2067030/Water%2BAccounts%2BPublication%2B2023%2BEN.pdf",
      accessDate: null,
      dataClassification: "official_data",
    },
    {
      name: "NWC Rasshid Initiative",
      organization: "National Water Company (NWC)",
      description: "93% of high-consumption cases examined through the Rasshid initiative were attributed to leaks inside houses.",
      url: "https://www.nwc.com.sa/EN/HousingSector/Pages/RashedInitiative.aspx",
      accessDate: null,
      dataClassification: "official_data",
    },
    {
      name: "MEWA National Water Strategy",
      organization: "Ministry of Environment, Water and Agriculture (MEWA)",
      description: "Objectives include improving water-demand management and cost-effective water/wastewater delivery.",
      url: "https://www.mewa.gov.sa/en/Ministry/Agencies/TheWaterAgency/Topics/Pages/Strategy.aspx",
      accessDate: null,
      dataClassification: "official_data",
    },
    {
      name: "MEWA Water Innovation Trends Report",
      organization: "Ministry of Environment, Water and Agriculture (MEWA)",
      description: "Identifies smart leakage management as a key pillar; early leak detection and monitoring are highlighted.",
      url: "https://www.mewa.gov.sa/en/Ministry/Agencies/AgencyForInnovation/Topics/Pages/slmReportIII.aspx",
      accessDate: null,
      dataClassification: "official_data",
    },
    {
      name: "NWC Mobile Application",
      organization: "National Water Company (NWC)",
      description: "NWC provides a mobile application with 35+ water and sanitation services. RASHED does not replace NWC.",
      url: "https://www.nwc.com.sa/EN/HowWeCanHelp/Pages/application.aspx",
      accessDate: null,
      dataClassification: "official_data",
    },
  ]).onConflictDoNothing();

  // ── 2. Tariff config (unverified_estimate) ────────────────────────────────
  console.log("  → Tariff config");
  let tariff: typeof schema.tariffConfigs.$inferSelect | undefined;
  const existing = await db.select().from(schema.tariffConfigs).where(eq(schema.tariffConfigs.version, "v1.0-unverified")).limit(1);
  if (existing.length === 0) {
    const [inserted] = await db.insert(schema.tariffConfigs).values({
      version: "v1.0-unverified",
      source: "Secondary sources — not confirmed as current official policy. Update once the team verifies with NWC.",
      tiers: [
        { min_m3: 0, max_m3: 10, rate_sar_per_m3: 0.15 },
        { min_m3: 10, max_m3: 20, rate_sar_per_m3: 0.45 },
        { min_m3: 20, max_m3: 30, rate_sar_per_m3: 1.05 },
        { min_m3: 30, max_m3: null, rate_sar_per_m3: 2.55 },
      ],
      includedCharges: "Water consumption only — excludes fixed service charges. Update once confirmed.",
      calculationMethod: "tiered",
      verificationStatus: "unverified_estimate",
      isActive: true,
    }).returning();
    tariff = inserted;
  } else {
    tariff = existing[0];
  }

  // ── 3. Demo user + household ──────────────────────────────────────────────
  console.log("  → Demo user and household");
  const passwordHash = await bcrypt.hash("demo1234", 12);

  let demoUser: typeof schema.users.$inferSelect | undefined;
  const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, "demo@rashed.app")).limit(1);
  if (existingUser.length === 0) {
    const [inserted] = await db.insert(schema.users).values({
      name: "أحمد المطيري",
      email: "demo@rashed.app",
      passwordHash,
      preferredLanguage: "ar",
      isDemoMode: true,
    }).returning();
    demoUser = inserted;
  } else {
    demoUser = existingUser[0];
  }

  let demoHousehold: typeof schema.households.$inferSelect | undefined;
  if (demoUser.householdId) {
    const existing = await db.select().from(schema.households).where(eq(schema.households.id, demoUser.householdId)).limit(1);
    demoHousehold = existing[0];
  }

  if (!demoHousehold) {
    const [hh] = await db.insert(schema.households).values({
      name: "فيلا الأسرة",
      memberCount: 5,
      propertyType: "villa",
      bathroomCount: 3,
      hasGarden: true,
      hasPool: false,
      propertySizeM2: 350,
    }).returning();
    demoHousehold = hh;
    await db.update(schema.users).set({ householdId: demoHousehold.id, updatedAt: new Date() }).where(eq(schema.users.id, demoUser.id));
  }

  // ── 4. Demo meter + synthetic readings ────────────────────────────────────
  console.log("  → Demo meters and synthetic readings");
  const existingMeter = await db.select().from(schema.meters).where(eq(schema.meters.meterId, "DEMO-NWC-001")).limit(1);
  let mainMeter = existingMeter[0];

  if (!mainMeter) {
    const [inserted] = await db.insert(schema.meters).values({
      householdId: demoHousehold.id,
      meterId: "DEMO-NWC-001",
      meterType: "main",
      label: "العداد الرئيسي",
      isActive: true,
      dataClassification: "synthetic_demo_data",
    }).returning();
    mainMeter = inserted;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readings = [
      { hour: 7, minute: 0, flowLpm: 0, note: "Normal — no flow" },
      { hour: 7, minute: 10, flowLpm: 10, note: "Normal active use" },
      { hour: 7, minute: 20, flowLpm: 8, note: "Normal active use" },
      { hour: 7, minute: 30, flowLpm: 0, note: "Normal — no flow" },
      { hour: 2, minute: 0, flowLpm: 0.3, note: "Potential slow leak detected during night hours" },
      { hour: 2, minute: 10, flowLpm: 0.3, note: "Potential slow leak detected during night hours" },
      { hour: 2, minute: 20, flowLpm: 0.3, note: "Potential slow leak detected during night hours" },
    ];

    for (const r of readings) {
      const dt = new Date(today);
      dt.setHours(r.hour, r.minute, 0, 0);
      await db.insert(schema.meterReadings).values({
        meterId: mainMeter.id,
        householdId: demoHousehold.id,
        readingValue: 0,
        readingUnit: "m3",
        readingDate: dt,
        flowLpm: r.flowLpm,
        notes: r.note,
        dataClassification: "synthetic_demo_data",
      });
    }
  }

  // ── 5. Demo consumption history ───────────────────────────────────────────
  console.log("  → Demo consumption history");
  const now = new Date();
  const demoData = [
    { monthsAgo: 5, m3: 22 },
    { monthsAgo: 4, m3: 25 },
    { monthsAgo: 3, m3: 23 },
    { monthsAgo: 2, m3: 24 },
    { monthsAgo: 1, m3: 24 },
    { monthsAgo: 0, m3: 31 },
  ];

  // Check if already seeded
  const existingRecords = await db.select().from(schema.consumptionRecords).where(eq(schema.consumptionRecords.householdId, demoHousehold.id)).limit(1);
  if (existingRecords.length === 0) {
    for (const d of demoData) {
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() - d.monthsAgo);
      periodEnd.setDate(1);
      const periodStart = new Date(periodEnd);
      periodStart.setMonth(periodStart.getMonth() - 1);

      await db.insert(schema.consumptionRecords).values({
        householdId: demoHousehold.id,
        periodStart,
        periodEnd,
        consumptionM3: d.m3,
        billingPeriodDays: 30,
        source: "demo_seed",
        dataClassification: "synthetic_demo_data",
      });
    }
  }

  // ── 6. Demo AI analysis ───────────────────────────────────────────────────
  console.log("  → Demo analysis, alerts, forecast, recommendations, savings");
  const existingAnalysis = await db.select().from(schema.aiAnalyses).where(eq(schema.aiAnalyses.householdId, demoHousehold.id)).limit(1);

  if (existingAnalysis.length === 0) {
    const [analysis] = await db.insert(schema.aiAnalyses).values({
      householdId: demoHousehold.id,
      currentConsumptionM3: 31,
      previousConsumptionM3: 24,
      changePercentage: 29.2,
      baselineMinM3: 14.5,
      baselineMaxM3: 21.5,
      baselineBasis: "household_profile_gastat_reference",
      statusVsBaseline: "above_expected",
      anomalyDetected: true,
      smartAnalysisSummary: "استهلاكك الحالي (31 م³) أعلى بنسبة 29% من الشهر الماضي وأعلى من النطاق المتوقع لأسرتك. هذا النمط يستحق المراجعة.",
      whyIncreasedSummary: "الزيادة يمكن أن تكون ناتجة عن تسرب خفي في الأنابيب أو زيادة في استخدام الحديقة أو ارتفاع في درجات الحرارة.",
      possibleCauses: [
        { reason: "احتمال وجود تسرب في الأنابيب الداخلية", confidence: 0.72 },
        { reason: "ارتفاع استهلاك الحديقة في الصيف", confidence: 0.55 },
        { reason: "زيادة في استخدام الغسالة أو الطهي", confidence: 0.30 },
      ],
      geminiModel: "seed",
      geminiPromptVersion: "demo-seed-v1",
      tariffConfigId: tariff?.id ?? null,
      dataClassification: "synthetic_demo_data",
    }).returning();

    await db.insert(schema.leakAlerts).values({
      householdId: demoHousehold.id,
      analysisId: analysis.id,
      riskLevel: "high",
      probability: 0.72,
      reason: "تسرب محتمل — استهلاك الليل لا يرجع إلى الصفر (بيانات توضيحية، ليست دقة نموذج موثقة)",
      isDemo: true,
      dataClassification: "synthetic_demo_data",
    });

    await db.insert(schema.anomalies).values({
      householdId: demoHousehold.id,
      analysisId: analysis.id,
      reason: "نمط استهلاك غير طبيعي: ارتفاع بنسبة 29% مع تدفق ليلي مستمر",
      confidence: 0.72,
      dataClassification: "synthetic_demo_data",
    });

    const forecastPeriodStart = new Date();
    forecastPeriodStart.setDate(1);
    const forecastPeriodEnd = new Date(forecastPeriodStart);
    forecastPeriodEnd.setMonth(forecastPeriodEnd.getMonth() + 1);
    forecastPeriodEnd.setDate(0);

    await db.insert(schema.forecasts).values({
      householdId: demoHousehold.id,
      analysisId: analysis.id,
      periodStart: forecastPeriodStart,
      periodEnd: forecastPeriodEnd,
      projectedM3: 31.7,
      projectedMinM3: 26.9,
      projectedMaxM3: 36.5,
      confidenceNote: "تقدير بناءً على معدل الاستهلاك اليومي الحالي",
      method: "linear_daily_rate",
      dataClassification: "synthetic_demo_data",
    });

    await db.insert(schema.recommendations).values([
      {
        householdId: demoHousehold.id,
        analysisId: analysis.id,
        titleAr: "تحقق من التسربات الداخلية",
        titleEn: "Check for internal leaks",
        descriptionAr: "افحص الأنابيب تحت المغاسل وصمامات المراحيض.",
        descriptionEn: "Inspect pipes under sinks and toilet valves.",
        estimatedWaterSavingM3: 3.5,
        priority: 1,
        category: "leak",
        dataClassification: "synthetic_demo_data",
      },
      {
        householdId: demoHousehold.id,
        analysisId: analysis.id,
        titleAr: "قلل ري الحديقة",
        titleEn: "Reduce garden irrigation",
        descriptionAr: "حاول تقليل مدة الري بنسبة 20%.",
        descriptionEn: "Try reducing irrigation duration by 20%.",
        estimatedWaterSavingM3: 2.0,
        priority: 2,
        category: "irrigation",
        dataClassification: "synthetic_demo_data",
      },
    ]);

    if (tariff) {
      await db.insert(schema.savingsEstimates).values({
        householdId: demoHousehold.id,
        tariffConfigId: tariff.id,
        tariffVersion: tariff.version,
        periodLabel: "monthly",
        currentCostSar: 18.0,
        projectedCostSar: 9.5,
        savingSar: 8.5,
        savingM3: 4.65,
        reductionPercent: 15,
        dataClassification: "synthetic_demo_data",
      });
    }

    await db.insert(schema.conservationPlans).values({
      householdId: demoHousehold.id,
      goalDescriptionAr: "خفض الاستهلاك الشهري بنسبة 15% خلال 3 أشهر",
      goalDescriptionEn: "Reduce monthly consumption by 15% within 3 months",
      targetReductionPercent: 15,
      targetM3: 26.4,
      isActive: true,
      dataClassification: "synthetic_demo_data",
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Demo account: demo@rashed.app / demo1234");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
