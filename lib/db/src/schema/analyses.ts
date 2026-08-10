import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { households } from "./households";
import { bills } from "./bills";
import { dataClassificationEnum } from "./meters";

export const leakRiskLevelEnum = pgEnum("leak_risk_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

// ─── ai_analyses ──────────────────────────────────────────────────────────────

export const aiAnalyses = pgTable("ai_analyses", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  billId: integer("bill_id").references(() => bills.id),
  // computed (deterministic backend)
  currentConsumptionM3: real("current_consumption_m3"),
  previousConsumptionM3: real("previous_consumption_m3"),
  changePercentage: real("change_percentage"),
  baselineMinM3: real("baseline_min_m3"),
  baselineMaxM3: real("baseline_max_m3"),
  baselineBasis: text("baseline_basis"),
  statusVsBaseline: text("status_vs_baseline"),
  // AI interpretation (Gemini)
  anomalyDetected: boolean("anomaly_detected"),
  smartAnalysisSummary: text("smart_analysis_summary"),
  whyIncreasedSummary: text("why_increased_summary"),
  possibleCauses: jsonb("possible_causes"),
  geminiModel: text("gemini_model"),
  geminiPromptVersion: text("gemini_prompt_version"),
  // tariff linkage
  tariffConfigId: integer("tariff_config_id"),
  // metadata
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({
  id: true,
  createdAt: true,
});
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;

// ─── anomalies ────────────────────────────────────────────────────────────────

export const anomalies = pgTable("anomalies", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => aiAnalyses.id),
  reason: text("reason").notNull(),
  confidence: real("confidence"),
  isResolved: boolean("is_resolved").notNull().default(false),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  createdAt: true,
});
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type Anomaly = typeof anomalies.$inferSelect;

// ─── leak_alerts ──────────────────────────────────────────────────────────────

export const leakAlerts = pgTable("leak_alerts", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => aiAnalyses.id),
  riskLevel: leakRiskLevelEnum("risk_level").notNull(),
  probability: real("probability"),
  reason: text("reason").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  isResolved: boolean("is_resolved").notNull().default(false),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertLeakAlertSchema = createInsertSchema(leakAlerts).omit({
  id: true,
  createdAt: true,
});
export type InsertLeakAlert = z.infer<typeof insertLeakAlertSchema>;
export type LeakAlert = typeof leakAlerts.$inferSelect;
