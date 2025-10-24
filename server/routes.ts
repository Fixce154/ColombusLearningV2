import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { requireAuth, optionalAuth, type AuthRequest } from "./auth";
import { insertUserSchema, insertFormationSchema, insertSessionSchema, insertRegistrationSchema } from "@shared/schema";
import { z } from "zod";

const PgSession = connectPgSimple(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "colombus-lms-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In production, this would use proper password hashing (bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      
      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Formation Routes
  app.get("/api/formations", optionalAuth, async (req, res) => {
    try {
      const activeOnly = req.query.active !== "false";
      const formations = await storage.listFormations(activeOnly);
      res.json(formations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/formations/:id", optionalAuth, async (req, res) => {
    try {
      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }
      res.json(formation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Session Routes
  app.get("/api/sessions", optionalAuth, async (req, res) => {
    try {
      const formationId = req.query.formationId as string | undefined;
      const upcoming = req.query.upcoming === "true";
      
      const sessions = upcoming 
        ? await storage.getUpcomingSessions(formationId)
        : await storage.listSessions(formationId);
      
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/sessions/:id", optionalAuth, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Registration Routes
  app.get("/api/registrations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const sessionId = req.query.sessionId as string | undefined;
      
      const registrations = await storage.listRegistrations(userId, sessionId);
      res.json(registrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/registrations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate request body
      const validationSchema = insertRegistrationSchema.omit({ userId: true });
      const data = validationSchema.parse(req.body);

      // Check if session exists
      const session = await storage.getSession(data.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check capacity
      const enrolledCount = await storage.getRegistrationCount(data.sessionId);
      if (enrolledCount >= session.capacity) {
        return res.status(400).json({ message: "Session is full" });
      }

      // Check priority availability
      if (data.priority === "P1" && (user.p1Used || 0) >= 1) {
        return res.status(400).json({ message: "P1 priority already used this year" });
      }
      if (data.priority === "P2" && (user.p2Used || 0) >= 1) {
        return res.status(400).json({ message: "P2 priority already used this year" });
      }

      // Check if already registered
      const existing = await storage.listRegistrations(userId, data.sessionId);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Already registered for this session" });
      }

      // Create registration
      const registration = await storage.createRegistration({
        ...data,
        userId,
        status: "pending",
      });

      res.status(201).json(registration);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/registrations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Only RH can validate registrations, users can only cancel their own
      if (req.body.status === "validated" || req.body.status === "completed") {
        if (user.role !== "rh") {
          return res.status(403).json({ message: "Unauthorized" });
        }
      } else if (registration.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update P1/P2 usage when validating
      if (req.body.status === "validated" && registration.status !== "validated") {
        const registrationUser = await storage.getUser(registration.userId);
        if (registrationUser) {
          if (registration.priority === "P1") {
            await storage.updateUser(registration.userId, { p1Used: (registrationUser.p1Used || 0) + 1 });
          } else if (registration.priority === "P2") {
            await storage.updateUser(registration.userId, { p2Used: (registrationUser.p2Used || 0) + 1 });
          }
        }
      }

      const updated = await storage.updateRegistration(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/registrations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const registration = await storage.getRegistration(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteRegistration(req.params.id);
      res.json({ message: "Registration deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // RH-specific routes
  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "rh") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const registrations = await storage.listRegistrations();
      res.json(registrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
