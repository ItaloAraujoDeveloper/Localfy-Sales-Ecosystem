import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated, isAdmin, isAdminOrManager } from "./auth";
import { insertLeadSchema, insertSellerSchema, updateLeadSchema, updateSellerSchema, type BusinessCategory, type Lead, type User, users, sellers } from "@shared/schema";
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
      // Manager sees leads they imported + leads assigned to their sellers
      else if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        leads = await storage.getLeadsByManagerAccess(user.id, sellerIds);
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
      
      // Remove heavy fields (productImages, heroImageUrl with base64) from list response
      // to prevent payload size issues with many leads
      const lightLeads = leads.map(lead => ({
        ...lead,
        productImages: lead.productImages ? ["[images]"] : null, // Indicate images exist but don't send data
        heroImageUrl: lead.heroImageUrl?.startsWith("data:") ? "[base64]" : lead.heroImageUrl,
      }));
      
      res.json(lightLeads);
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
      
      // Manager can access leads they imported OR leads from their sellers
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        const isCreator = lead.createdByUserId === user.id;
        const hasSellerAccess = lead.sellerId && sellerIds.includes(lead.sellerId);
        if (isCreator || hasSellerAccess) {
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
      const user = req.user as any;
      const data = insertLeadSchema.parse(req.body);
      // Set the createdByUserId to track who imported this lead
      const lead = await storage.createLead({
        ...data,
        createdByUserId: user.id,
      });
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
        
        // Manager can update leads they imported OR leads from their sellers
        if (user.role === "manager") {
          const managerSellers = await storage.getSellersByManager(user.id);
          const sellerIds = managerSellers.map(s => s.id);
          const isCreator = existingLead.createdByUserId === user.id;
          const hasSellerAccess = existingLead.sellerId && sellerIds.includes(existingLead.sellerId);
          if (!isCreator && !hasSellerAccess) {
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
      
      // Manager can access leads they imported OR leads from their sellers
      let hasManagerAccess = false;
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        const isCreator = lead.createdByUserId === user.id;
        const hasSellerAccess = lead.sellerId ? sellerIds.includes(lead.sellerId) : false;
        hasManagerAccess = isCreator || hasSellerAccess;
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
      
      // Manager can access leads they imported OR leads from their sellers
      let hasManagerAccess = false;
      if (user.role === "manager") {
        const managerSellers = await storage.getSellersByManager(user.id);
        const sellerIds = managerSellers.map(s => s.id);
        const isCreator = lead.createdByUserId === user.id;
        const hasSellerAccess = lead.sellerId ? sellerIds.includes(lead.sellerId) : false;
        hasManagerAccess = isCreator || hasSellerAccess;
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
      const { customPrompt, businessType: requestedBusinessType } = req.body;

      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Import business categories configuration
      const { businessCategories, getBusinessCategory } = await import("@shared/businessCategories");
      
      // Detect business type from name or use requested type
      const businessName = lead.businessName.toLowerCase();
      let detectedBusinessType = requestedBusinessType || lead.businessType || "restaurant";
      
      // Auto-detection patterns
      const detectionPatterns: Record<string, string[]> = {
        church: ["igreja", "capela", "paroquia", "templo", "ministerio", "assembleia", "batista", "catolica", "evangelica"],
        candy_store: ["doces", "doceria", "brigadeiro", "confeitaria", "chocolate", "bombom", "trufa"],
        clothing_store: ["roupa", "moda", "vestuario", "boutique", "fashion", "loja de", "confeccao", "jeans"],
        bar: ["bar", "pub", "choperia", "boteco", "cervejaria", "drinks"],
        nail_salon: ["manicure", "pedicure", "nail", "unhas", "esmalte", "unha"],
        massage: ["massagem", "massoterapia", "relaxamento", "spa", "shiatsu", "quick massage"],
        concert_venue: ["show", "casa de show", "musica ao vivo", "eventos", "balada", "danceteria", "boate"],
        restaurant: ["restaurante", "bistr", "gastrobar", "rodizio", "buffet", "self service"],
        burger_joint: ["hamburguer", "burger", "lanche", "lanches", "lanchonete", "x-tudo", "hot dog"],
        bakery: ["padaria", "panificadora", "confeitaria", "pao", "bolo", "paes"],
        gym: ["academia", "fitness", "musculacao", "crossfit", "pilates", "funcional", "treino", "gym"],
        beauty_salon: ["salao", "cabelereiro", "cabeleireiro", "beleza", "penteado", "corte", "tintura"],
        barbershop: ["barbearia", "barber", "barbeiro"],
        pet_shop: ["pet", "petshop", "animal", "veterinaria", "vet", "cachorro", "gato", "banho e tosa"],
        dental_clinic: ["dentista", "odonto", "odontologia", "dental", "clinica dental", "ortodontia", "sorriso"],
        pharmacy: ["farmacia", "drogaria", "medicamento", "remedio"],
        car_wash: ["lava", "lava jato", "lava rapido", "lavagem", "polimento"],
        auto_repair: ["oficina", "mecanica", "mecanico", "funilaria", "borracharia", "pneu"],
        real_estate: ["imobiliaria", "imoveis", "corretor", "aluguel", "venda de casas"],
        law_office: ["advocacia", "advogado", "escritorio de advocacia", "juridico"],
        florist: ["floricultura", "flores", "floricultora", "arranjos", "buque"],
        photography: ["foto", "fotografia", "estudio fotografico", "ensaio", "fotografo"],
        tattoo_studio: ["tatuagem", "tattoo", "tatoo", "piercing", "body art"],
        daycare: ["creche", "escola infantil", "bercario", "educacao infantil", "jardim de infancia"],
        pizza: ["pizza", "pizzaria", "pizzas"],
        acai: ["acai", "acaiteria", "vitamina", "smoothie"],
      };
      
      // Auto-detect if not specified
      if (!requestedBusinessType) {
        for (const [type, patterns] of Object.entries(detectionPatterns)) {
          if (patterns.some(p => businessName.includes(p))) {
            detectedBusinessType = type;
            break;
          }
        }
      }
      
      // Get category configuration
      const categoryConfig = getBusinessCategory(detectedBusinessType);
      if (!categoryConfig) {
        detectedBusinessType = "restaurant"; // fallback
      }
      const config = getBusinessCategory(detectedBusinessType)!;

      // Generate content using OpenAI
      const { openai } = await import("./replit_integrations/image/client");
      
      const systemPrompt = `Voce e um especialista em marketing digital e criacao de sites para pequenos negocios brasileiros.
Gere conteudo persuasivo e profissional em portugues brasileiro.
Seja criativo mas realista, como se o site fosse real.
Use linguagem apropriada para o tipo de negocio: ${config.labelPt}.
Tom de comunicacao: ${config.tone === "spiritual" ? "acolhedor e inspirador" : 
  config.tone === "luxury" ? "elegante e sofisticado" :
  config.tone === "fun" ? "descontraido e animado" :
  config.tone === "relaxing" ? "calmo e tranquilizador" :
  config.tone === "energetic" ? "motivador e energico" :
  config.tone === "serious" ? "formal e profissional" :
  "amigavel e profissional"}.
Palavras-chave do segmento: ${config.keywords.join(", ")}.`;

      // Build section-specific prompts based on category
      const sectionsToGenerate = config.sections.filter(s => s.required || Math.random() > 0.3);
      const sectionTypes = sectionsToGenerate.map(s => s.type);
      
      const userPrompt = `Gere conteudo COMPLETO para o site de "${lead.businessName}", um(a) ${config.labelPt} localizado em ${lead.city || lead.address || "sua cidade"}.
${customPrompt ? `Instrucoes adicionais: ${customPrompt}` : ""}

O site tera as seguintes secoes: ${sectionsToGenerate.map(s => s.title).join(", ")}.

Retorne um JSON com TODOS os campos abaixo (use dados ficticios mas realistas):
{
  "headline": "frase de impacto principal (max 10 palavras) para ${config.labelPt}",
  "description": "descricao envolvente do negocio (2-3 frases)",
  "about": "historia e missao da empresa (3-4 frases)",
  "services": ["${config.defaultServices[0]}", "${config.defaultServices[1]}", "${config.defaultServices[2]}", "${config.defaultServices[3] || config.defaultServices[0]}"],
  "serviceDescriptions": ["descricao servico 1", "descricao servico 2", "descricao servico 3", "descricao servico 4"],
  "features": [
    {"title": "Diferencial 1", "description": "Por que somos unicos"},
    {"title": "Diferencial 2", "description": "Outro ponto forte"},
    {"title": "Diferencial 3", "description": "Mais um beneficio"}
  ],
  "schedule": {
    "weekdays": "Segunda a Sexta: 08:00 - 18:00",
    "saturday": "Sabado: 09:00 - 14:00",
    "sunday": "Domingo: Fechado",
    "note": "Horarios especiais em feriados"
  },
  "testimonials": [
    {"name": "Nome Cliente 1", "text": "Depoimento positivo curto", "rating": 5},
    {"name": "Nome Cliente 2", "text": "Outro depoimento", "rating": 5},
    {"name": "Nome Cliente 3", "text": "Mais um depoimento", "rating": 4}
  ],
  ${sectionTypes.includes("menu") ? `"menu": [
    {"name": "Item 1", "description": "Descricao breve", "price": "R$ XX,XX"},
    {"name": "Item 2", "description": "Descricao breve", "price": "R$ XX,XX"},
    {"name": "Item 3", "description": "Descricao breve", "price": "R$ XX,XX"}
  ],` : ""}
  ${sectionTypes.includes("events") ? `"events": [
    {"title": "Evento 1", "date": "Data proxima", "description": "Detalhes"},
    {"title": "Evento 2", "date": "Outra data", "description": "Detalhes"}
  ],` : ""}
  ${sectionTypes.includes("pricing") ? `"pricing": [
    {"name": "Plano/Pacote Basico", "price": "R$ XX,XX", "features": ["item 1", "item 2"]},
    {"name": "Plano/Pacote Premium", "price": "R$ XX,XX", "features": ["item 1", "item 2", "item 3"]}
  ],` : ""}
  ${sectionTypes.includes("team") ? `"team": [
    {"name": "Profissional 1", "role": "Cargo", "description": "Breve bio"},
    {"name": "Profissional 2", "role": "Cargo", "description": "Breve bio"}
  ],` : ""}
  ${sectionTypes.includes("faq") ? `"faq": [
    {"question": "Pergunta frequente 1?", "answer": "Resposta"},
    {"question": "Pergunta frequente 2?", "answer": "Resposta"},
    {"question": "Pergunta frequente 3?", "answer": "Resposta"}
  ],` : ""}
  "ctas": ${JSON.stringify(config.defaultCTAs)},
  "imagePrompt": "prompt em ingles para gerar imagens: ${config.imageStyle}"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500,
      });

      const content = JSON.parse(response.choices[0]?.message?.content || "{}");
      const imagePromptText = content.imagePrompt || config.imageStyle;

      // Generate all images in parallel for speed
      let heroImageUrl: string | undefined;
      let productImages: string[] | undefined;
      let galleryImages: string[] | undefined;
      
      try {
        const heroPrompt = `${config.imageStyle}. Professional business photo for ${lead.businessName}. High quality commercial photography, well-lit, modern, inviting. Brazilian business.`;
        
        const productPrompts = (content.services || config.defaultServices).slice(0, 4).map((service: string, i: number) => 
          `Professional photo representing ${service} for a ${config.labelPt}: ${imagePromptText}. Commercial photography, clean composition, high quality.`
        );

        // Generate all images in parallel
        const imageBuffers = await Promise.all([
          generateImageBuffer(heroPrompt, "1024x1024"),
          ...productPrompts.map((prompt: string) => generateImageBuffer(prompt, "1024x1024"))
        ]);

        heroImageUrl = `data:image/png;base64,${imageBuffers[0].toString("base64")}`;
        productImages = imageBuffers.slice(1).map(buffer => `data:image/png;base64,${buffer.toString("base64")}`);
      } catch (imageError) {
        console.error("Error generating images:", imageError);
      }

      // Prepare JSON fields
      const scheduleJson = content.schedule ? JSON.stringify(content.schedule) : null;
      const testimonialsJson = content.testimonials ? JSON.stringify(content.testimonials) : null;
      const featuresJson = content.features ? JSON.stringify(content.features) : null;
      const menuJson = content.menu ? JSON.stringify(content.menu) : null;
      const eventsJson = content.events ? JSON.stringify(content.events) : null;
      const pricingJson = content.pricing ? JSON.stringify(content.pricing) : null;
      const teamJson = content.team ? JSON.stringify(content.team) : null;
      const faqJson = content.faq ? JSON.stringify(content.faq) : null;

      // Update lead with generated content and images
      const updatedLead = await storage.updateLead(id, {
        businessType: detectedBusinessType,
        siteGenerated: true,
        siteHeadline: content.headline || `Bem-vindo a ${lead.businessName}`,
        siteDescription: content.description || "Qualidade e excelencia em cada servico.",
        siteServices: content.services || config.defaultServices,
        siteServiceDescriptions: content.serviceDescriptions || config.defaultServices.map(() => "Servico de qualidade"),
        siteAbout: content.about || null,
        siteSchedule: scheduleJson,
        siteTestimonials: testimonialsJson,
        siteFeatures: featuresJson,
        siteMenu: menuJson,
        siteEvents: eventsJson,
        sitePricing: pricingJson,
        siteTeam: teamJson,
        siteFAQ: faqJson,
        sitePrimaryColor: config.primaryColor,
        siteSecondaryColor: config.secondaryColor,
        imagePrompt: imagePromptText,
        ...(heroImageUrl && { heroImageUrl }),
        ...(productImages && { productImages }),
      });

      res.json({
        success: true,
        businessType: detectedBusinessType,
        categoryConfig: {
          id: config.id,
          label: config.labelPt,
          primaryColor: config.primaryColor,
          sections: sectionsToGenerate,
        },
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

  // ========== SELLER DASHBOARD ==========

  // Get seller's own leads
  app.get("/api/seller/leads", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Find seller record linked to this user (efficient single query)
      const seller = await storage.getSellerByUserId(user.id);
      
      if (!seller) {
        // User is not a seller (admin/manager) - return empty array
        return res.json([]);
      }
      
      const leads = await storage.getLeadsBySeller(seller.id);
      
      // Remove heavy fields from list response to prevent payload size issues
      const lightLeads = leads.map(lead => ({
        ...lead,
        productImages: lead.productImages ? ["[images]"] : null,
        heroImageUrl: lead.heroImageUrl?.startsWith("data:") ? "[base64]" : lead.heroImageUrl,
      }));
      
      res.json(lightLeads);
    } catch (error) {
      console.error("Error fetching seller leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Get seller's activities (for all their leads)
  app.get("/api/seller/activities", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Find seller record linked to this user (efficient single query)
      const seller = await storage.getSellerByUserId(user.id);
      
      if (!seller) {
        // User is not a seller (admin/manager) - return empty array
        return res.json([]);
      }
      
      const leads = await storage.getLeadsBySeller(seller.id);
      const leadIds = leads.map(l => l.id);
      const activities = await storage.getActivitiesForLeads(leadIds);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching seller activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // ========== USER SETTINGS ==========

  // Change password
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      }

      // Get user with passwordHash
      const [fullUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (!fullUser || !fullUser.passwordHash) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, fullUser.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, user.id));

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  // ========== BUSINESS CATEGORIES ==========

  // Get all business categories configuration
  app.get("/api/business-categories", async (req, res) => {
    try {
      const { businessCategories } = await import("@shared/businessCategories");
      res.json(businessCategories.map(cat => ({
        id: cat.id,
        label: cat.label,
        labelPt: cat.labelPt,
        icon: cat.icon,
        primaryColor: cat.primaryColor,
        secondaryColor: cat.secondaryColor,
        gradient: cat.gradient,
        tone: cat.tone,
        sections: cat.sections,
        defaultServices: cat.defaultServices,
        defaultCTAs: cat.defaultCTAs,
      })));
    } catch (error) {
      console.error("Error fetching business categories:", error);
      res.status(500).json({ message: "Failed to fetch business categories" });
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
