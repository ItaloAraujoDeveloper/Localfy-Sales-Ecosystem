import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "seller"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "distributed", "negotiating", "won", "lost"]);
export const businessCategoryEnum = pgEnum("business_category", ["gastronomy", "health_beauty", "services", "retail", "generic"]);

// Sellers table - extends users with seller-specific data
export const sellers = pgTable("sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  category: businessCategoryEnum("category").default("generic"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").default(0),
  status: leadStatusEnum("status").default("new"),
  sellerId: varchar("seller_id"),
  monthlyValue: decimal("monthly_value", { precision: 10, scale: 2 }).default("99.00"),
  notes: text("notes"),
  previewSlug: text("preview_slug"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Templates table
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: businessCategoryEnum("category").notNull(),
  description: text("description"),
  primaryColor: text("primary_color").default("#3B82F6"),
  isActive: boolean("is_active").default(true),
});

// Commissions table
export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull(),
  leadId: varchar("lead_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const sellersRelations = relations(sellers, ({ many }) => ({
  leads: many(leads),
  commissions: many(commissions),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  seller: one(sellers, {
    fields: [leads.sellerId],
    references: [sellers.id],
  }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  seller: one(sellers, {
    fields: [commissions.sellerId],
    references: [sellers.id],
  }),
  lead: one(leads, {
    fields: [commissions.leadId],
    references: [leads.id],
  }),
}));

// Insert schemas
export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
});

// Update schemas (partial versions)
export const updateSellerSchema = insertSellerSchema.partial();
export const updateLeadSchema = insertLeadSchema.partial();

// Types
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type Seller = typeof sellers.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;

// Lead status for Kanban
export const LEAD_STATUSES = ["new", "distributed", "negotiating", "won", "lost"] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

// Business categories
export const BUSINESS_CATEGORIES = ["gastronomy", "health_beauty", "services", "retail", "generic"] as const;
export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

// Category labels for display
export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  gastronomy: "Gastronomia",
  health_beauty: "Saude & Beleza",
  services: "Servicos",
  retail: "Varejo",
  generic: "Institucional",
};

// Status labels for display
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Novos",
  distributed: "Distribuidos",
  negotiating: "Em Negociacao",
  won: "Venda Fechada",
  lost: "Perdidos",
};
