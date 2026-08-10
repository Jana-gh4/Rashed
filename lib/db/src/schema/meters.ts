import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { households } from "./households";

export const meterTypeEnum = pgEnum("meter_type", [
  "main",
  "garden",
  "pool",
  "other",
]);
export const dataClassificationEnum = pgEnum("data_classification", [
  "official_data",
  "user_data",
  "synthetic_demo_data",
  "ai_inferred_data",
]);

export const meters = pgTable("meters", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  meterId: text("meter_id").notNull(),
  meterType: meterTypeEnum("meter_type").notNull().default("main"),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
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

export const insertMeterSchema = createInsertSchema(meters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMeter = z.infer<typeof insertMeterSchema>;
export type Meter = typeof meters.$inferSelect;

// ─── meter_readings ───────────────────────────────────────────────────────────

export const meterReadings = pgTable("meter_readings", {
  id: serial("id").primaryKey(),
  meterId: integer("meter_id")
    .notNull()
    .references(() => meters.id, { onDelete: "cascade" }),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  readingValue: real("reading_value").notNull(),
  readingUnit: text("reading_unit").notNull().default("m3"),
  readingDate: timestamp("reading_date", { withTimezone: true }).notNull(),
  flowLpm: real("flow_lpm"),
  notes: text("notes"),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("user_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({
  id: true,
  createdAt: true,
});
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;
export type MeterReading = typeof meterReadings.$inferSelect;
