import { 
  sellers, leads, templates, commissions, leadActivities,
  type Seller, type InsertSeller,
  type Lead, type InsertLead,
  type Template, type InsertTemplate,
  type Commission, type InsertCommission,
  type LeadActivity, type InsertLeadActivity,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Sellers
  getSellers(): Promise<Seller[]>;
  getSellersByManager(managerId: string): Promise<Seller[]>;
  getSeller(id: string): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, data: Partial<InsertSeller>): Promise<Seller | undefined>;
  deleteSeller(id: string): Promise<boolean>;

  // Leads
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  getLeadBySlug(slug: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  getTemplateByCategory(category: string): Promise<Template | undefined>;

  // Commissions
  getCommissions(): Promise<Commission[]>;
  getCommissionsBySeller(sellerId: string): Promise<Commission[]>;
  createCommission(commission: InsertCommission): Promise<Commission>;

  // Lead Activities (CRM History)
  getLeadActivities(leadId: string): Promise<LeadActivity[]>;
  createLeadActivity(activity: InsertLeadActivity): Promise<LeadActivity>;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + randomUUID().slice(0, 8);
}

export class DatabaseStorage implements IStorage {
  // Sellers
  async getSellers(): Promise<Seller[]> {
    return await db.select().from(sellers).orderBy(desc(sellers.createdAt));
  }

  async getSellersByManager(managerId: string): Promise<Seller[]> {
    return await db
      .select()
      .from(sellers)
      .where(eq(sellers.managerId, managerId))
      .orderBy(desc(sellers.createdAt));
  }

  async getSeller(id: string): Promise<Seller | undefined> {
    const [seller] = await db.select().from(sellers).where(eq(sellers.id, id));
    return seller;
  }

  async createSeller(data: InsertSeller): Promise<Seller> {
    const [seller] = await db.insert(sellers).values(data).returning();
    return seller;
  }

  async updateSeller(id: string, data: Partial<InsertSeller>): Promise<Seller | undefined> {
    const [seller] = await db
      .update(sellers)
      .set(data)
      .where(eq(sellers.id, id))
      .returning();
    return seller;
  }

  async deleteSeller(id: string): Promise<boolean> {
    const result = await db.delete(sellers).where(eq(sellers.id, id));
    return true;
  }

  // Leads
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadBySlug(slug: string): Promise<Lead | undefined> {
    // Try by slug first, then by ID
    let [lead] = await db.select().from(leads).where(eq(leads.previewSlug, slug));
    if (!lead) {
      [lead] = await db.select().from(leads).where(eq(leads.id, slug));
    }
    return lead;
  }

  async createLead(data: InsertLead): Promise<Lead> {
    const slug = generateSlug(data.businessName);
    const [lead] = await db
      .insert(leads)
      .values({ ...data, previewSlug: slug })
      .returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(leads).where(eq(leads.id, id));
    return true;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async getTemplateByCategory(category: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.category, category as any));
    return template;
  }

  // Commissions
  async getCommissions(): Promise<Commission[]> {
    return await db.select().from(commissions).orderBy(desc(commissions.createdAt));
  }

  async getCommissionsBySeller(sellerId: string): Promise<Commission[]> {
    return await db
      .select()
      .from(commissions)
      .where(eq(commissions.sellerId, sellerId))
      .orderBy(desc(commissions.createdAt));
  }

  async createCommission(data: InsertCommission): Promise<Commission> {
    const [commission] = await db.insert(commissions).values(data).returning();
    return commission;
  }

  // Lead Activities (CRM History)
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    return await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(desc(leadActivities.createdAt));
  }

  async createLeadActivity(data: InsertLeadActivity): Promise<LeadActivity> {
    const [activity] = await db.insert(leadActivities).values(data).returning();
    return activity;
  }
}

export const storage = new DatabaseStorage();
