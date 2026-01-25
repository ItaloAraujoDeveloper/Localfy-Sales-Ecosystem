import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users, registerSchema, loginSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Admin email
const ADMIN_EMAIL = "fl.italo.araujo@gmail.com";

export function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
      },
    })
  );
}

export function registerAuthRoutes(app: Express) {
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email ja cadastrado" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const isAdmin = data.email === ADMIN_EMAIL;
      const [newUser] = await db
        .insert(users)
        .values({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          isAdmin,
        })
        .returning();

      // Set session
      req.session.userId = newUser.id;

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Set session
      req.session.userId = user.id;

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Erro ao sair" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Nao autenticado" });
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Usuario nao encontrado" });
      }

      // Return user without password
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erro ao buscar usuario" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "Usuario nao encontrado" });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Error checking authentication:", error);
    res.status(500).json({ message: "Erro de autenticacao" });
  }
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "Nao autenticado" });
  }

  if (!user.isAdmin) {
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }

  next();
};
