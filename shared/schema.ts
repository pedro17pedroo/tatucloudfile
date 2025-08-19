import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  planId: varchar("plan_id").references(() => plans.id).default('basic'),
  storageUsed: numeric("storage_used").default('0'),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Storage plans
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  storageLimit: numeric("storage_limit").notNull(), // in bytes
  pricePerMonth: numeric("price_per_month").notNull(),
  apiCallsPerHour: integer("api_calls_per_hour").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User API keys for developers
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  keyHash: varchar("key_hash").notNull(),
  name: varchar("name").notNull(),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// File metadata
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  megaFileId: varchar("mega_file_id").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: numeric("file_size").notNull(),
  mimeType: varchar("mime_type"),
  filePath: varchar("file_path"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});



// Admin audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // user_created, payment_approved, etc.
  targetType: varchar("target_type").notNull(), // user, payment, api_key, etc.
  targetId: varchar("target_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings
export const systemSettings = pgTable("system_settings", {
  key: varchar("key").primaryKey(),
  value: text("value"),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MEGA account monitoring
export const megaAccountStatus = pgTable("mega_account_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalSpace: numeric("total_space"), // in bytes
  usedSpace: numeric("used_space"), // in bytes
  availableSpace: numeric("available_space"), // in bytes
  accountType: varchar("account_type"), // free, pro, business
  transferQuota: numeric("transfer_quota"), // in bytes
  transferUsed: numeric("transfer_used"), // in bytes
  isConnected: boolean("is_connected").default(false),
  lastChecked: timestamp("last_checked").defaultNow(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MEGA credentials (admin only)
export const megaCredentials = pgTable("mega_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  passwordHash: varchar("password_hash").notNull(), // For legacy compatibility
  password: varchar("password").notNull(), // Plain text password for MEGA API
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API usage tracking
export const apiUsage = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  requestSize: integer("request_size"), // in bytes
  responseSize: integer("response_size"), // in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscription history
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  planId: varchar("plan_id").references(() => plans.id).notNull(),
  status: varchar("status").default('active'), // active, cancelled, expired
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment history
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subscriptionId: varchar("subscription_id").references(() => userSubscriptions.id),
  planId: varchar("plan_id").references(() => plans.id).notNull(),
  amount: numeric("amount").notNull(),
  currency: varchar("currency").default('EUR'),
  status: varchar("status").notNull().default('pending'), // pending, approved, rejected, completed
  paymentMethod: varchar("payment_method").notNull(), // bank_transfer, stripe, other
  transactionId: varchar("transaction_id"),
  bankReference: varchar("bank_reference"), // For bank transfers
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  receiptUrl: varchar("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User settings
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  notifications: boolean("notifications").default(true),
  theme: varchar("theme").default('light'), // light, dark
  language: varchar("language").default('pt'), // pt, en
  timezone: varchar("timezone").default('Europe/Lisbon'),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment methods table
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // 'stripe', 'bank_transfer_bai', 'bank_transfer_bfa', 'bank_transfer_bic', 'paypal', 'wise', 'multicaixa', 'express_payment'
  country: varchar("country").default('AO'), // AO = Angola, INT = International
  isActive: boolean("is_active").default(true),
  bankDetails: jsonb("bank_details").default('{}'), // Account details for bank transfers
  configuration: jsonb("configuration").default('{}'),
  processingTime: varchar("processing_time"), // e.g., "24-48 horas"
  fees: varchar("fees"), // e.g., "0.5% + AOA 500"
  description: text("description"),
  instructions: text("instructions"), // Instructions for users
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment proofs table for bank transfers
export const paymentProofs = pgTable("payment_proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").references(() => payments.id).notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadPath: varchar("upload_path").notNull(), // Path where file is stored
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  status: varchar("status").default('pending'), // pending, verified, rejected
  notes: text("notes"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  createdAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export const insertMegaCredentialsSchema = createInsertSchema(megaCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentProofSchema = createInsertSchema(paymentProofs).omit({
  id: true,
  uploadedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type MegaCredentials = typeof megaCredentials.$inferSelect;
export type InsertMegaCredentials = z.infer<typeof insertMegaCredentialsSchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = typeof apiUsage.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export type MegaAccountStatus = typeof megaAccountStatus.$inferSelect;
export type InsertMegaAccountStatus = typeof megaAccountStatus.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentProof = typeof paymentProofs.$inferSelect;
export type InsertPaymentProof = z.infer<typeof insertPaymentProofSchema>;
