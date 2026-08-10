import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { households } from "./households";
import { dataClassificationEnum } from "./meters";

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  // file storage
  filePath: text("file_path"),
  fileType: text("file_type"),
  fileName: text("file_name"),
  // extracted fields from Gemini
  documentType: text("document_type"),
  currentConsumptionM3: real("current_consumption_m3"),
  previousConsumptionM3: real("previous_consumption_m3"),
  billingPeriodDays: integer("billing_period_days"),
  billAmountSar: real("bill_amount_sar"),
  meterReading: real("meter_reading"),
  readingDate: timestamp("reading_date", { withTimezone: true }),
  extractionConfidence: real("extraction_confidence"),
  // validation
  extractionValid: boolean("extraction_valid"),
  extractionErrors: jsonb("extraction_errors").$type<string[]>(),
  // raw extraction from Gemini (for audit)
  rawExtraction: jsonb("raw_extraction"),
  // demo mode
  isDemoData: boolean("is_demo_data").notNull().default(false),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("user_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// ─── consumption_records ──────────────────────────────────────────────────────

export const consumptionRecords = pgTable("consumption_records", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  billId: integer("bill_id").references(() => bills.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  consumptionM3: real("consumption_m3").notNull(),
  billingPeriodDays: integer("billing_period_days"),
  source: text("source").notNull().default("bill_extraction"),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("user_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertConsumptionRecordSchema = createInsertSchema(
  consumptionRecords
).omit({ id: true, createdAt: true });
export type InsertConsumptionRecord = z.infer<
  typeof insertConsumptionRecordSchema
>;
export type ConsumptionRecord = typeof consumptionRecords.$inferSelect;
