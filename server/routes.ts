import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin } from "./replit_integrations/auth";
import { insertLeadSchema, insertSellerSchema, updateLeadSchema, updateSellerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // ========== LEADS ==========
  
  // Get all leads
  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Get single lead
  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  // Get lead by preview slug (public)
  app.get("/api/leads/preview/:slug", async (req, res) => {
    try {
      const lead = await storage.getLeadBySlug(req.params.slug);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead preview:", error);
      res.status(500).json({ message: "Failed to fetch lead preview" });
    }
  });

  // Create lead
  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const data = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(data);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Update lead
  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const data = updateLeadSchema.parse(req.body);
      const lead = await storage.updateLead(req.params.id, data);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Delete lead
  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // ========== SELLERS ==========

  // Get all sellers
  app.get("/api/sellers", isAuthenticated, async (req, res) => {
    try {
      const sellers = await storage.getSellers();
      res.json(sellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  // Get single seller
  app.get("/api/sellers/:id", isAuthenticated, async (req, res) => {
    try {
      const seller = await storage.getSeller(req.params.id);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      console.error("Error fetching seller:", error);
      res.status(500).json({ message: "Failed to fetch seller" });
    }
  });

  // Create seller (admin only)
  app.post("/api/sellers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertSellerSchema.parse(req.body);
      const seller = await storage.createSeller(data);
      res.status(201).json(seller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating seller:", error);
      res.status(500).json({ message: "Failed to create seller" });
    }
  });

  // Update seller (admin only)
  app.patch("/api/sellers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = updateSellerSchema.parse(req.body);
      const seller = await storage.updateSeller(req.params.id, data);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      res.json(seller);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating seller:", error);
      res.status(500).json({ message: "Failed to update seller" });
    }
  });

  // Delete seller (admin only)
  app.delete("/api/sellers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteSeller(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting seller:", error);
      res.status(500).json({ message: "Failed to delete seller" });
    }
  });

  // ========== COMMISSIONS ==========

  // Get all commissions
  app.get("/api/commissions", isAuthenticated, async (req, res) => {
    try {
      const commissions = await storage.getCommissions();
      res.json(commissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      res.status(500).json({ message: "Failed to fetch commissions" });
    }
  });

  // ========== TEMPLATES ==========

  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  return httpServer;
}
