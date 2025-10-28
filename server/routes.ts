import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { inflateRawSync } from "zlib";
import { pool } from "./db";
import { storage, ensureFormationContentInfrastructure } from "./storage";
import { requireAuth, optionalAuth, type AuthRequest } from "./auth";
import {
  insertUserSchema,
  insertFormationSchema,
  insertSessionSchema,
  insertFormationInterestSchema,
  insertRegistrationSchema,
  type InsertUser,
  type InsertNotification,
  type FormationInterest,
  type User,
  type Formation,
  type Session,
  type Registration,
  type FormationMaterial,
  SENIORITY_LEVELS,
} from "@shared/schema";
import { INSTRUCTOR_ROLES, InstructorRole, USER_ROLES, isInstructor } from "@shared/roles";
import { z } from "zod";
import { randomUUID } from "crypto";

const PgSession = connectPgSimple(session);

const COACH_VALIDATION_SETTING_KEY = "coach_validation_only";

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIR_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

const TRAINING_MATERIAL_MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

const formationContentSchema = z.object({
  content: z.string().optional(),
});

const formationMaterialUploadSchema = z.object({
  title: z.string().min(1, "Le titre est obligatoire"),
  description: z.string().optional(),
  requiresEnrollment: z.boolean().optional(),
  fileName: z.string().min(1, "Le nom du fichier est obligatoire"),
  fileType: z.string().min(1, "Le type du fichier est obligatoire"),
  fileSize: z.number().min(1, "Le fichier est obligatoire"),
  fileData: z.string().min(1, "Le contenu du fichier est obligatoire"),
});

const attendanceTokenRequestSchema = z.object({
  expiresInMinutes: z.number().min(5).max(480).optional(),
});

const attendanceSignSchema = z.object({
  token: z.string().min(1, "Le jeton est obligatoire"),
});

const sanitizeMaterial = (material: FormationMaterial) => ({
  id: material.id,
  formationId: material.formationId,
  title: material.title,
  description: material.description,
  fileName: material.fileName,
  fileType: material.fileType,
  fileSize: material.fileSize,
  requiresEnrollment: material.requiresEnrollment ?? true,
  createdAt: material.createdAt,
  createdBy: material.createdBy,
});

const canManageFormation = async (user: User | undefined, formationId: string) => {
  if (!user) return false;
  if (user.roles.includes("rh")) return true;
  if (!isInstructor(user.roles)) return false;

  const instructorFormations = await storage.getInstructorFormations(user.id);
  if (instructorFormations.includes(formationId)) {
    return true;
  }

  const instructorSessions = await storage.getSessionsByInstructor(user.id);
  return instructorSessions.some((session) => session.formationId === formationId);
};

const canManageSession = async (user: User | undefined, session: Session | undefined) => {
  if (!user || !session) return false;
  if (user.roles.includes("rh")) return true;
  if (!isInstructor(user.roles)) return false;
  if (session.instructorId === user.id) return true;
  return canManageFormation(user, session.formationId);
};

const userHasActiveRegistration = async (userId: string, formationId: string) => {
  const registrations = await storage.listRegistrations(userId);
  return registrations.some(
    (registration) =>
      registration.formationId === formationId &&
      registration.status !== "cancelled"
  );
};

const decodeXmlEntities = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const normalizeHeaderKey = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const columnLettersToIndex = (letters: string): number => {
  let index = 0;
  for (let i = 0; i < letters.length; i++) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
};

const extractZipEntries = (buffer: Buffer): Map<string, Buffer> => {
  const entries = new Map<string, Buffer>();

  let endOfCentralDirOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === ZIP_END_OF_CENTRAL_DIR_SIGNATURE) {
      endOfCentralDirOffset = i;
      break;
    }
  }

  if (endOfCentralDirOffset === -1) {
    throw new Error("Archive ZIP invalide ou corrompue");
  }

  const centralDirectorySize = buffer.readUInt32LE(endOfCentralDirOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  let cursor = centralDirectoryOffset;
  while (cursor < centralDirectoryEnd) {
    const signature = buffer.readUInt32LE(cursor);
    if (signature !== ZIP_CENTRAL_DIR_SIGNATURE) {
      throw new Error("Entrée du répertoire central invalide dans l'archive ZIP");
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const fileCommentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer
      .slice(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;

    if (fileName.endsWith("/")) {
      continue;
    }

    const localHeaderSignature = buffer.readUInt32LE(localHeaderOffset);
    if (localHeaderSignature !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
      throw new Error("En-tête local invalide dans l'archive ZIP");
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const dataEnd = dataStart + compressedSize;
    const compressedData = buffer.slice(dataStart, dataEnd);

    let fileData: Buffer;
    if (compressionMethod === 0) {
      fileData = Buffer.from(compressedData);
    } else if (compressionMethod === 8) {
      fileData = inflateRawSync(compressedData);
    } else {
      continue;
    }

    entries.set(fileName, fileData);
  }

  return entries;
};

const parseSharedStrings = (xml: string): string[] => {
  const sharedStrings: string[] = [];
  const siRegex = /<si[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;

  while ((match = siRegex.exec(xml)) !== null) {
    const entry = match[1];
    const textMatches = entry.match(/<t[^>]*>([\s\S]*?)<\/t>/g);
    if (textMatches) {
      const text = textMatches
        .map((textMatch) => {
          const innerMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(textMatch);
          return innerMatch ? decodeXmlEntities(innerMatch[1]) : "";
        })
        .join("");
      sharedStrings.push(text);
    } else {
      sharedStrings.push("");
    }
  }

  return sharedStrings;
};

const parseWorksheet = (xml: string, sharedStrings: string[]): string[][] => {
  const rows: Record<number, Record<number, string>> = {};
  const cellRegex = /<c[^>]*r="([A-Z]+)(\d+)"[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g;
  let match: RegExpExecArray | null;

  while ((match = cellRegex.exec(xml)) !== null) {
    const columnLetters = match[1];
    const rowIndex = Number.parseInt(match[2], 10) - 1;
    const cellType = match[3] ?? "";
    const cellContent = match[4] ?? "";

    let rawValue = "";
    const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(cellContent);
    if (valueMatch) {
      rawValue = decodeXmlEntities(valueMatch[1].trim());
    } else {
      const inlineMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cellContent);
      if (inlineMatch) {
        rawValue = decodeXmlEntities(inlineMatch[1].trim());
      }
    }

    let value = rawValue;
    if (cellType === "s") {
      const index = Number(rawValue);
      if (!Number.isNaN(index) && sharedStrings[index]) {
        value = sharedStrings[index];
      }
    } else if (cellType === "b") {
      value = rawValue === "1" ? "TRUE" : "FALSE";
    }

    const columnIndex = columnLettersToIndex(columnLetters);
    if (!rows[rowIndex]) {
      rows[rowIndex] = {};
    }
    rows[rowIndex][columnIndex] = value;
  }

  const rowIndices = Object.keys(rows).map((key) => Number(key));
  if (rowIndices.length === 0) {
    return [];
  }

  const maxRowIndex = Math.max(...rowIndices);
  const result: string[][] = [];

  for (let rowIndex = 0; rowIndex <= maxRowIndex; rowIndex++) {
    const rowValues = rows[rowIndex] ?? {};
    const columnIndices = Object.keys(rowValues).map((key) => Number(key));
    const maxColumnIndex = columnIndices.length ? Math.max(...columnIndices) : -1;
    const rowArray: string[] = [];
    for (let columnIndex = 0; columnIndex <= maxColumnIndex; columnIndex++) {
      rowArray[columnIndex] = (rowValues as Record<number, string>)[columnIndex] ?? "";
    }
    result.push(rowArray);
  }

  return result;
};

const parseXlsxRows = (buffer: Buffer): Array<Record<string, string>> => {
  const entries = extractZipEntries(buffer);
  const worksheet = entries.get("xl/worksheets/sheet1.xml");

  if (!worksheet) {
    throw new Error("Feuille principale introuvable dans le fichier Excel");
  }

  const sharedStringsXml = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml.toString("utf8")) : [];
  const rows = parseWorksheet(worksheet.toString("utf8"), sharedStrings);

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeaderKey(header));
  const data: Array<Record<string, string>> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => !String(cell ?? "").trim())) {
      continue;
    }

    const entry: Record<string, string> = {};
    row.forEach((value, index) => {
      const key = headers[index];
      if (!key) return;
      entry[key] = String(value ?? "").trim();
    });
    data.push(entry);
  }

  return data;
};

const parseExcelDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric)) {
    const milliseconds = EXCEL_EPOCH + Math.round(numeric * 24 * 60 * 60 * 1000);
    const date = new Date(milliseconds);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return undefined;
};

const normalizeAccessValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const mapAccessValuesToRoles = (rawValue: string): string[] => {
  const values = rawValue
    .split(/[,;]/)
    .map((value) => normalizeAccessValue(value))
    .filter(Boolean);

  const roles = new Set<string>();

  for (const value of values) {
    if (value.includes("rh")) {
      roles.add("rh");
      roles.add("consultant");
    } else if (value.includes("coach")) {
      roles.add("coach");
      roles.add("consultant");
    } else if (value.includes("formateur_externe") || value.includes("formateur externe")) {
      roles.add("formateur_externe");
    } else if (value.includes("formateur")) {
      roles.add("formateur");
      roles.add("consultant");
    } else if (value.includes("manager")) {
      roles.add("manager");
      roles.add("consultant");
    } else if (value.includes("collaborateur") || value.includes("consultant")) {
      roles.add("consultant");
    }
  }

  if (roles.size === 0) {
    roles.add("consultant");
  }

  return Array.from(roles);
};

const generateTemporaryPassword = (): string => {
  return "Colombus 138";
};

type BulkUploadSummary = {
  createdCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
  createdUsers: Array<{ name: string; email: string; temporaryPassword: string }>;
};

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureFormationContentInfrastructure();

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

  const createNotification = async (notification: InsertNotification) => {
    try {
      await storage.createNotification(notification);
    } catch (error) {
      console.error("Failed to create notification", error);
    }
  };

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Accept either 'role' (string) or 'roles' (array) from the form
      const inputData = req.body;
      
      // Convert single role to roles array with business rules
      if (inputData.role && !inputData.roles) {
        const role = inputData.role;

        // Apply business rules
        if (role === "rh") {
          inputData.roles = ["consultant", "rh"]; // Un RH est forcément consultant
        } else if (role === "manager") {
          inputData.roles = ["consultant", "manager"]; // Un manager est aussi consultant
        } else if (role === "formateur_externe") {
          return res.status(403).json({
            message: "Le rôle de formateur externe doit être créé par l'équipe RH",
          });
        } else {
          inputData.roles = [role]; // consultant or formateur
        }

        delete inputData.role; // Remove single role field
      }

      if (Array.isArray(inputData.roles)) {
        const hasExternalInstructor = inputData.roles.some(
          (role: string) => role === "formateur_externe"
        );
        if (hasExternalInstructor) {
          return res.status(403).json({
            message: "Le rôle de formateur externe doit être créé par l'équipe RH",
          });
        }
      }

      const validationSchema = insertUserSchema.extend({
        password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
      });
      const data = validationSchema.parse(inputData);

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

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const notifications = await storage.listNotifications(userId);
      const counts = await storage.getUnreadNotificationCounts(userId);
      const unreadCounts = counts.reduce<Record<string, number>>((acc, current) => {
        const count = typeof current.count === "number" ? current.count : Number(current.count) || 0;
        acc[current.route] = count;
        return acc;
      }, {});
      const totalUnread = counts.reduce((sum, current) => {
        const count = typeof current.count === "number" ? current.count : Number(current.count) || 0;
        return sum + count;
      }, 0);

      res.json({ notifications, unreadCounts, totalUnread });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/read", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const schema = z
        .object({
          notificationIds: z.array(z.string()).optional(),
          route: z.string().optional(),
        })
        .refine(
          (data) => (data.notificationIds && data.notificationIds.length > 0) || !!data.route,
          "route or notificationIds must be provided"
        );

      const data = schema.parse(req.body);

      const updated = await storage.markNotificationsRead(userId, {
        notificationIds: data.notificationIds,
        route: data.route,
      });

      res.json({ updated });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/become-instructor", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already an instructor
      if (isInstructor(user.roles)) {
        return res.status(400).json({ message: "User is already an instructor" });
      }

      // Add formateur role
      const updatedRoles = [...user.roles, "formateur"];
      const updatedUser = await storage.updateUser(userId, { roles: updatedRoles });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users/resign-instructor", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is an instructor
      if (!isInstructor(user.roles)) {
        return res.status(400).json({ message: "User is not an instructor" });
      }

      // Check if instructor has assigned sessions
      const assignedSessions = await storage.getSessionsByInstructor(userId);
      if (assignedSessions.length > 0) {
        return res.status(400).json({ 
          message: "Cannot remove instructor role while sessions are assigned",
          sessionCount: assignedSessions.length
        });
      }

      // Remove formateur role
      const updatedRoles = user.roles.filter(
        (role) => !INSTRUCTOR_ROLES.includes(role as InstructorRole)
      );
      const updatedUser = await storage.updateUser(userId, { roles: updatedRoles });

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get instructor's formations
  app.get("/api/instructor/formations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      const formationIds = await storage.getInstructorFormations(userId);
      res.json(formationIds);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add formation to instructor
  app.post("/api/instructor/formations/:formationId", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      if (user.roles.includes("formateur_externe")) {
        return res.status(403).json({
          message: "Les formateurs externes ne peuvent pas modifier leurs formations assignées",
        });
      }

      const { formationId } = req.params;

      // Check if formation exists
      const formation = await storage.getFormation(formationId);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      const instructorFormation = await storage.addInstructorFormation(userId, formationId);
      res.status(201).json(instructorFormation);
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ message: "Formation already assigned to instructor" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Remove formation from instructor
  app.delete("/api/instructor/formations/:formationId", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      if (user.roles.includes("formateur_externe")) {
        return res.status(403).json({
          message: "Les formateurs externes ne peuvent pas modifier leurs formations assignées",
        });
      }

      const { formationId } = req.params;
      const success = await storage.removeInstructorFormation(userId, formationId);
      
      if (!success) {
        return res.status(404).json({ message: "Formation assignment not found" });
      }

      res.json({ message: "Formation removed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get instructor's availabilities
  app.get("/api/instructor/availabilities", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      const availabilities = await storage.listInstructorAvailabilities(userId);
      res.json(availabilities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get availability for specific formation
  app.get("/api/instructor/availabilities/:formationId", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      const { formationId } = req.params;
      const availability = await storage.getInstructorAvailability(userId, formationId);
      
      if (!availability) {
        return res.status(404).json({ message: "Availability not found" });
      }

      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create or update availability
  app.post("/api/instructor/availabilities", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      const { formationId, slots } = req.body;

      if (!formationId || !slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({ message: "formationId and slots array are required" });
      }

      // Check if formation exists
      const formation = await storage.getFormation(formationId);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      // Check if instructor teaches this formation
      const instructorFormations = await storage.getInstructorFormations(userId);
      if (!instructorFormations.includes(formationId)) {
        return res.status(403).json({ message: "You must be assigned to this formation first" });
      }

      // Validate slots
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to start of day
      
      for (const slot of slots) {
        if (!slot.date || !slot.timeSlot) {
          return res.status(400).json({ message: "Each slot must have a date and timeSlot" });
        }

        if (!['full_day', 'morning', 'afternoon'].includes(slot.timeSlot)) {
          return res.status(400).json({ message: "Invalid timeSlot value" });
        }

        // Check if date is in the future
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        if (slotDate < now) {
          return res.status(400).json({ message: "Cannot set availability for past dates" });
        }

        // Check if date is weekday (Monday-Friday)
        const dayOfWeek = slotDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          return res.status(400).json({ message: "Availability can only be set for weekdays (Monday-Friday)" });
        }
      }

      // Check if availability already exists
      const existing = await storage.getInstructorAvailability(userId, formationId);
      
      if (existing) {
        // Update existing availability
        const updated = await storage.updateInstructorAvailability(userId, formationId, slots);
        res.json(updated);
      } else {
        // Create new availability
        const availability = await storage.createInstructorAvailability({
          instructorId: userId,
          formationId,
          slots
        });
        res.status(201).json(availability);
      }
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(400).json({ message: "Availability already exists for this formation" });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Delete availability
  app.delete("/api/instructor/availabilities/:formationId", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !isInstructor(user.roles)) {
        return res.status(403).json({ message: "Unauthorized - instructor role required" });
      }

      const { formationId } = req.params;
      const success = await storage.deleteInstructorAvailability(userId, formationId);
      
      if (!success) {
        return res.status(404).json({ message: "Availability not found" });
      }

      res.json({ message: "Availability deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all instructor-formation assignments (RH only)
  app.get("/api/admin/instructor-formations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignments = await storage.getAllInstructorFormations();
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all instructor availabilities (RH only)
  app.get("/api/admin/availabilities", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const availabilities = await storage.getAllInstructorAvailabilities();
      res.json(availabilities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const createManagedUserSchema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("Email invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    roles: z
      .array(z.enum(USER_ROLES))
      .nonempty("Au moins un rôle est requis"),
    businessUnit: z.string().optional(),
    seniority: z.enum(SENIORITY_LEVELS).optional(),
    employeeId: z.string().optional(),
    hireDate: z.string().optional(),
    grade: z.string().optional(),
    jobRole: z.string().optional(),
  });

  const updateOwnProfileSchema = z
    .object({
      firstName: z.string().min(1, "Le prénom est requis"),
      lastName: z.string().min(1, "Le nom est requis"),
      email: z.string().email("Email invalide"),
      employeeId: z.string().optional(),
      hireDate: z.string().optional(),
      grade: z.string().optional(),
      jobRole: z.string().optional(),
      businessUnit: z.string().optional(),
      currentPassword: z.string().optional(),
      newPassword: z
        .string()
        .min(6, "Le mot de passe doit contenir au moins 6 caractères")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.newPassword && !data.currentPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentPassword"],
          message: "Le mot de passe actuel est requis pour le modifier",
        });
      }
    });

  const coachAssignmentSchema = z
    .object({
      coachId: z.string().min(1, "Le coach est requis"),
      coacheeId: z.string().min(1, "Le coaché est requis"),
    })
    .refine((data) => data.coachId !== data.coacheeId, {
      message: "Un coach ne peut pas être son propre coaché",
      path: ["coacheeId"],
    });

  const coachValidationSettingSchema = z.object({
    coachValidationOnly: z.boolean(),
  });

  // Get all users (RH only)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const archived = req.query.archived === "true";
      const users = await storage.listUsers(archived);
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a managed user (RH only)
  app.post("/api/admin/users", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const parsed = createManagedUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(parsed.email);
      if (existingUser) {
        return res.status(409).json({ message: "Un utilisateur avec cet email existe déjà" });
      }

      const normalizedRoles = Array.from(
        new Set(
          parsed.roles.flatMap((role) => {
            if (role === "rh" || role === "manager") {
              return [role, "consultant"] as const;
            }
            return [role];
          })
        )
      );

      let hireDate: Date | undefined;
      if (parsed.hireDate) {
        const parsedDate = new Date(parsed.hireDate);
        if (!Number.isNaN(parsedDate.getTime())) {
          hireDate = parsedDate;
        }
      }

      const grade = parsed.grade?.trim() ? parsed.grade.trim() : undefined;
      const jobRole = parsed.jobRole?.trim() ? parsed.jobRole.trim() : undefined;
      const employeeId = parsed.employeeId?.trim() ? parsed.employeeId.trim() : undefined;
      const businessUnit = parsed.businessUnit?.trim() ? parsed.businessUnit.trim() : undefined;
      const seniority = parsed.seniority?.trim() ? parsed.seniority.trim() : grade;

      const createdUser = await storage.createUser({
        name: parsed.name,
        email: parsed.email,
        password: parsed.password,
        roles: normalizedRoles,
        businessUnit,
        seniority,
        employeeId,
        hireDate,
        grade,
        jobRole,
        archived: false,
        p1Used: 0,
        p2Used: 0,
      });

      const { password: _, ...userWithoutPassword } = createdUser;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parsed = updateOwnProfileSchema.parse(req.body);

      const updates: Partial<InsertUser> = {
        name: `${parsed.firstName.trim()} ${parsed.lastName.trim()}`.trim(),
        email: parsed.email.trim(),
      };

      updates.employeeId = parsed.employeeId?.trim()
        ? parsed.employeeId.trim()
        : (null as any);
      updates.grade = parsed.grade?.trim() ? parsed.grade.trim() : (null as any);
      updates.jobRole = parsed.jobRole?.trim() ? parsed.jobRole.trim() : (null as any);
      updates.businessUnit = parsed.businessUnit?.trim()
        ? parsed.businessUnit.trim()
        : (null as any);

      if (parsed.hireDate?.trim()) {
        const parsedDate = new Date(parsed.hireDate.trim());
        if (!Number.isNaN(parsedDate.getTime())) {
          updates.hireDate = parsedDate;
        }
      } else {
        updates.hireDate = null as any;
      }

      const newPassword = parsed.newPassword?.trim();
      if (newPassword) {
        if (user.password !== parsed.currentPassword?.trim()) {
          return res.status(400).json({ message: "Le mot de passe actuel est incorrect" });
        }
        updates.password = newPassword;
      }

      const updatedUser = await storage.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/users/bulk-upload", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { fileContent } = req.body ?? {};
      if (!fileContent || typeof fileContent !== "string") {
        return res.status(400).json({ message: "Fichier manquant ou invalide" });
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(fileContent, "base64");
      } catch (error) {
        return res.status(400).json({ message: "Impossible de décoder le fichier fourni" });
      }

      let rows: Array<Record<string, string>>;
      try {
        rows = parseXlsxRows(buffer);
      } catch (error: any) {
        return res
          .status(400)
          .json({ message: error?.message || "Le fichier Excel est invalide ou ne peut pas être analysé." });
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: "Le fichier ne contient aucune donnée exploitable." });
      }

      const activeUsers = await storage.listUsers(false);
      const archivedUsers = await storage.listUsers(true);

      const knownEmails = new Set<string>();
      const knownEmployeeIds = new Set<string>();

      [...activeUsers, ...archivedUsers].forEach((existing) => {
        knownEmails.add(existing.email.toLowerCase());
        if (existing.employeeId) {
          knownEmployeeIds.add(existing.employeeId.toLowerCase());
        }
      });

      const result: BulkUploadSummary = {
        createdCount: 0,
        skippedCount: 0,
        errors: [],
        createdUsers: [],
      };

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowNumber = index + 2;

        const lastName = (row["nom"] ?? row["name"] ?? "").trim();
        const firstName = (row["prenom"] ?? row["prénom"] ?? "").trim();
        const emailRaw = (row["email"] ?? "").trim();
        const accessRaw = (row["type_d_acces"] ?? row["type_dacces"] ?? "").trim();
        const employeeId = (row["matricule"] ?? "").trim();
        const grade = (row["grade"] ?? "").trim();
        const jobRole = (row["role"] ?? "").trim();
        const businessUnit = (row["business_unit"] ?? "").trim();
        const hireDateValue = row["date_d_entree"] ?? row["date_entree"] ?? row["date_dentree"] ?? "";

        if (!lastName || !firstName || !emailRaw || !accessRaw) {
          result.skippedCount += 1;
          result.errors.push({
            row: rowNumber,
            message: "Colonnes obligatoires manquantes (nom, prénom, email ou type d'accès).",
          });
          continue;
        }

        const normalizedEmail = emailRaw.toLowerCase();
        if (!emailRaw.includes("@")) {
          result.skippedCount += 1;
          result.errors.push({ row: rowNumber, message: "Adresse email invalide." });
          continue;
        }

        if (knownEmails.has(normalizedEmail)) {
          result.skippedCount += 1;
          result.errors.push({
            row: rowNumber,
            message: `Un compte existe déjà avec l'email ${emailRaw}.`,
          });
          continue;
        }

        if (employeeId && knownEmployeeIds.has(employeeId.toLowerCase())) {
          result.skippedCount += 1;
          result.errors.push({
            row: rowNumber,
            message: `Le matricule ${employeeId} est déjà utilisé.`,
          });
          continue;
        }

        const roles = mapAccessValuesToRoles(accessRaw);
        const hireDate = parseExcelDate(hireDateValue);

        try {
          const temporaryPassword = generateTemporaryPassword();
          const createdUser = await storage.createUser({
            name: `${firstName} ${lastName}`.trim(),
            email: emailRaw,
            password: temporaryPassword,
            roles,
            employeeId: employeeId || undefined,
            hireDate,
            grade: grade || undefined,
            jobRole: jobRole || undefined,
            businessUnit: businessUnit || undefined,
            seniority: grade || undefined,
            archived: false,
            p1Used: 0,
            p2Used: 0,
          });

          knownEmails.add(normalizedEmail);
          if (employeeId) {
            knownEmployeeIds.add(employeeId.toLowerCase());
          }

          result.createdCount += 1;
          result.createdUsers.push({
            name: createdUser.name,
            email: createdUser.email,
            temporaryPassword,
          });
        } catch (error: any) {
          result.skippedCount += 1;
          result.errors.push({
            row: rowNumber,
            message: error?.message || "Erreur lors de la création du collaborateur.",
          });
        }
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Archive a consultant (RH only)
  app.patch("/api/users/:id/archive", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const interests = await storage.listFormationInterests({ userId: req.params.id });
      await Promise.all(interests.map((interest) => storage.deleteFormationInterest(interest.id)));

      const registrations = await storage.listRegistrations(req.params.id);
      await Promise.all(registrations.map((registration) => storage.deleteRegistration(registration.id)));

      await storage.updateUser(req.params.id, {
        archived: true,
        p1Used: 0,
        p2Used: 0,
      });

      res.json({ message: "User archived successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a consultant permanently (RH only)
  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete all intentions
      const interests = await storage.listFormationInterests({ userId: req.params.id });
      for (const interest of interests) {
        await storage.deleteFormationInterest(interest.id);
      }

      // Delete all registrations
      const registrations = await storage.listRegistrations(req.params.id);
      for (const registration of registrations) {
        await storage.deleteRegistration(registration.id);
      }

      // Delete the user
      await storage.deleteUser(req.params.id);

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a managed user details with assigned formations (RH only)
  app.get("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get assigned formations for this instructor
      const formationIds = await storage.getInstructorFormations(req.params.id);

      const { password, ...userWithoutPassword } = targetUser;
      res.json({ user: { ...userWithoutPassword, formationIds } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update a managed user (RH only)
  app.patch("/api/admin/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Extract formationIds if present (for external instructors)
      const { formationIds, ...updateData } = req.body;

      if (Array.isArray(updateData.roles)) {
        const hadCoachRole = targetUser.roles.includes("coach");
        let normalizedRoles = Array.from(new Set(updateData.roles as string[]));

        if (normalizedRoles.includes("rh") || normalizedRoles.includes("manager")) {
          if (!normalizedRoles.includes("consultant")) {
            normalizedRoles.push("consultant");
          }
        }

        if (normalizedRoles.includes("coach") && !normalizedRoles.includes("consultant")) {
          normalizedRoles.push("consultant");
        }

        updateData.roles = normalizedRoles;

        const wantsCoachRole = normalizedRoles.includes("coach");
        if (hadCoachRole && !wantsCoachRole) {
          await storage.deleteCoachAssignmentsForCoach(targetUser.id);
        }
      }

      // Update user basic info
      const updatedUser = await storage.updateUser(req.params.id, updateData);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // If formationIds is provided, update instructor formations
      if (formationIds !== undefined && Array.isArray(formationIds)) {
        await storage.replaceInstructorFormations(req.params.id, formationIds);
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/coach-assignments", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignments = await storage.listCoachAssignments();
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/coach-assignments", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const data = coachAssignmentSchema.parse(req.body);

      const coach = await storage.getUser(data.coachId);
      if (!coach || !coach.roles.includes("coach")) {
        return res.status(400).json({ message: "L'utilisateur sélectionné n'est pas coach" });
      }

      const coachee = await storage.getUser(data.coacheeId);
      if (!coachee || !coachee.roles.includes("consultant")) {
        return res.status(400).json({ message: "Le coaché doit être un consultant actif" });
      }

      if (coachee.archived) {
        return res.status(400).json({ message: "Impossible d'assigner un coach à un consultant archivé" });
      }

      const assignment = await storage.createCoachAssignment({
        coachId: data.coachId,
        coacheeId: data.coacheeId,
      });

      res.json(assignment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/coach-assignments/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignment = await storage.getCoachAssignment(req.params.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      await storage.deleteCoachAssignment(req.params.id);
      res.json({ message: "Assignment deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(
    "/api/admin/settings/coach-validation",
    requireAuth,
    async (req, res) => {
      try {
        const userId = (req as AuthRequest).userId!;
        const user = await storage.getUser(userId);

        if (!user || !user.roles.includes("rh")) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const value = await storage.getSetting<boolean>(COACH_VALIDATION_SETTING_KEY);
        res.json({ coachValidationOnly: Boolean(value) });
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  app.patch(
    "/api/admin/settings/coach-validation",
    requireAuth,
    async (req, res) => {
      try {
        const userId = (req as AuthRequest).userId!;
        const user = await storage.getUser(userId);

        if (!user || !user.roles.includes("rh")) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const data = coachValidationSettingSchema.parse(req.body);
        await storage.setSetting(COACH_VALIDATION_SETTING_KEY, data.coachValidationOnly);

        res.json({ coachValidationOnly: data.coachValidationOnly });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Données invalides", errors: error.errors });
        }
        res.status(500).json({ message: error.message });
      }
    }
  );

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

  app.post("/api/formations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const validationSchema = insertFormationSchema;
      const data = validationSchema.parse(req.body);
      
      const formation = await storage.createFormation(data);
      res.status(201).json(formation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/formations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      const updated = await storage.updateFormation(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/formations/:id/content", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation non trouvée" });
      }

      const canManage = await canManageFormation(user, formation.id);
      if (!canManage) {
        return res.status(403).json({ message: "Action réservée au formateur ou aux RH" });
      }

      const data = formationContentSchema.parse(req.body ?? {});

      const updated = await storage.updateFormation(formation.id, {
        content: data.content ?? null,
      });

      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/formations/:id/materials", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation non trouvée" });
      }

      const managesFormation = await canManageFormation(user, formation.id);

      if (!managesFormation) {
        const hasRegistration = await userHasActiveRegistration(user.id, formation.id);
        if (!hasRegistration) {
          return res
            .status(403)
            .json({ message: "L'accès aux ressources est réservé aux inscrits" });
        }
      }

      const materials = await storage.listFormationMaterials(formation.id);
      res.json(materials.map(sanitizeMaterial));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/formations/:id/materials", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation non trouvée" });
      }

      const canManage = await canManageFormation(user, formation.id);
      if (!canManage) {
        return res.status(403).json({ message: "Action réservée au formateur ou aux RH" });
      }

      const data = formationMaterialUploadSchema.parse(req.body ?? {});

      if (data.fileSize > TRAINING_MATERIAL_MAX_SIZE) {
        return res
          .status(400)
          .json({ message: "Le fichier dépasse la taille maximale autorisée (10 Mo)" });
      }

      let fileBuffer: Buffer;
      try {
        fileBuffer = Buffer.from(data.fileData, "base64");
      } catch (_error) {
        return res.status(400).json({ message: "Le contenu du fichier est invalide" });
      }

      if (fileBuffer.length === 0) {
        return res.status(400).json({ message: "Le fichier est vide" });
      }

      if (fileBuffer.length > TRAINING_MATERIAL_MAX_SIZE) {
        return res
          .status(400)
          .json({ message: "Le fichier dépasse la taille maximale autorisée (10 Mo)" });
      }

      const material = await storage.createFormationMaterial({
        formationId: formation.id,
        title: data.title,
        description: data.description,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: fileBuffer.length,
        fileData: fileBuffer,
        requiresEnrollment: data.requiresEnrollment ?? true,
        createdBy: user.id,
      });

      res.status(201).json(sanitizeMaterial(material));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/formations/:id/materials/:materialId", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const material = await storage.getFormationMaterial(req.params.materialId);
      if (!material || material.formationId !== req.params.id) {
        return res.status(404).json({ message: "Ressource introuvable" });
      }

      const canManage = await canManageFormation(user, material.formationId);
      if (!canManage) {
        return res.status(403).json({ message: "Action réservée au formateur ou aux RH" });
      }

      await storage.deleteFormationMaterial(material.id);
      res.json({ message: "Ressource supprimée" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get(
    "/api/formations/:id/materials/:materialId/download",
    requireAuth,
    async (req, res) => {
      try {
        const userId = (req as AuthRequest).userId!;
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(401).json({ message: "Utilisateur introuvable" });
        }

        const material = await storage.getFormationMaterial(req.params.materialId);
        if (!material || material.formationId !== req.params.id) {
          return res.status(404).json({ message: "Ressource introuvable" });
        }

        const formation = await storage.getFormation(material.formationId);
        if (!formation) {
          return res.status(404).json({ message: "Formation non trouvée" });
        }

        const managesFormation = await canManageFormation(user, formation.id);

        if (!managesFormation) {
          const hasRegistration = await userHasActiveRegistration(user.id, formation.id);
          if (!hasRegistration) {
            return res
              .status(403)
              .json({ message: "Téléchargement réservé aux stagiaires inscrits" });
          }
        }

        res.setHeader("Content-Type", material.fileType || "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${encodeURI(material.fileName)}"`
        );
        res.send(material.fileData);
      } catch (error: any) {
        res.status(500).json({ message: error.message });
      }
    }
  );

  app.delete("/api/formations/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const formation = await storage.getFormation(req.params.id);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      await storage.deleteFormation(req.params.id);
      res.json({ message: "Formation deleted successfully" });
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

  app.get("/api/sessions/:id/attendees", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session non trouvée" });
      }

      const canManage = await canManageSession(user, session);
      if (!canManage) {
        return res.status(403).json({ message: "Accès réservé au formateur ou aux RH" });
      }

      const registrations = await storage.listRegistrations(undefined, session.id);
      const userIds = Array.from(new Set(registrations.map((registration) => registration.userId)));
      const attendees = await storage.listUsersByIds(userIds);
      const attendeesById = new Map(attendees.map((attendee) => [attendee.id, attendee]));

      const payload = registrations.map((registration) => {
        const attendee = attendeesById.get(registration.userId);
        return {
          registrationId: registration.id,
          userId: registration.userId,
          status: registration.status,
          attended: registration.attended,
          attendanceSignedAt: registration.attendanceSignedAt,
          registeredAt: registration.registeredAt,
          priority: registration.priority,
          formationId: registration.formationId,
          sessionId: registration.sessionId,
          user: attendee
            ? {
                id: attendee.id,
                name: attendee.name,
                email: attendee.email,
                roles: attendee.roles,
              }
            : null,
        };
      });

      res.json(payload);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const validationSchema = insertSessionSchema;
      const data = validationSchema.parse(req.body);

      const session = await storage.createSession(data);

      try {
        const formation = await storage.getFormation(data.formationId);
        const interests = await storage.listFormationInterests({ formationId: data.formationId });
        const interestedUsers = interests.filter(
          (interest) => interest.status === "approved" || interest.status === "converted"
        );

        if (interestedUsers.length > 0) {
          const message = `Une nouvelle session pour ${formation?.title ?? "votre formation"} est disponible.`;
          await Promise.all(
            interestedUsers.map((interest) =>
              createNotification({
                userId: interest.userId,
                route: "/",
                title: "Nouvelle session disponible",
                message,
              })
            )
          );
        }
      } catch (notificationError) {
        console.error("Failed to notify consultants about new session", notificationError);
      }

      res.status(201).json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/sessions/:id/attendance-token", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session non trouvée" });
      }

      const canManage = await canManageSession(user, session);
      if (!canManage) {
        return res.status(403).json({ message: "Action réservée au formateur ou aux RH" });
      }

      await storage.cleanupExpiredAttendanceTokens(new Date());

      const { expiresInMinutes } = attendanceTokenRequestSchema.parse(req.body ?? {});
      const durationMinutes = expiresInMinutes ?? 60;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      const tokenValue = randomUUID();

      const token = await storage.createSessionAttendanceToken({
        sessionId: session.id,
        token: tokenValue,
        expiresAt,
        createdBy: user.id,
      });

      res.status(201).json({
        token: token.token,
        expiresAt: token.expiresAt,
        sessionId: token.sessionId,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/attendance/sign", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }

      const data = attendanceSignSchema.parse(req.body ?? {});
      const token = await storage.getSessionAttendanceToken(data.token);

      if (!token) {
        return res.status(404).json({ message: "Jeton de présence invalide" });
      }

      if (token.expiresAt.getTime() < Date.now()) {
        await storage.deleteSessionAttendanceToken(token.id);
        return res.status(410).json({ message: "Le QR Code a expiré" });
      }

      const session = await storage.getSession(token.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session non trouvée" });
      }

      const registration = await storage.getRegistrationByUserAndSession(user.id, session.id);

      if (!registration || registration.status === "cancelled") {
        return res.status(403).json({ message: "Vous n'êtes pas inscrit à cette session" });
      }

      const now = new Date();
      await storage.markRegistrationAttendance(registration.id, {
        attended: true,
        attendanceSignedAt: now,
      });

      res.json({
        message: "Présence enregistrée",
        sessionId: session.id,
        attendanceSignedAt: now,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await storage.updateSession(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      await storage.deleteSession(req.params.id);
      res.json({ message: "Session deleted successfully" });
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

      try {
        const rhUsers = (await storage.listUsers(false)).filter((candidate) =>
          candidate.roles.includes("rh")
        );
        if (rhUsers.length > 0) {
          const message = `${user.name} a exprimé une intention pour ${formation.title}.`;
          await Promise.all(
            rhUsers.map((rhUser) =>
              createNotification({
                userId: rhUser.id,
                route: "/interests",
                title: "Nouvelle intention à valider",
                message,
              })
            )
          );
        }
      } catch (notificationError) {
        console.error("Failed to notify RH about new interest", notificationError);
      }

      try {
        const coachAssignments = await storage.listCoachAssignmentsForCoachee(userId);
        if (coachAssignments.length > 0) {
          const coachIds = coachAssignments.map((assignment) => assignment.coachId);
          const coaches = await storage.listUsersByIds(coachIds);
          const message = `${user.name} a exprimé une intention pour ${formation.title}.`;
          await Promise.all(
            coaches
              .filter((coachUser) => coachUser.roles.includes("coach"))
              .map((coachUser) =>
                createNotification({
                  userId: coachUser.id,
                  route: "/coach",
                  title: "Nouvelle intention à valider",
                  message,
                })
              )
          );
        }
      } catch (coachNotificationError) {
        console.error("Failed to notify coaches about new interest", coachNotificationError);
      }

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
      if (req.body.status === "approved" || req.body.status === "rejected" || req.body.status === "converted") {
        if (!user.roles.includes("rh")) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      } else if (interest.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const coachValidationOnly = Boolean(
        await storage.getSetting<boolean>(COACH_VALIDATION_SETTING_KEY)
      );

      const updates: Partial<FormationInterest> = { ...req.body };

      if (updates.status === "approved" && !coachValidationOnly) {
        if (interest.coachStatus !== "approved") {
          return res.status(400).json({
            message: "L'intention doit être validée par le coach avant la validation RH",
          });
        }
      }

      if (updates.status === "approved" && interest.coachStatus !== "approved") {
        updates.coachStatus = "approved";
      }

      if (updates.status === "withdrawn") {
        if (!user.roles.includes("rh")) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        if (interest.status !== "approved" && interest.status !== "converted") {
          return res.status(400).json({
            message: "Seules les intentions validées ou converties peuvent être annulées",
          });
        }

        const registrations = await storage.listRegistrations(interest.userId);
        const now = new Date();
        let hasPastRegistrations = false;

        for (const registration of registrations) {
          if (registration.formationId !== interest.formationId) continue;
          const session = await storage.getSession(registration.sessionId);
          if (!session) continue;

          if (session.endDate.getTime() > now.getTime() && registration.status !== "completed") {
            await storage.deleteRegistration(registration.id);
          } else {
            hasPastRegistrations = true;
          }
        }

        if (!hasPastRegistrations) {
          const interestOwner = await storage.getUser(interest.userId);
          if (interestOwner) {
            if (interest.priority === "P1" && (interestOwner.p1Used || 0) > 0) {
              await storage.updateUser(interest.userId, { p1Used: (interestOwner.p1Used || 0) - 1 });
            } else if (interest.priority === "P2" && (interestOwner.p2Used || 0) > 0) {
              await storage.updateUser(interest.userId, { p2Used: (interestOwner.p2Used || 0) - 1 });
            }
          }
        }
      }

      // Refund quota if interest is being rejected
      if (
        updates.status === "rejected" &&
        (interest.status === "pending" || interest.status === "approved")
      ) {
        const interestOwner = await storage.getUser(interest.userId);
        if (interestOwner) {
          if (interest.priority === "P1" && (interestOwner.p1Used || 0) > 0) {
            await storage.updateUser(interest.userId, { p1Used: (interestOwner.p1Used || 0) - 1 });
          } else if (interest.priority === "P2" && (interestOwner.p2Used || 0) > 0) {
            await storage.updateUser(interest.userId, { p2Used: (interestOwner.p2Used || 0) - 1 });
          }
        }
        updates.coachStatus = "rejected";
      }

      const updated = await storage.updateFormationInterest(req.params.id, updates);

      if (updated && req.body.status && req.body.status !== interest.status) {
        const formation = await storage.getFormation(updated.formationId);
        const formationTitle = formation?.title ?? "votre formation";
        let title: string | null = null;
        let message: string | undefined;

        if (req.body.status === "approved") {
          title = "Intention validée";
          message = `Votre intention pour ${formationTitle} a été validée par les RH.`;
        } else if (req.body.status === "converted") {
          title = "Session planifiée";
          message = `Une nouvelle session est disponible pour ${formationTitle}.`;
        } else if (req.body.status === "rejected") {
          title = "Intention refusée";
          message = `Votre intention pour ${formationTitle} a été refusée.`;
        } else if (req.body.status === "withdrawn") {
          title = "Intention annulée";
          message = `Votre intention pour ${formationTitle} a été annulée par les RH.`;
        }

        if (title) {
          await createNotification({
            userId: updated.userId,
            route: "/",
            title,
            message,
          });
        }
      }

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

  app.get("/api/coach/overview", requireAuth, async (req, res) => {
    try {
      const coachId = (req as AuthRequest).userId!;
      const coach = await storage.getUser(coachId);

      if (!coach || !coach.roles.includes("coach")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const assignments = await storage.listCoachAssignmentsForCoach(coachId);
      const coacheeIds = assignments.map((assignment) => assignment.coacheeId);

      const coachees = await storage.listUsersByIds(coacheeIds);
      const coacheesWithoutPasswords = coachees.map(({ password, ...rest }) => rest);

      const interests = coacheeIds.length
        ? (
            await Promise.all(
              coacheeIds.map((coacheeId) =>
                storage.listFormationInterests({ userId: coacheeId })
              )
            )
          ).flat()
        : [];

      const registrations = await storage.listRegistrationsForUsers(coacheeIds);
      const coachValidationOnly = Boolean(
        await storage.getSetting<boolean>(COACH_VALIDATION_SETTING_KEY)
      );

      res.json({
        assignments,
        coachees: coacheesWithoutPasswords,
        interests,
        registrations,
        settings: { coachValidationOnly },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/coach/interests/:id/approve", requireAuth, async (req, res) => {
    try {
      const coachId = (req as AuthRequest).userId!;
      const coach = await storage.getUser(coachId);

      if (!coach || !coach.roles.includes("coach")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const interest = await storage.getFormationInterest(req.params.id);
      if (!interest) {
        return res.status(404).json({ message: "Interest not found" });
      }

      const assignments = await storage.listCoachAssignmentsForCoachee(interest.userId);
      const isAssignedCoach = assignments.some((assignment) => assignment.coachId === coachId);
      if (!isAssignedCoach) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (interest.status === "rejected" || interest.status === "withdrawn") {
        return res.status(400).json({ message: "Cette intention n'est plus active" });
      }

      const coachValidationOnly = Boolean(
        await storage.getSetting<boolean>(COACH_VALIDATION_SETTING_KEY)
      );

      const updates: Partial<FormationInterest> = {
        coachStatus: "approved",
        coachId,
        coachValidatedAt: new Date(),
      };

      if (coachValidationOnly && interest.status !== "approved") {
        updates.status = "approved";
      }

      const updated = await storage.updateFormationInterest(interest.id, updates);

      if (!updated) {
        return res.status(500).json({ message: "Failed to update interest" });
      }

      const formation = await storage.getFormation(updated.formationId);
      const coachee = await storage.getUser(updated.userId);
      const formationTitle = formation?.title ?? "votre formation";

      if (coachValidationOnly) {
        await createNotification({
          userId: updated.userId,
          route: "/",
          title: "Intention validée",
          message: `Votre coach ${coach.name} a validé votre intention pour ${formationTitle}.`,
        });
      } else {
        await createNotification({
          userId: updated.userId,
          route: "/interests",
          title: "Validation coach en attente RH",
          message: `Votre coach ${coach.name} a validé votre intention pour ${formationTitle}. Elle reste en attente de validation RH.`,
        });

        try {
          const rhUsers = (await storage.listUsers(false)).filter((candidate) =>
            candidate.roles.includes("rh")
          );
          const coacheeName = coachee?.name ?? "Un consultant";
          const rhMessage = `${coacheeName} a une intention validée par ${coach.name} pour ${formationTitle}.`;
          await Promise.all(
            rhUsers.map((rhUser) =>
              createNotification({
                userId: rhUser.id,
                route: "/interests",
                title: "Validation coach reçue",
                message: rhMessage,
              })
            )
          );
        } catch (notificationError) {
          console.error("Failed to notify RH about coach approval", notificationError);
        }
      }

      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/coach/interests/:id/reject", requireAuth, async (req, res) => {
    try {
      const coachId = (req as AuthRequest).userId!;
      const coach = await storage.getUser(coachId);

      if (!coach || !coach.roles.includes("coach")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const interest = await storage.getFormationInterest(req.params.id);
      if (!interest) {
        return res.status(404).json({ message: "Interest not found" });
      }

      const assignments = await storage.listCoachAssignmentsForCoachee(interest.userId);
      const isAssignedCoach = assignments.some((assignment) => assignment.coachId === coachId);
      if (!isAssignedCoach) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (interest.status === "converted") {
        return res.status(400).json({ message: "Impossible de refuser une intention déjà convertie" });
      }

      if (interest.status === "rejected") {
        return res.status(400).json({ message: "Cette intention est déjà refusée" });
      }

      const coachee = await storage.getUser(interest.userId);
      if (coachee) {
        if (interest.priority === "P1" && (coachee.p1Used || 0) > 0) {
          await storage.updateUser(coachee.id, { p1Used: (coachee.p1Used || 0) - 1 });
        } else if (interest.priority === "P2" && (coachee.p2Used || 0) > 0) {
          await storage.updateUser(coachee.id, { p2Used: (coachee.p2Used || 0) - 1 });
        }
      }

      const updated = await storage.updateFormationInterest(interest.id, {
        status: "rejected",
        coachStatus: "rejected",
        coachId,
        coachValidatedAt: new Date(),
      });

      if (!updated) {
        return res.status(500).json({ message: "Failed to update interest" });
      }

      const formation = await storage.getFormation(updated.formationId);
      const formationTitle = formation?.title ?? "votre formation";

      await createNotification({
        userId: updated.userId,
        route: "/interests",
        title: "Intention refusée",
        message: `Votre coach ${coach.name} a refusé votre intention pour ${formationTitle}.`,
      });

      res.json(updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
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

  // Get all registrations (RH only)
  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const registrations = await storage.listAllRegistrations();
      res.json(registrations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/analytics", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const [usersList, registrations, sessionsList, formationsList, interestsList] = await Promise.all([
        storage.listUsers(false),
        storage.listAllRegistrations(),
        storage.listSessions(),
        storage.listFormations(false),
        storage.listFormationInterests(),
      ]);

      const activeConsultants = usersList.filter((u) => !u.archived && u.roles.includes("consultant"));
      const sessionMap = new Map(sessionsList.map((session) => [session.id, session]));
      const formationMap = new Map(formationsList.map((formation) => [formation.id, formation]));
      const userMap = new Map(usersList.map((item) => [item.id, item]));

      const createEmptyStatusCounts = () => ({
        pending: 0,
        validated: 0,
        completed: 0,
        cancelled: 0,
        refused: 0,
      });

      type StatusCounts = ReturnType<typeof createEmptyStatusCounts>;

      const byConsultant = activeConsultants.map((consultant) => {
        const consultantRegistrations = registrations.filter((registration) => registration.userId === consultant.id);
        const consultantRefusedInterests = interestsList.filter(
          (interest) => interest.userId === consultant.id && interest.status === "rejected",
        );

        const statusCounts: StatusCounts = createEmptyStatusCounts();
        consultantRegistrations.forEach((registration) => {
          if (registration.status in statusCounts) {
            statusCounts[registration.status as keyof StatusCounts] += 1;
          }
        });
        statusCounts.refused = consultantRefusedInterests.length;

        const completedRegistrations = consultantRegistrations.filter((registration) => registration.status === "completed");
        const attendedCompleted = completedRegistrations.filter((registration) => registration.attended);
        const absentCompleted = completedRegistrations.filter((registration) => registration.attended === false);

        let trainingHours = 0;
        let trainingDays = 0;
        attendedCompleted.forEach((registration) => {
          const session = sessionMap.get(registration.sessionId);
          if (!session) return;
          const durationMs = Math.max(0, session.endDate.getTime() - session.startDate.getTime());
          const hours = durationMs / (1000 * 60 * 60);
          const days = durationMs / (1000 * 60 * 60 * 24);
          trainingHours += hours;
          trainingDays += days;
        });

        const totalForPercentages =
          statusCounts.completed + statusCounts.cancelled + statusCounts.validated + statusCounts.refused;
        const statusPercentages = {
          pending: (() => {
            const total = totalForPercentages + statusCounts.pending;
            return total ? Number(((statusCounts.pending / total) * 100).toFixed(2)) : 0;
          })(),
          validated: totalForPercentages
            ? Number(((statusCounts.validated / totalForPercentages) * 100).toFixed(2))
            : 0,
          completed: totalForPercentages
            ? Number(((statusCounts.completed / totalForPercentages) * 100).toFixed(2))
            : 0,
          cancelled: totalForPercentages
            ? Number(((statusCounts.cancelled / totalForPercentages) * 100).toFixed(2))
            : 0,
          refused: totalForPercentages
            ? Number(((statusCounts.refused / totalForPercentages) * 100).toFixed(2))
            : 0,
        } satisfies Record<keyof StatusCounts, number>;

        return {
          userId: consultant.id,
          name: consultant.name,
          email: consultant.email,
          seniority: consultant.seniority || null,
          businessUnit: consultant.businessUnit || null,
          statusCounts,
          statusPercentages,
          absenteeismRate: completedRegistrations.length
            ? Number(((absentCompleted.length / completedRegistrations.length) * 100).toFixed(2))
            : 0,
          evaluationRate: completedRegistrations.length
            ? Number(((attendedCompleted.length / completedRegistrations.length) * 100).toFixed(2))
            : 0,
          totalTrainingHours: Number(trainingHours.toFixed(2)),
          totalTrainingDays: Number(trainingDays.toFixed(2)),
          refusedDetails: consultantRefusedInterests.map((interest) => ({
            interestId: interest.id,
            formationId: interest.formationId,
            formationTitle: formationMap.get(interest.formationId)?.title || "Formation inconnue",
            expressedAt: interest.expressedAt ? interest.expressedAt.toISOString() : null,
          })),
        };
      });

      const summaryStatusCounts = byConsultant.reduce<StatusCounts>((acc, consultant) => {
        acc.pending += consultant.statusCounts.pending;
        acc.validated += consultant.statusCounts.validated;
        acc.completed += consultant.statusCounts.completed;
        acc.cancelled += consultant.statusCounts.cancelled;
        acc.refused += consultant.statusCounts.refused;
        return acc;
      }, createEmptyStatusCounts());

      const completedRegistrationsGlobal = registrations.filter((registration) => registration.status === "completed");
      const globalAttended = completedRegistrationsGlobal.filter((registration) => registration.attended).length;
      const globalAbsent = completedRegistrationsGlobal.filter((registration) => registration.attended === false).length;
      const globalCompleted = completedRegistrationsGlobal.length;
      const globalTrainingHours = byConsultant.reduce((total, consultant) => total + consultant.totalTrainingHours, 0);
      const globalTrainingDays = byConsultant.reduce((total, consultant) => total + consultant.totalTrainingDays, 0);

      const totalForPercentages =
        summaryStatusCounts.completed +
        summaryStatusCounts.cancelled +
        summaryStatusCounts.validated +
        summaryStatusCounts.refused;

      const summaryPercentages = {
        pending: (() => {
          const total = totalForPercentages + summaryStatusCounts.pending;
          return total ? Number(((summaryStatusCounts.pending / total) * 100).toFixed(2)) : 0;
        })(),
        validated: totalForPercentages
          ? Number(((summaryStatusCounts.validated / totalForPercentages) * 100).toFixed(2))
          : 0,
        completed: totalForPercentages
          ? Number(((summaryStatusCounts.completed / totalForPercentages) * 100).toFixed(2))
          : 0,
        cancelled: totalForPercentages
          ? Number(((summaryStatusCounts.cancelled / totalForPercentages) * 100).toFixed(2))
          : 0,
        refused: totalForPercentages
          ? Number(((summaryStatusCounts.refused / totalForPercentages) * 100).toFixed(2))
          : 0,
      } satisfies Record<keyof StatusCounts, number>;

      const timeline = registrations.map((registration) => {
        const session = sessionMap.get(registration.sessionId);
        const formation = formationMap.get(registration.formationId);
        const consultant = userMap.get(registration.userId);
        const durationMs = session ? Math.max(0, session.endDate.getTime() - session.startDate.getTime()) : 0;

        return {
          recordType: "registration" as const,
          id: registration.id,
          consultantId: registration.userId,
          consultantName: consultant?.name || "Consultant inconnu",
          formationId: registration.formationId,
          formationTitle: formation?.title || "Formation inconnue",
          sessionId: registration.sessionId,
          sessionStartDate: session ? session.startDate.toISOString() : null,
          sessionEndDate: session ? session.endDate.toISOString() : null,
          status: registration.status,
          attended: registration.attended,
          priority: registration.priority,
          durationHours: Number((durationMs / (1000 * 60 * 60)).toFixed(2)),
          durationDays: Number((durationMs / (1000 * 60 * 60 * 24)).toFixed(2)),
          seniority: consultant?.seniority || null,
          businessUnit: consultant?.businessUnit || null,
        };
      });

      const refusedTimelineEntries = interestsList
        .filter((interest) => interest.status === "rejected")
        .map((interest) => {
          const consultant = userMap.get(interest.userId);
          const formation = formationMap.get(interest.formationId);
          return {
            recordType: "interest" as const,
            id: interest.id,
            consultantId: interest.userId,
            consultantName: consultant?.name || "Consultant inconnu",
            formationId: interest.formationId,
            formationTitle: formation?.title || "Formation inconnue",
            sessionId: null,
            sessionStartDate: interest.expressedAt ? interest.expressedAt.toISOString() : null,
            sessionEndDate: null,
            status: "refused" as const,
            attended: null,
            priority: interest.priority,
            durationHours: 0,
            durationDays: 0,
            seniority: consultant?.seniority || null,
            businessUnit: consultant?.businessUnit || null,
          };
        });

      const seniorityAggregates = new Map<
        string,
        {
          seniority: string;
          totalRegistrations: number;
          completedCount: number;
          refusedCount: number;
          totalTrainingHours: number;
          totalTrainingDays: number;
          consultantIds: Set<string>;
        }
      >();

      byConsultant.forEach((consultant) => {
        const key = consultant.seniority || "Non renseignée";
        if (!seniorityAggregates.has(key)) {
          seniorityAggregates.set(key, {
            seniority: key,
            totalRegistrations: 0,
            completedCount: 0,
            refusedCount: 0,
            totalTrainingHours: 0,
            totalTrainingDays: 0,
            consultantIds: new Set<string>(),
          });
        }
        const aggregate = seniorityAggregates.get(key)!;
        aggregate.consultantIds.add(consultant.userId);
        aggregate.totalRegistrations +=
          consultant.statusCounts.pending +
          consultant.statusCounts.validated +
          consultant.statusCounts.completed +
          consultant.statusCounts.cancelled;
        aggregate.completedCount += consultant.statusCounts.completed;
        aggregate.refusedCount += consultant.statusCounts.refused;
        aggregate.totalTrainingHours += consultant.totalTrainingHours;
        aggregate.totalTrainingDays += consultant.totalTrainingDays;
      });

      res.json({
        summary: {
          totalConsultants: activeConsultants.length,
          totalRegistrations: registrations.length,
          statusCounts: summaryStatusCounts,
          statusPercentages: summaryPercentages,
          absenteeismRate: globalCompleted
            ? Number(((globalAbsent / globalCompleted) * 100).toFixed(2))
            : 0,
          evaluationRate: globalCompleted
            ? Number(((globalAttended / globalCompleted) * 100).toFixed(2))
            : 0,
          totalTrainingHours: Number(globalTrainingHours.toFixed(2)),
          totalTrainingDays: Number(globalTrainingDays.toFixed(2)),
          lastUpdated: new Date().toISOString(),
        },
        byConsultant,
        bySeniority: Array.from(seniorityAggregates.values()).map((aggregate) => ({
          seniority: aggregate.seniority,
          totalRegistrations: aggregate.totalRegistrations,
          completedCount: aggregate.completedCount,
          refusedCount: aggregate.refusedCount,
          totalTrainingHours: Number(aggregate.totalTrainingHours.toFixed(2)),
          totalTrainingDays: Number(aggregate.totalTrainingDays.toFixed(2)),
          uniqueConsultants: aggregate.consultantIds.size,
        })),
        timeline: [...timeline, ...refusedTimelineEntries],
      });
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

      const isRh = user.roles.includes("rh");

      // Validate request body
      const validationSchema = isRh
        ? insertRegistrationSchema
        : insertRegistrationSchema.omit({ userId: true });
      const parsedData = validationSchema.parse(req.body) as {
        formationId: string;
        sessionId: string;
        priority: "P1" | "P2" | "P3";
        userId?: string;
      };

      const targetUserId = isRh && parsedData.userId ? parsedData.userId : userId;

      const targetUser = targetUserId === userId ? user : await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.archived) {
        return res.status(400).json({ message: "Impossible d'inscrire un collaborateur archivé" });
      }

      const data = {
        formationId: parsedData.formationId,
        sessionId: parsedData.sessionId,
        priority: parsedData.priority,
      };

      // Check if session exists
      const session = await storage.getSession(data.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Check if formation exists (needed for notifications/intention creation)
      const formation = await storage.getFormation(data.formationId);
      if (!formation) {
        return res.status(404).json({ message: "Formation not found" });
      }

      // Check capacity - count only validated and pending registrations
      const enrolledCount = await storage.getRegistrationCount(data.sessionId);
      if (enrolledCount >= session.capacity) {
        return res.status(400).json({ message: "La session est complète" });
      }

      // Check if already registered for this session
      const existingForSession = await storage.listRegistrations(targetUserId);
      const alreadyRegistered = existingForSession.find(
        (r) => r.sessionId === data.sessionId && r.status !== "cancelled"
      );
      if (alreadyRegistered) {
        return res.status(400).json({ message: "Vous êtes déjà inscrit à cette session" });
      }

      // Check if user has an approved or converted intention for this formation
      const intentions = await storage.listFormationInterests({
        userId: targetUserId,
        formationId: data.formationId,
      });
      let approvedIntention = intentions.find((i) => i.status === "approved");
      const convertedIntention = intentions.find((i) => i.status === "converted");

      // If no intention exists and an RH is enrolling, create a validated intention
      if (!approvedIntention && !convertedIntention && isRh) {
        if (data.priority === "P1") {
          if ((targetUser.p1Used || 0) >= 1) {
            return res.status(400).json({ message: "Le collaborateur a déjà utilisé sa priorité P1 cette année" });
          }
          await storage.updateUser(targetUserId, { p1Used: (targetUser.p1Used || 0) + 1 });
        } else if (data.priority === "P2") {
          if ((targetUser.p2Used || 0) >= 1) {
            return res.status(400).json({ message: "Le collaborateur a déjà utilisé sa priorité P2 cette année" });
          }
          await storage.updateUser(targetUserId, { p2Used: (targetUser.p2Used || 0) + 1 });
        }

        const createdInterest = await storage.createFormationInterest({
          userId: targetUserId,
          formationId: data.formationId,
          priority: data.priority,
          status: "approved",
        });

        const updatedInterest = await storage.updateFormationInterest(createdInterest.id, {
          coachStatus: "approved",
          coachValidatedAt: new Date(),
        });

        approvedIntention = updatedInterest ?? createdInterest;

        await createNotification({
          userId: targetUserId,
          route: "/",
          title: "Intention validée",
          message: `Votre intention pour ${formation.title} a été validée par les RH.`,
        });
      }

      let registrationStatus = "pending";

      // If intention was approved, auto-validate the registration
      // Note: quota was already consumed when intention was expressed, don't consume again
      if (approvedIntention) {
        registrationStatus = "validated";

        // Mark intention as converted
        await storage.updateFormationInterest(approvedIntention.id, { status: "converted" });
      } else if (convertedIntention) {
        registrationStatus = "validated";
      } else if (isRh) {
        // RH enrolment without prior intention defaults to validated status
        registrationStatus = "validated";
      }

      const registration = await storage.createRegistration({
        ...data,
        userId: targetUserId,
        status: registrationStatus,
      });

      if (targetUserId !== userId) {
        await createNotification({
          userId: targetUserId,
          route: "/",
          title: "Nouvelle inscription",
          message: `Vous avez été inscrit à la session du ${session.startDate.toLocaleDateString("fr-FR")} pour ${formation.title}.`,
        });
      }

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
        if (!user.roles.includes("rh")) {
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

      const formationId = registration.formationId;

      // Note: Quotas are consumed at intention expression time, not at registration time
      // Therefore, we do NOT refund quotas when deleting a registration
      // Quotas are only refunded when the intention itself is deleted or rejected

      await storage.deleteRegistration(req.params.id);

      // Check if user has any remaining registrations for this formation
      const remainingRegistrations = await storage.listRegistrations(userId);
      const hasOtherRegistrations = remainingRegistrations.some(
        r => r.formationId === formationId && r.status !== "cancelled"
      );

      // If no remaining registrations, revert intention from "converted" to "approved"
      if (!hasOtherRegistrations) {
        const intentions = await storage.listFormationInterests({ userId, formationId });
        const convertedIntention = intentions.find(i => i.status === "converted");
        
        if (convertedIntention) {
          await storage.updateFormationInterest(convertedIntention.id, { status: "approved" });
        }
      }

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
      
      if (!user || !user.roles.includes("rh")) {
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
        coachPending: number;
        coachApproved: number;
        coachRejected: number;
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
            coachPending: 0,
            coachApproved: 0,
            coachRejected: 0,
          });
        }

        const stats = formationMap.get(interest.formationId)!;

        // Count by status
        if (interest.status === "pending") stats.pending++;
        else if (interest.status === "approved") stats.approved++;
        else if (interest.status === "converted") stats.converted++;
        else if (interest.status === "withdrawn") stats.withdrawn++;

        if (interest.coachStatus === "approved") stats.coachApproved++;
        else if (interest.coachStatus === "rejected") stats.coachRejected++;
        else stats.coachPending++;

        // Count by priority - only for active interests (exclude rejected and withdrawn)
        if (interest.status !== "rejected" && interest.status !== "withdrawn") {
          if (interest.priority === "P1") stats.p1Count++;
          else if (interest.priority === "P2") stats.p2Count++;
          else if (interest.priority === "P3") stats.p3Count++;
        }
      }

      // Filter out formations with no active interests (exclude those with only rejected/withdrawn)
      const aggregated = Array.from(formationMap.values()).filter(
        stats => stats.pending > 0 || stats.approved > 0 || stats.converted > 0
      );
      res.json({ interests, aggregated });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/interests/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const interest = await storage.getFormationInterest(req.params.id);
      if (!interest) {
        return res.status(404).json({ message: "Interest not found" });
      }

      await storage.deleteFormationInterest(req.params.id);
      res.json({ message: "Interest deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/registrations", requireAuth, async (req, res) => {
    try {
      const userId = (req as AuthRequest).userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.roles.includes("rh")) {
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
      if (!user || !user.roles.includes("rh")) {
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
