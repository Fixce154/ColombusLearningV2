import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { Buffer } from "buffer";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const SENIORITY_LEVELS = [
  "Alternant",
  "Junior",
  "Senior",
  "Supervising Senior",
  "Manager",
  "Senior Manager",
  "Directeur",
  "Partner",
  "Senior Partner",
] as const;

export const LEGACY_SENIORITY_MAPPING: Record<string, (typeof SENIORITY_LEVELS)[number]> = {
  stagiaire: "Alternant",
  alternant: "Alternant",
  junior: "Junior",
  confirme: "Senior",
  confirmé: "Senior",
  senior: "Supervising Senior",
  expert: "Directeur",
  "super manager": "Senior Manager",
};

export const resolveSeniorityLevel = (
  value: string | null | undefined
): (typeof SENIORITY_LEVELS)[number] | undefined => {
  if (!value) {
    return undefined;
  }

  if (SENIORITY_LEVELS.includes(value as (typeof SENIORITY_LEVELS)[number])) {
    return value as (typeof SENIORITY_LEVELS)[number];
  }

  const normalized = value.trim().toLowerCase();

  const matchedLevel = SENIORITY_LEVELS.find(
    (level) => level.toLowerCase() === normalized
  );
  if (matchedLevel) {
    return matchedLevel;
  }

  return LEGACY_SENIORITY_MAPPING[normalized];
};

export type SeniorityLevel = (typeof SENIORITY_LEVELS)[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  employeeId: text("employee_id"),
  hireDate: timestamp("hire_date"),
  grade: text("grade"),
  jobRole: text("job_role"),
  roles: text("roles").array().notNull(), // consultant, rh, formateur, formateur_externe, manager
  seniority: text("seniority"), // e.g. Alternant, Junior, Senior...
  businessUnit: text("business_unit"),
  p1Used: integer("p1_used").default(0),
  p2Used: integer("p2_used").default(0),
  archived: boolean("archived").default(false),
});

export const formations = pgTable("formations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectives: text("objectives").notNull(),
  prerequisites: text("prerequisites"),
  duration: text("duration").notNull(), // "2 jours", "3h30"
  modality: text("modality").notNull(), // presentiel, distanciel, hybride
  seniorityRequired: text("seniority_required"), // Alternant, Junior, Senior...
  theme: text("theme").notNull(),
  tags: text("tags").array(),
  active: boolean("active").default(true),
  content: text("content"),
});

export const formationMaterials = pgTable("formation_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formationId: varchar("formation_id")
    .notNull()
    .references(() => formations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: bytea("file_data").notNull(),
  requiresEnrollment: boolean("requires_enrollment").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  createdBy: varchar("created_by"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formationId: varchar("formation_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"), // "Salle A" or "Visio"
  capacity: integer("capacity").notNull(),
  instructorId: varchar("instructor_id"),
  status: text("status").notNull(), // open, full, completed, cancelled
});

export const formationInterests = pgTable("formation_interests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formationId: varchar("formation_id").references(() => formations.id),
  userId: varchar("user_id").notNull(),
  priority: text("priority").notNull(), // P1, P2, P3
  status: text("status").notNull(), // pending, approved, converted, withdrawn
  expressedAt: timestamp("expressed_at").default(sql`now()`),
  coachStatus: text("coach_status").notNull().default("pending"), // pending, approved, rejected
  coachId: varchar("coach_id"),
  coachValidatedAt: timestamp("coach_validated_at"),
  customTitle: text("custom_title"),
  customDescription: text("custom_description"),
  customLink: text("custom_link"),
  customPrice: text("custom_price"),
  customFitnetNumber: text("custom_fitnet_number"),
  customMissionManager: text("custom_mission_manager"),
  customPlannedDate: timestamp("custom_planned_date"),
  completedAt: timestamp("completed_at"),
  customReviewRating: integer("custom_review_rating"),
  customReviewComment: text("custom_review_comment"),
}, (table) => ({
  userFormationUnique: uniqueIndex("user_formation_unique_idx").on(table.userId, table.formationId),
}));

export const coachAssignments = pgTable("coach_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  coacheeId: varchar("coachee_id").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  coachCoacheeUnique: uniqueIndex("coach_coachee_unique_idx").on(table.coachId, table.coacheeId),
}));

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  formationId: varchar("formation_id").notNull(),
  priority: text("priority").notNull(), // P1, P2, P3
  status: text("status").notNull(), // pending, validated, completed, cancelled
  registeredAt: timestamp("registered_at").default(sql`now()`),
  attended: boolean("attended").default(false),
  attendanceSignedAt: timestamp("attendance_signed_at"),
});

export const formationReviews = pgTable(
  "formation_reviews",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    formationId: varchar("formation_id")
      .notNull()
      .references(() => formations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").default(sql`now()`),
    updatedAt: timestamp("updated_at").default(sql`now()`),
  },
  (table) => ({
    reviewerUnique: uniqueIndex("formation_reviews_unique_reviewer_idx").on(
      table.formationId,
      table.userId
    ),
  })
);

