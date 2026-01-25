import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, registerAuthRoutes, isAuthenticated, isAdmin } from "./auth";
import { insertLeadSchema, insertSellerSchema, updateLeadSchema, updateSellerSchema, type BusinessCategory } from "@shared/schema";
import { z } from "zod";
import { generateImageBuffer } from "./replit_integrations/image/client";

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

  // ========== AI IMAGE GENERATION ==========

  // Generate images for a lead using AI
  app.post("/api/leads/:id/generate-images", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Generate hero image
      const heroPrompt = `Professional business photo for ${lead.businessName}: ${prompt}. High quality, commercial photography style, well-lit, modern and inviting atmosphere.`;
      const heroBuffer = await generateImageBuffer(heroPrompt, "1024x1024");
      const heroBase64 = heroBuffer.toString("base64");
      const heroDataUrl = `data:image/png;base64,${heroBase64}`;

      // Generate 3 product/service images
      const productPrompts = [
        `Product or service photo 1 for ${lead.businessName}: ${prompt}. Professional commercial photography, clean background.`,
        `Product or service photo 2 for ${lead.businessName}: ${prompt}. Professional product shot, high quality.`,
        `Product or service photo 3 for ${lead.businessName}: ${prompt}. Service or product detail shot, professional lighting.`,
      ];

      const productImages: string[] = [];
      for (const prodPrompt of productPrompts) {
        const buffer = await generateImageBuffer(prodPrompt, "1024x1024");
        const base64 = buffer.toString("base64");
        productImages.push(`data:image/png;base64,${base64}`);
      }

      // Update lead with generated images
      const updatedLead = await storage.updateLead(id, {
        imagePrompt: prompt,
        heroImageUrl: heroDataUrl,
        productImages: productImages,
      });

      res.json({
        success: true,
        heroImageUrl: heroDataUrl,
        productImages: productImages,
        lead: updatedLead,
      });
    } catch (error) {
      console.error("Error generating images:", error);
      res.status(500).json({ message: "Failed to generate images" });
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
