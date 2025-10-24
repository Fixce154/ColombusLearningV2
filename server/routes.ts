import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { requireAuth, optionalAuth, type AuthRequest } from "./auth";
import { insertUserSchema, insertFormationSchema, insertSessionSchema, insertFormationInterestSchema, insertRegistrationSchema } from "@shared/schema";
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
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validationSchema = insertUserSchema.extend({
        password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
      });
      const data = validationSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Un compte existe déjà avec cet email" });
      }

      // Create user (in production, password would be hashed with bcrypt)
      const user = await storage.createUser({
        ...data,
        p1Used: 0,
        p2Used: 0,
      });

      // Set session
      req.session.userId = user.id;

      // Don't send password to client
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      // In production, this would use proper password hashing (bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
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

  // Formation Interest Routes
  app.get("/api/interests", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const interests = await storage.listFormationInterests({ userId });
      res.json(interests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/interests", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate request body
      const validationSchema = insertFormationInterestSchema.omit({ userId: true });
      const data = validationSchema.parse(req.body);

      // Check if formation exists
      const formation = await storage.getFormation(data.formationId);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      // Check if already expressed interest for this formation
      const existing = await storage.listFormationInterests({ userId, formationId: data.formationId });
      const activeInterest = existing.find(i => i.status === "pending" || i.status === "approved");
      if (activeInterest) {
        return res.status(400).json({ message: "Vous avez déjà manifesté votre intérêt pour cette formation" });
      }

      // Check P1/P2 quotas - consumed immediately at expression of interest
      if (data.priority === "P1") {
        if ((user.p1Used || 0) >= 1) {
          return res.status(400).json({ message: "Vous avez déjà utilisé votre priorité P1 cette année" });
        }
        await storage.updateUser(userId, { p1Used: (user.p1Used || 0) + 1 });
      } else if (data.priority === "P2") {
        if ((user.p2Used || 0) >= 1) {
          return res.status(400).json({ message: "Vous avez déjà utilisé votre priorité P2 cette année" });
        }
        await storage.updateUser(userId, { p2Used: (user.p2Used || 0) + 1 });
      }

      // Create interest with status="pending"
      const interest = await storage.createFormationInterest({
        ...data,
        userId,
        status: "pending",
      });

      res.status(201).json(interest);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/interests/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const interest = await storage.getFormationInterest(req.params.id);
      if (!interest) {
        return res.status(404).json({ message: "Interest not found" });
      }

      // Only RH can approve/reject, users can only withdraw their own
      if (req.body.status === "approved" || req.body.status === "converted") {
        if (user.role !== "rh") {
          return res.status(403).json({ message: "Unauthorized" });
        }
      } else if (interest.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updated = await storage.updateFormationInterest(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/interests/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const interest = await storage.getFormationInterest(req.params.id);
      
      if (!interest) {
        return res.status(404).json({ message: "Interest not found" });
      }

      if (interest.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Refund P1/P2 quotas if interest was pending or approved
      if (interest.status === "pending" || interest.status === "approved") {
        const user = await storage.getUser(userId);
        if (user) {
          if (interest.priority === "P1" && (user.p1Used || 0) > 0) {
            await storage.updateUser(userId, { p1Used: (user.p1Used || 0) - 1 });
          } else if (interest.priority === "P2" && (user.p2Used || 0) > 0) {
            await storage.updateUser(userId, { p2Used: (user.p2Used || 0) - 1 });
          }
        }
      }

      await storage.deleteFormationInterest(req.params.id);
      res.json({ message: "Interest deleted successfully" });
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

      // Check capacity - count only validated and pending registrations
      const enrolledCount = await storage.getRegistrationCount(data.sessionId);
      if (enrolledCount >= session.capacity) {
        return res.status(400).json({ message: "La session est complète" });
      }

      // Check if already registered for this formation
      const existingForFormation = await storage.listRegistrations(userId);
      const alreadyRegistered = existingForFormation.find(
        r => r.formationId === data.formationId && r.status !== "cancelled"
      );
      if (alreadyRegistered) {
        return res.status(400).json({ message: "Vous êtes déjà inscrit à cette formation" });
      }

      // IMPORTANT: Don't check P1/P2 quotas here - they're only consumed when RH validates
      // Just create the registration with status="pending"
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

      // When RH validates, check P1/P2 quotas and update usage
      if (req.body.status === "validated" && registration.status === "pending") {
        const registrationUser = await storage.getUser(registration.userId);
        if (!registrationUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check and consume P1/P2 quotas
        if (registration.priority === "P1") {
          if ((registrationUser.p1Used || 0) >= 1) {
            return res.status(400).json({ message: "L'utilisateur a déjà utilisé sa priorité P1 cette année" });
          }
          await storage.updateUser(registration.userId, { p1Used: (registrationUser.p1Used || 0) + 1 });
        } else if (registration.priority === "P2") {
          if ((registrationUser.p2Used || 0) >= 1) {
            return res.status(400).json({ message: "L'utilisateur a déjà utilisé sa priorité P2 cette année" });
          }
          await storage.updateUser(registration.userId, { p2Used: (registrationUser.p2Used || 0) + 1 });
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

      // Refund P1/P2 quotas if registration was pending or validated
      if (registration.status === "pending" || registration.status === "validated") {
        const user = await storage.getUser(userId);
        if (user) {
          if (registration.priority === "P1" && (user.p1Used || 0) > 0) {
            await storage.updateUser(userId, { p1Used: (user.p1Used || 0) - 1 });
          } else if (registration.priority === "P2" && (user.p2Used || 0) > 0) {
            await storage.updateUser(userId, { p2Used: (user.p2Used || 0) - 1 });
          }
        }
      }

      await storage.deleteRegistration(req.params.id);
      res.json({ message: "Registration deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // RH-specific routes
  app.get("/api/admin/interests", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "rh") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get all formation interests
      const interests = await storage.listFormationInterests();
      
      // Aggregate by formation
      const formationMap = new Map<string, {
        formationId: string;
        pending: number;
        approved: number;
        converted: number;
        withdrawn: number;
        p1Count: number;
        p2Count: number;
        p3Count: number;
      }>();

      for (const interest of interests) {
        if (!formationMap.has(interest.formationId)) {
          formationMap.set(interest.formationId, {
            formationId: interest.formationId,
            pending: 0,
            approved: 0,
            converted: 0,
            withdrawn: 0,
            p1Count: 0,
            p2Count: 0,
            p3Count: 0,
          });
        }

        const stats = formationMap.get(interest.formationId)!;
        
        // Count by status
        if (interest.status === "pending") stats.pending++;
        else if (interest.status === "approved") stats.approved++;
        else if (interest.status === "converted") stats.converted++;
        else if (interest.status === "withdrawn") stats.withdrawn++;

        // Count by priority
        if (interest.priority === "P1") stats.p1Count++;
        else if (interest.priority === "P2") stats.p2Count++;
        else if (interest.priority === "P3") stats.p3Count++;
      }

      const aggregated = Array.from(formationMap.values());
      res.json({ interests, aggregated });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

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

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      // Only RH can see all users
      if (!user || user.role !== "rh") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const users = await storage.listUsers();
      // Don't send passwords
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