export const sessionAttendanceTokens = pgTable(
  "session_attendance_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    token: varchar("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").default(sql`now()`),
    createdBy: varchar("created_by").notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("session_attendance_tokens_token_idx").on(table.token),
    sessionIndex: uniqueIndex("session_attendance_tokens_session_idx").on(table.sessionId, table.token),
  })
);

export const instructorFormations = pgTable("instructor_formations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull(),
  formationId: varchar("formation_id").notNull(),
  assignedAt: timestamp("assigned_at").default(sql`now()`),
}, (table) => ({
  instructorFormationUnique: uniqueIndex("instructor_formation_unique_idx").on(table.instructorId, table.formationId),
}));

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  route: text("route").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  metadata: jsonb("metadata"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  readAt: timestamp("read_at"),
});

// Availability slot schema
export const availabilitySlotSchema = z.object({
  date: z.string(), // ISO date string
  timeSlot: z.enum(['full_day', 'morning', 'afternoon']),
});

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

export const instructorAvailabilities = pgTable("instructor_availabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull(),
  formationId: varchar("formation_id").notNull(),
  slots: jsonb("slots").$type<AvailabilitySlot[]>().notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  instructorFormationAvailabilityUnique: uniqueIndex("instructor_formation_availability_unique_idx").on(table.instructorId, table.formationId),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFormationSchema = createInsertSchema(formations).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true }).extend({
  startDate: z.union([z.date(), z.string()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.date(), z.string()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});
export const insertFormationInterestSchema = createInsertSchema(formationInterests)
  .omit({
    id: true,
    expressedAt: true,
    status: true,
    coachStatus: true,
    coachId: true,
    coachValidatedAt: true,
  })
  .extend({
    customPlannedDate: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "string" && val.length > 0) {
          return new Date(val);
        }
        return val ?? undefined;
      }),
    completedAt: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "string" && val.length > 0) {
          return new Date(val);
        }
        return val ?? undefined;
      }),
  });
export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, registeredAt: true, status: true });
export const insertFormationMaterialSchema = createInsertSchema(formationMaterials).omit({
  id: true,
  fileData: true,
  createdAt: true,
  createdBy: true,
});
export const insertInstructorFormationSchema = createInsertSchema(instructorFormations).omit({ id: true, assignedAt: true });
export const insertInstructorAvailabilitySchema = createInsertSchema(instructorAvailabilities).omit({ id: true, createdAt: true }).extend({
  slots: z.array(availabilitySlotSchema),
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
  readAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFormation = z.infer<typeof insertFormationSchema>;
export type Formation = typeof formations.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertFormationInterest = z.infer<typeof insertFormationInterestSchema>;
export type FormationInterest = typeof formationInterests.$inferSelect;
export type InsertFormationMaterial = typeof formationMaterials.$inferInsert;
export type FormationMaterial = typeof formationMaterials.$inferSelect;
export type CoachAssignment = typeof coachAssignments.$inferSelect;
export type InsertCoachAssignment = typeof coachAssignments.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

export const DASHBOARD_INFORMATION_LAYOUTS = [
  "text-only",
  "image-right",
  "image-left",
  "image-top",
] as const;

export const DASHBOARD_INFORMATION_TONES = [
  "neutral",
  "accent",
  "highlight",
] as const;

const dashboardImageUrlSchema = z
  .string()
  .trim()
  .max(500, { message: "L'URL de l'image est trop longue" })
  .refine(
    (value) =>
      value.length === 0 ||
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/"),
    {
      message:
        "L'URL doit commencer par http://, https:// ou / pour une ressource interne",
    }
  )
  .default("");

export const dashboardInformationSettingsSchema = z
  .object({
    enabled: z.boolean().default(false),
    title: z
      .string()
      .trim()
      .max(120, { message: "Le titre ne doit pas dépasser 120 caractères" })
      .default(""),
    body: z
      .string()
      .trim()
      .max(1200, { message: "Le texte ne doit pas dépasser 1200 caractères" })
      .default(""),
    imageUrl: dashboardImageUrlSchema,
    layout: z.enum(DASHBOARD_INFORMATION_LAYOUTS).default("text-only"),
    tone: z.enum(DASHBOARD_INFORMATION_TONES).default("neutral"),
  })
  .superRefine((data, ctx) => {
    if (data.enabled) {
      if (!data.title || data.title.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le titre est obligatoire lorsque la section est activée",
          path: ["title"],
        });
      }

      if (!data.body || data.body.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le texte est obligatoire lorsque la section est activée",
          path: ["body"],
        });
      }
    }
  });

export type DashboardInformationSettings = z.infer<
  typeof dashboardInformationSettingsSchema
>;

export const DEFAULT_DASHBOARD_INFORMATION: DashboardInformationSettings =
  dashboardInformationSettingsSchema.parse({});
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;
export type InsertInstructorFormation = z.infer<typeof insertInstructorFormationSchema>;
export type InstructorFormation = typeof instructorFormations.$inferSelect;
export type InsertInstructorAvailability = z.infer<typeof insertInstructorAvailabilitySchema>;
export type InstructorAvailability = typeof instructorAvailabilities.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type SessionAttendanceToken = typeof sessionAttendanceTokens.$inferSelect;
export type FormationReview = typeof formationReviews.$inferSelect;
export type InsertFormationReview = typeof formationReviews.$inferInsert;
