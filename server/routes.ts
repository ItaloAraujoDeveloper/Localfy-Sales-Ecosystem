import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated, isAdmin, isAdminOrManager } from "./auth";
import { insertLeadSchema, insertSellerSchema, updateLeadSchema, updateSellerSchema, type BusinessCategory, type Lead, users, sellers } from "@shared/schema";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image/client";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, inArray } from "drizzle-orm";

// Google Places API configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const PLACES_TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  formatted_phone_number?: string;
  website?: string;
}

// Map Google place types to our categories
function mapPlaceTypeToCategory(types: string[]): BusinessCategory {
  if (types.some(t => ["restaurant", "food", "bakery", "cafe", "bar", "meal_delivery", "meal_takeaway"].includes(t))) {
    return "gastronomy";
  }
  if (types.some(t => ["beauty_salon", "hair_care", "spa", "gym", "health", "hospital", "doctor", "dentist", "physiotherapist"].includes(t))) {
    return "health_beauty";
  }
  if (types.some(t => ["car_repair", "electrician", "plumber", "lawyer", "accounting", "insurance_agency", "real_estate_agency", "travel_agency"].includes(t))) {
    return "services";
  }
  if (types.some(t => ["store", "shopping_mall", "clothing_store", "shoe_store", "jewelry_store", "furniture_store", "electronics_store", "hardware_store", "supermarket", "convenience_store"].includes(t))) {
    return "retail";
  }
  return "generic";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup session and auth routes
  setupSession(app);
  registerAuthRoutes(app);

  // ========== GOOGLE PLACES SEARCH ==========
  
  // Search for businesses using Google Places API
  app.get("/api/places/search", isAuthenticated, async (req, res) => {
    try {
      const { query, location } = req.query;
      
      if (!query || !location) {
        return res.status(400).json({ message: "Query and location are required" });
      }
      
      if (!GOOGLE_PLACES_API_KEY) {
        return res.status(500).json({ message: "Google Places API key not configured" });
      }

      // First, search for places using text search
      const searchQuery = `${query} em ${location}`;
      const textSearchUrl = new URL(PLACES_TEXT_URL);
      textSearchUrl.searchParams.set("query", searchQuery);
      textSearchUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);
      textSearchUrl.searchParams.set("language", "pt-BR");
      
      const searchResponse = await fetch(textSearchUrl.toString());
      const searchData = await searchResponse.json() as { status: string; results: PlaceResult[] };
      
      if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
        console.error("Google Places API error:", searchData);
        return res.status(500).json({ message: `Google API error: ${searchData.status}` });
      }

      const places = searchData.results || [];
      
      // Get details for each place to check for website
      const businessResults = await Promise.all(
        places.slice(0, 20).map(async (place) => {
          // Get place details for phone and website
          const detailsUrl = new URL(PLACES_DETAILS_URL);
          detailsUrl.searchParams.set("place_id", place.place_id);
          detailsUrl.searchParams.set("fields", "formatted_phone_number,website");
          detailsUrl.searchParams.set("key", GOOGLE_PLACES_API_KEY);
          
          try {
            const detailsResponse = await fetch(detailsUrl.toString());
            const detailsData = await detailsResponse.json() as { result?: PlaceResult };
            const details: PlaceResult | Record<string, never> = detailsData.result || {};
            
            // Extract city from address
            const addressParts = (place.formatted_address || place.vicinity || "").split(",");
            const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : location;
            
            return {
              id: place.place_id,
              name: place.name,
              category: mapPlaceTypeToCategory(place.types || []),
              address: place.formatted_address || place.vicinity || "",
              city: city || String(location),
              phone: "formatted_phone_number" in details ? details.formatted_phone_number || "" : "",
              rating: place.rating || 0,
              reviewCount: place.user_ratings_total || 0,
              hasWebsite: "website" in details && !!details.website,
              website: "website" in details ? details.website || null : null,
            };
          } catch (detailError) {
            // If details fail, return place without phone/website info
            const addressParts = (place.formatted_address || place.vicinity || "").split(",");
            const city = addressParts.length > 1 ? addressParts[addressParts.length - 2]?.trim() : location;
            
            return {
              id: place.place_id,
              name: place.name,
              category: mapPlaceTypeToCategory(place.types || []),
              address: place.formatted_address || place.vicinity || "",
              city: city || String(location),
              phone: "",
              rating: place.rating || 0,
              reviewCount: place.user_ratings_total || 0,
              hasWebsite: false,
              website: null,
            };
          }
        })
      );

      res.json(businessResults);
    } catch (error) {
      console.error("Error searching places:", error);
      res.status(500).json({ message: "Failed to search places" });
    }
  });

  // ========== LEADS ==========
  
  // Get all leads (filtered by role)
  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let leads: Lead[];
      
      // Admin sees all leads
      if (user.isAdmin || user.role === "admin") {
        leads = await storage.getLeads();
      }
      // Manager sees leads assigned to their sellers
      else if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        leads = await storage.getLeadsBySellerIds(sellerIds);
      }
      // Seller sees only their own leads
      else {
        const [seller] = await db
          .select()
          .from(sellers)
          .where(eq(sellers.userId, user.id))
          .limit(1);
        
        if (seller) {
          leads = await storage.getLeadsBySeller(seller.id);
        } else {
          leads = [];
        }
      }
      
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Get single lead (with role-based access control)
  app.get("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Admin can access all leads
      if (user.isAdmin || user.role === "admin") {
        return res.json(lead);
      }
      
      // Manager can access leads from their sellers
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        if (lead.sellerId && sellerIds.includes(lead.sellerId)) {
          return res.json(lead);
        }
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Seller can only access their own leads
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.userId, user.id))
        .limit(1);
      
      if (!seller || lead.sellerId !== seller.id) {
        return res.status(403).json({ message: "Access denied" });
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

  // Update lead (with role-based access control)
  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Admin can update all leads
      if (!user.isAdmin && user.role !== "admin") {
        const existingLead = await storage.getLead(req.params.id);
        if (!existingLead) {
          return res.status(404).json({ message: "Lead not found" });
        }
        
        // Manager can update leads from their sellers
        if (user.role === "manager") {
          const managerSellers = await storage.getSellersByManager(user.id);
          const sellerIds = managerSellers.map(s => s.id);
          if (!existingLead.sellerId || !sellerIds.includes(existingLead.sellerId)) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          // Seller can only update their own leads
          const [seller] = await db
            .select()
            .from(sellers)
            .where(eq(sellers.userId, user.id))
            .limit(1);
          
          if (!seller || existingLead.sellerId !== seller.id) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
      }
      
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

  // Delete lead (admin only)
  app.delete("/api/leads/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteLead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // ========== LEAD ACTIVITIES (CRM HISTORY) ==========

  // Get activities for a lead
  app.get("/api/leads/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const lead = await storage.getLead(req.params.id as string);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Admin can access all leads
      if (user.isAdmin || user.role === "admin") {
        const activities = await storage.getLeadActivities(req.params.id as string);
        return res.json(activities);
      }
      
      // Manager can access leads from their sellers
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        if (lead.sellerId && sellerIds.includes(lead.sellerId)) {
          const activities = await storage.getLeadActivities(req.params.id as string);
          return res.json(activities);
        }
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Sellers can only access their own leads
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.userId, user.id))
        .limit(1);
      
      if (!seller || lead.sellerId !== seller.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const activities = await storage.getLeadActivities(req.params.id as string);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching lead activities:", error);
      res.status(500).json({ message: "Failed to fetch lead activities" });
    }
  });

  // Create activity for a lead (register call, note, status change)
  app.post("/api/leads/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { activityType, description, previousStatus, newStatus } = req.body;
      
      const lead = await storage.getLead(req.params.id as string);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Admin can access all leads
      const isAdminUser = user.isAdmin || user.role === "admin";
      
      // Manager can access leads from their sellers
      let hasManagerAccess = false;
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        hasManagerAccess = lead.sellerId ? sellerIds.includes(lead.sellerId) : false;
      }
      
      // Get seller ID for this user (for sellers)
      let sellerId: string | undefined;
      let hasSellerAccess = false;
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.userId, user.id))
        .limit(1);
      
      if (seller) {
        sellerId = seller.id;
        hasSellerAccess = lead.sellerId === seller.id;
      }
      
      // Check access
      if (!isAdminUser && !hasManagerAccess && !hasSellerAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const activity = await storage.createLeadActivity({
        leadId: req.params.id as string,
        sellerId,
        activityType,
        description,
        previousStatus,
        newStatus,
      });
      
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating lead activity:", error);
      res.status(500).json({ message: "Failed to create lead activity" });
    }
  });

  // Update lead status with required note
  app.patch("/api/leads/:id/status", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { status, note } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      if (!note || note.trim().length === 0) {
        return res.status(400).json({ message: "Note explaining the status change is required" });
      }
      
      const lead = await storage.getLead(req.params.id as string);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Admin can access all leads
      const isAdminUser = user.isAdmin || user.role === "admin";
      
      // Manager can access leads from their sellers
      let hasManagerAccess = false;
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        hasManagerAccess = lead.sellerId ? sellerIds.includes(lead.sellerId) : false;
      }
      
      // Get seller ID for this user
      let sellerId: string | undefined;
      let hasSellerAccess = false;
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.userId, user.id))
        .limit(1);
      
      if (seller) {
        sellerId = seller.id;
        hasSellerAccess = lead.sellerId === seller.id;
      }
      
      // Check access
      if (!isAdminUser && !hasManagerAccess && !hasSellerAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const previousStatus = lead.status;
      
      // Update lead status
      const updatedLead = await storage.updateLead(req.params.id as string, { status });
      
      // Create activity record
      await storage.createLeadActivity({
        leadId: req.params.id as string,
        sellerId,
        activityType: "status_change",
        description: note,
        previousStatus,
        newStatus: status,
      });
      
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Register a call for a lead
  app.post("/api/leads/:id/call", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { note } = req.body;
      
      const lead = await storage.getLead(req.params.id as string);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Admin can access all leads
      const isAdminUser = user.isAdmin || user.role === "admin";
      
      // Manager can access leads from their sellers
      let hasManagerAccess = false;
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        hasManagerAccess = lead.sellerId ? sellerIds.includes(lead.sellerId) : false;
      }
      
      // Get seller ID for this user
      let sellerId: string | undefined;
      let hasSellerAccess = false;
      const [seller] = await db
        .select()
        .from(sellers)
        .where(eq(sellers.userId, user.id))
        .limit(1);
      
      if (seller) {
        sellerId = seller.id;
        hasSellerAccess = lead.sellerId === seller.id;
      }
      
      // Check access
      if (!isAdminUser && !hasManagerAccess && !hasSellerAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const activity = await storage.createLeadActivity({
        leadId: req.params.id as string,
        sellerId,
        activityType: "call",
        description: note || "Ligacao realizada",
      });
      
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error registering call:", error);
      res.status(500).json({ message: "Failed to register call" });
    }
  });

  // ========== AI SITE GENERATION ==========

  // Generate site content for a lead using AI (admin or manager)
  app.post("/api/leads/:id/generate-site", isAuthenticated, isAdminOrManager, async (req, res) => {
    try {
      const { id } = req.params;
      const { customPrompt } = req.body;

      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Detect business type from name
      const businessName = lead.businessName.toLowerCase();
      let businessType = "empresa";
      let category = lead.category || "generic";
      
      // Fitness/Academia detection
      if (businessName.includes("academia") || businessName.includes("fitness") || 
          businessName.includes("gym") || businessName.includes("crossfit") ||
          businessName.includes("musculacao") || businessName.includes("pilates")) {
        businessType = "academia";
        category = "services";
      }
      // Salon/Beauty detection
      else if (businessName.includes("salao") || businessName.includes("salon") ||
               businessName.includes("barbearia") || businessName.includes("cabelereiro") ||
               businessName.includes("estetica") || businessName.includes("beleza") ||
               businessName.includes("spa") || businessName.includes("nails") ||
               businessName.includes("manicure")) {
        businessType = "salao";
        category = "health_beauty";
      }
      // Restaurant/Food detection
      else if (businessName.includes("restaurante") || businessName.includes("lanchonete") ||
               businessName.includes("pizzaria") || businessName.includes("hamburguer") ||
               businessName.includes("burger") || businessName.includes("lanches") ||
               businessName.includes("cafe") || businessName.includes("padaria") ||
               businessName.includes("bar") || businessName.includes("churrascaria")) {
        businessType = "restaurante";
        category = "gastronomy";
      }
      // Store/Retail detection
      else if (businessName.includes("loja") || businessName.includes("store") ||
               businessName.includes("boutique") || businessName.includes("mercado") ||
               businessName.includes("supermercado") || businessName.includes("farmacia") ||
               businessName.includes("pet") || businessName.includes("otica")) {
        businessType = "loja";
        category = "retail";
      }
      // Services detection
      else if (businessName.includes("consultoria") || businessName.includes("advocacia") ||
               businessName.includes("contabilidade") || businessName.includes("clinica") ||
               businessName.includes("medico") || businessName.includes("dentista") ||
               businessName.includes("oficina") || businessName.includes("mecanica")) {
        businessType = "servicos";
        category = "services";
      }

      // Generate content using OpenAI
      const { openai } = await import("./replit_integrations/image/client");
      
      const systemPrompt = `Voce e um especialista em marketing digital e criacao de sites para pequenos negocios brasileiros.
Gere conteudo persuasivo e profissional em portugues brasileiro.
Seja criativo mas realista, como se o site fosse real.
Use linguagem apropriada para o tipo de negocio.`;

      const userPrompt = customPrompt ? 
        `Gere conteudo para o site de "${lead.businessName}", um(a) ${businessType} localizado em ${lead.city || lead.address || "cidade"}. 
Instrucoes adicionais: ${customPrompt}

Retorne um JSON com:
{
  "headline": "frase de impacto principal (max 10 palavras)",
  "description": "descricao do negocio (2-3 frases)",
  "services": ["nome servico 1", "nome servico 2", "nome servico 3"],
  "serviceDescriptions": ["descricao servico 1 (1 frase)", "descricao servico 2", "descricao servico 3"],
  "imagePrompt": "prompt em ingles para gerar imagens profissionais deste negocio"
}` :
        `Gere conteudo para o site de "${lead.businessName}", um(a) ${businessType} localizado em ${lead.city || lead.address || "cidade"}.

Retorne um JSON com:
{
  "headline": "frase de impacto principal (max 10 palavras)",
  "description": "descricao do negocio (2-3 frases)",
  "services": ["nome servico/produto 1", "nome servico/produto 2", "nome servico/produto 3"],
  "serviceDescriptions": ["descricao servico 1 (1 frase)", "descricao servico 2", "descricao servico 3"],
  "imagePrompt": "prompt em ingles para gerar imagens profissionais deste ${businessType}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const content = JSON.parse(response.choices[0]?.message?.content || "{}");
      const imagePromptText = content.imagePrompt || `Professional ${businessType} photography in Brazil`;

      // Generate all images in parallel for speed
      let heroImageUrl: string | undefined;
      let productImages: string[] | undefined;
      
      try {
        const heroPrompt = `Professional business photo for ${lead.businessName}, a ${businessType} in Brazil: ${imagePromptText}. High quality, commercial photography style, well-lit, modern and inviting atmosphere.`;
        
        const productPrompts = [
          `Product or service photo 1 for ${businessType}: ${imagePromptText}. Professional commercial photography, clean background.`,
          `Product or service photo 2 for ${businessType}: ${imagePromptText}. Professional product shot, high quality.`,
          `Product or service photo 3 for ${businessType}: ${imagePromptText}. Service or product detail shot, professional lighting.`,
        ];

        // Generate all images in parallel
        const [heroBuffer, ...productBuffers] = await Promise.all([
          generateImageBuffer(heroPrompt, "1024x1024"),
          ...productPrompts.map(prompt => generateImageBuffer(prompt, "1024x1024"))
        ]);

        heroImageUrl = `data:image/png;base64,${heroBuffer.toString("base64")}`;
        productImages = productBuffers.map(buffer => `data:image/png;base64,${buffer.toString("base64")}`);
      } catch (imageError) {
        console.error("Error generating images (will use stock images):", imageError);
      }

      // Update lead with generated content and images
      const updatedLead = await storage.updateLead(id, {
        businessType,
        category: category as any,
        siteGenerated: true,
        siteHeadline: content.headline || `Bem-vindo a ${lead.businessName}`,
        siteDescription: content.description || "Qualidade e excelencia em cada servico.",
        siteServices: content.services || ["Servico 1", "Servico 2", "Servico 3"],
        siteServiceDescriptions: content.serviceDescriptions || ["Descricao 1", "Descricao 2", "Descricao 3"],
        imagePrompt: imagePromptText,
        ...(heroImageUrl && { heroImageUrl }),
        ...(productImages && { productImages }),
      });

      res.json({
        success: true,
        businessType,
        category,
        content,
        imagesGenerated: !!heroImageUrl,
        lead: updatedLead,
      });
    } catch (error) {
      console.error("Error generating site:", error);
      res.status(500).json({ message: "Falha ao gerar conteudo do site" });
    }
  });

  // ========== SELLERS ==========

  // Get all sellers (filtered by manager if not admin)
  app.get("/api/sellers", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Admin sees all sellers
      if (user.isAdmin || user.role === "admin") {
        const sellersList = await storage.getSellers();
        return res.json(sellersList);
      } 
      // Manager sees only their sellers
      if (user.role === "manager") {
        const sellersList = await storage.getSellersByManager(user.id);
        return res.json(sellersList);
      } 
      // Sellers see nothing
      res.json([]);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  // Get single seller (with access control)
  app.get("/api/sellers/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const seller = await storage.getSeller(req.params.id as string);
      
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }
      
      // Admin can access all sellers
      if (user.isAdmin || user.role === "admin") {
        return res.json(seller);
      }
      
      // Manager can only access their own sellers
      if (user.role === "manager") {
        if (seller.managerId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
        return res.json(seller);
      }
      
      // Sellers can only see their own profile
      if (seller.userId === user.id) {
        return res.json(seller);
      }
      
      return res.status(403).json({ message: "Access denied" });
    } catch (error) {
      console.error("Error fetching seller:", error);
      res.status(500).json({ message: "Failed to fetch seller" });
    }
  });

  // Create seller with user account (admin or manager)
  const createSellerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    commissionRate: z.string().optional(),
    password: z.string().min(6),
    isActive: z.boolean().optional(),
  });

  app.post("/api/sellers", isAuthenticated, isAdminOrManager, async (req, res) => {
    try {
      const user = req.user as any;
      const data = createSellerSchema.parse(req.body);

      // Check if email is already in use
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email ja cadastrado" });
      }

      // Hash password and create user account
      const passwordHash = await bcrypt.hash(data.password, 10);
      const nameParts = data.name.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      // Determine manager ID (manager assigns themselves, admin leaves null)
      const managerId = user.role === "manager" ? user.id : null;

      // Create user and seller in a transaction
      const result = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            email: data.email,
            passwordHash,
            firstName,
            lastName,
            isAdmin: false,
            role: "seller",
          })
          .returning();

        const [newSeller] = await tx
          .insert(sellers)
          .values({
            userId: newUser.id,
            managerId,
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            commissionRate: data.commissionRate || "10.00",
            isActive: data.isActive ?? true,
          })
          .returning();

        return newSeller;
      });

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Error creating seller:", error);
      res.status(500).json({ message: "Falha ao criar vendedor" });
    }
  });

  // Update seller (admin or manager for their own sellers)
  app.patch("/api/sellers/:id", isAuthenticated, isAdminOrManager, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if manager can access this seller
      if (user.role === "manager") {
        const existingSeller = await storage.getSeller(req.params.id);
        if (!existingSeller || existingSeller.managerId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
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

  // ========== MANAGERS (Admin only) ==========

  // Get all managers
  app.get("/api/managers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const managers = await db.select().from(users).where(eq(users.role, "manager"));
      const allSellers = await storage.getSellers();
      
      res.json(managers.map(m => {
        const managerSellers = allSellers.filter(s => s.managerId === m.id);
        return {
          id: m.id,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          createdAt: m.createdAt,
          sellerCount: managerSellers.length,
        };
      }));
    } catch (error) {
      console.error("Error fetching managers:", error);
      res.status(500).json({ message: "Failed to fetch managers" });
    }
  });

  // Create manager (admin only)
  app.post("/api/managers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const managerSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().optional(),
      });
      
      const data = managerSchema.parse(req.body);
      
      // Check if email exists
      const [existing] = await db.select().from(users).where(eq(users.email, data.email));
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password and create manager
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      const [newManager] = await db
        .insert(users)
        .values({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName || "",
          isAdmin: false,
          role: "manager",
        })
        .returning();
      
      res.status(201).json({
        id: newManager.id,
        email: newManager.email,
        firstName: newManager.firstName,
        lastName: newManager.lastName,
        role: newManager.role,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating manager:", error);
      res.status(500).json({ message: "Failed to create manager" });
    }
  });

  // Delete manager (admin only)
  app.delete("/api/managers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const managerId = req.params.id as string;
      
      // First verify this is actually a manager user
      const [targetUser] = await db.select().from(users).where(eq(users.id, managerId));
      if (!targetUser) {
        return res.status(404).json({ message: "Manager not found" });
      }
      if (targetUser.role !== "manager") {
        return res.status(400).json({ message: "User is not a manager" });
      }
      
      // Check if manager has sellers
      const managerSellers = await storage.getSellersByManager(managerId);
      if (managerSellers.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete manager with assigned sellers. Reassign sellers first." 
        });
      }
      
      // Delete the manager user
      await db.delete(users).where(eq(users.id, managerId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting manager:", error);
      res.status(500).json({ message: "Failed to delete manager" });
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
