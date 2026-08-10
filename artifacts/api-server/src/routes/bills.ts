import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "@workspace/db";
import { users, bills, consumptionRecords, aiAnalyses, leakAlerts, anomalies, forecasts, recommendations, savingsEstimates, tariffConfigs, auditLogs } from "@workspace/db/schema";
import { eq, desc, avg } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { extractBillFromImage, validateBillExtraction } from "../lib/gemini";
import { householdBaselineM3, calculateSavings } from "../lib/tariff";
import { analyzeBillWithGemini } from "../lib/analysis";

const router = Router();
router.use(requireAuth);

// Multer config — store in temp, move to private uploads dir
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function getUserHouseholdId(userId: number): Promise<number | null> {
  const [user] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.householdId ?? null;
}

// GET /api/bills
router.get("/", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }
    const result = await db.select().from(bills).where(eq(bills.householdId, hhId)).orderBy(desc(bills.createdAt)).limit(50);
    res.json(result);
  } catch { res.status(500).json({ error: "Failed to fetch bills" }); }
});

// GET /api/bills/:id
router.get("/:id", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }
    const [bill] = await db.select().from(bills).where(eq(bills.id, parseInt(req.params.id))).limit(1);
    if (!bill || bill.householdId !== hhId) { res.status(404).json({ error: "Bill not found" }); return; }
    res.json(bill);
  } catch { res.status(500).json({ error: "Failed to fetch bill" }); }
});

// POST /api/bills/upload — main upload+extract+analyze pipeline
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }

    const isDemo = req.body.demo === "true";
    const language = (req.body.language as "ar" | "en") ?? "ar";

    // Save file to private storage
    const uploadsDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileName = `${Date.now()}-${req.session.userId}-${req.file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, req.file.buffer);

    let extraction;
    let rawText = "";

    if (isDemo) {
      // Demo mode — use fixed demo values (Section 14), labeled synthetic
      extraction = {
        document_type: "water_bill",
        current_consumption_m3: 31,
        previous_consumption_m3: 24,
        billing_period_days: 30,
        bill_amount_sar: null,
        meter_reading: null,
        reading_date: new Date().toISOString().split("T")[0],
        confidence: 0.95,
      };
      rawText = JSON.stringify(extraction);
    } else {
      // Real Gemini extraction
      const imageBase64 = req.file.buffer.toString("base64");
      const result = await extractBillFromImage(imageBase64, req.file.mimetype, language);
      extraction = result.extraction;
      rawText = result.rawText;
    }

    const { valid, errors } = validateBillExtraction(extraction);

    // Persist bill record
    const [bill] = await db.insert(bills).values({
      householdId: hhId,
      filePath: `/uploads/${fileName}`,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      documentType: extraction.document_type,
      currentConsumptionM3: extraction.current_consumption_m3,
      previousConsumptionM3: extraction.previous_consumption_m3,
      billingPeriodDays: extraction.billing_period_days,
      billAmountSar: extraction.bill_amount_sar,
      meterReading: extraction.meter_reading,
      readingDate: extraction.reading_date ? new Date(extraction.reading_date) : null,
      extractionConfidence: extraction.confidence,
      extractionValid: valid,
      extractionErrors: errors.length > 0 ? errors : null,
      rawExtraction: JSON.parse(rawText) as Record<string, unknown>,
      isDemoData: isDemo,
      dataClassification: isDemo ? "synthetic_demo_data" : "user_data",
    }).returning();

    if (!valid) {
      res.json({ bill, valid: false, errors, analysis: null });
      return;
    }

    // Save consumption record
    if (extraction.current_consumption_m3 !== null) {
      const periodEnd = extraction.reading_date ? new Date(extraction.reading_date) : new Date();
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - (extraction.billing_period_days ?? 30));

      await db.insert(consumptionRecords).values({
        householdId: hhId,
        billId: bill.id,
        periodStart,
        periodEnd,
        consumptionM3: extraction.current_consumption_m3,
        billingPeriodDays: extraction.billing_period_days,
        source: "bill_extraction",
        dataClassification: isDemo ? "synthetic_demo_data" : "user_data",
      });
    }

    // Run full AI analysis (async, non-blocking on response)
    const analysis = await analyzeBillWithGemini(bill, hhId, language, isDemo);

    await db.insert(auditLogs).values({
      userId: req.session.userId!,
      householdId: hhId,
      action: "bill_upload_and_analyze",
      entityType: "bill",
      entityId: bill.id,
      metadata: { isDemo, analysisId: analysis?.id, tariffConfigId: analysis?.tariffConfigId },
    });

    res.json({ bill, valid: true, errors: [], analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
