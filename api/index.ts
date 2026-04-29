import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";
import { seedDefaultAdmin } from "../server/seed";

const app = express();
const httpServer = createServer(app);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize flag
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await seedDefaultAdmin();
  await registerRoutes(httpServer, app);
  initialized = true;
}

// Export handler for Vercel
export default async function handler(req: Request, res: Response) {
  await ensureInitialized();
  return app(req, res);
}
