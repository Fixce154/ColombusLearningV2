import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  roles: text("roles").array().notNull(), // consultant, rh, formateur, manager
  seniority: text("seniority"), // junior, confirme, senior, expert
  businessUnit: text("business_unit"),
  p1Used: integer("p1_used").default(0),
  p2Used: integer("p2_used").default(0),
});

export const formations = pgTable("formations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  objectives: text("objectives").notNull(),
  prerequisites: text("prerequisites"),
  duration: text("duration").notNull(), // "2 jours", "3h30"
  modality: text("modality").notNull(), // presentiel, distanciel, hybride
  seniorityRequired: text("seniority_required"), // junior, confirme, senior, expert
  theme: text("theme").notNull(),
  tags: text("tags").array(),
  active: boolean("active").default(true),
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
  formationId: varchar("formation_id").notNull(),
  userId: varchar("user_id").notNull(),
  priority: text("priority").notNull(), // P1, P2, P3
  status: text("status").notNull(), // pending, approved, converted, withdrawn
  expressedAt: timestamp("expressed_at").default(sql`now()`),
}, (table) => ({
  userFormationUnique: uniqueIndex("user_formation_unique_idx").on(table.userId, table.formationId),
}));

export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sessionId: varchar("session_id").notNull(),
  formationId: varchar("formation_id").notNull(),
  priority: text("priority").notNull(), // P1, P2, P3
  status: text("status").notNull(), // pending, validated, completed, cancelled
  registeredAt: timestamp("registered_at").default(sql`now()`),
  attended: boolean("attended").default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFormationSchema = createInsertSchema(formations).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true }).extend({
  startDate: z.union([z.date(), z.string()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
  endDate: z.union([z.date(), z.string()]).transform((val) => typeof val === 'string' ? new Date(val) : val),
});
export const insertFormationInterestSchema = createInsertSchema(formationInterests).omit({ id: true, expressedAt: true, status: true });
export const insertRegistrationSchema = createInsertSchema(registrations).omit({ id: true, registeredAt: true, status: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFormation = z.infer<typeof insertFormationSchema>;
export type Formation = typeof formations.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertFormationInterest = z.infer<typeof insertFormationInterestSchema>;
export type FormationInterest = typeof formationInterests.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;
