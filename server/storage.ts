// Integration: blueprint:javascript_database
import {
  users,
  formations,
  sessions,
  formationInterests,
  registrations,
  instructorFormations,
  instructorAvailabilities,
  notifications,
  type User,
  type InsertUser,
  type Formation,
  type InsertFormation,
  type Session,
  type InsertSession,
  type FormationInterest,
  type InsertFormationInterest,
  type Registration,
  type InsertRegistration,
  type InstructorFormation,
  type InsertInstructorFormation,
  type InstructorAvailability,
  type InsertInstructorAvailability,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc, ne, inArray } from "drizzle-orm";

export const ensureNotificationsTable = (() => {
  let ensurePromise: Promise<void> | null = null;

  return async () => {
    if (!ensurePromise) {
      ensurePromise = (async () => {
        try {
          await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        } catch (extensionError) {
          console.error("Failed to ensure pgcrypto extension", extensionError);
        }

        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS notifications (
            id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id varchar(255) NOT NULL,
            route text NOT NULL,
            title text NOT NULL,
            message text,
            metadata jsonb,
            read boolean DEFAULT false,
            created_at timestamp DEFAULT now(),
            read_at timestamp
          )
        `);

        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS notifications_user_read_idx
          ON notifications (user_id, read)
        `);

        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS notifications_route_idx
          ON notifications (route)
        `);
      })();
    }

    return ensurePromise;
  };
})();

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(archived?: boolean): Promise<User[]>;
  deleteUser(id: string): Promise<boolean>;

  // Formation methods
  getFormation(id: string): Promise<Formation | undefined>;
  listFormations(activeOnly?: boolean): Promise<Formation[]>;
  createFormation(formation: InsertFormation): Promise<Formation>;
  updateFormation(id: string, updates: Partial<InsertFormation>): Promise<Formation | undefined>;
  deleteFormation(id: string): Promise<boolean>;

  // Session methods
  getSession(id: string): Promise<Session | undefined>;
  listSessions(formationId?: string): Promise<Session[]>;
  getUpcomingSessions(formationId?: string): Promise<Session[]>;
  getSessionsByInstructor(instructorId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Formation Interest methods
  getFormationInterest(id: string): Promise<FormationInterest | undefined>;
  listFormationInterests(filters?: { userId?: string; formationId?: string }): Promise<FormationInterest[]>;
  createFormationInterest(interest: InsertFormationInterest & { status: string }): Promise<FormationInterest>;
  updateFormationInterest(id: string, updates: Partial<FormationInterest>): Promise<FormationInterest | undefined>;
  deleteFormationInterest(id: string): Promise<boolean>;

  // Registration methods
  getRegistration(id: string): Promise<Registration | undefined>;
  listRegistrations(userId?: string, sessionId?: string): Promise<Registration[]>;
  listAllRegistrations(): Promise<Registration[]>;
  createRegistration(registration: InsertRegistration & { status: string }): Promise<Registration>;
  updateRegistration(id: string, updates: Partial<InsertRegistration>): Promise<Registration | undefined>;
  deleteRegistration(id: string): Promise<boolean>;
  getRegistrationCount(sessionId: string): Promise<number>;

  // Instructor Formation methods
  getInstructorFormations(instructorId: string): Promise<string[]>;
  addInstructorFormation(instructorId: string, formationId: string): Promise<InstructorFormation>;
  removeInstructorFormation(instructorId: string, formationId: string): Promise<boolean>;
  getAllInstructorFormations(): Promise<InstructorFormation[]>;
  replaceInstructorFormations(instructorId: string, formationIds: string[]): Promise<string[]>;

  // Instructor Availability methods
  getInstructorAvailability(instructorId: string, formationId: string): Promise<InstructorAvailability | undefined>;
  listInstructorAvailabilities(instructorId: string): Promise<InstructorAvailability[]>;
  getAllInstructorAvailabilities(): Promise<InstructorAvailability[]>;
  createInstructorAvailability(availability: InsertInstructorAvailability): Promise<InstructorAvailability>;
  updateInstructorAvailability(instructorId: string, formationId: string, slots: any): Promise<InstructorAvailability | undefined>;
  deleteInstructorAvailability(instructorId: string, formationId: string): Promise<boolean>;

  // Notification methods
  listNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationsRead(
    userId: string,
    filter?: { notificationIds?: string[]; route?: string }
  ): Promise<number>;
  getUnreadNotificationCounts(userId: string): Promise<Array<{ route: string; count: number }>>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async listUsers(archived: boolean = false): Promise<User[]> {
    return await db.select().from(users).where(eq(users.archived, archived));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Formation methods
  async getFormation(id: string): Promise<Formation | undefined> {
    const [formation] = await db.select().from(formations).where(eq(formations.id, id));
    return formation || undefined;
  }

  async listFormations(activeOnly: boolean = true): Promise<Formation[]> {
    if (activeOnly) {
      return await db.select().from(formations).where(eq(formations.active, true));
    }
    return await db.select().from(formations);
  }

  async createFormation(insertFormation: InsertFormation): Promise<Formation> {
    const [formation] = await db.insert(formations).values(insertFormation).returning();
    return formation;
  }

  async updateFormation(id: string, updates: Partial<InsertFormation>): Promise<Formation | undefined> {
    const [formation] = await db
      .update(formations)
      .set(updates)
      .where(eq(formations.id, id))
      .returning();
    return formation || undefined;
  }

  async deleteFormation(id: string): Promise<boolean> {
    const result = await db.delete(formations).where(eq(formations.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Session methods
  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async listSessions(formationId?: string): Promise<Session[]> {
    if (formationId) {
      return await db
        .select()
        .from(sessions)
        .where(eq(sessions.formationId, formationId))
        .orderBy(asc(sessions.startDate));
    }
    return await db.select().from(sessions).orderBy(asc(sessions.startDate));
  }

  async getUpcomingSessions(formationId?: string): Promise<Session[]> {
    const now = new Date();
    if (formationId) {
      return await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.formationId, formationId), sql`${sessions.startDate} > ${now}`))
        .orderBy(asc(sessions.startDate));
    }
    return await db
      .select()
      .from(sessions)
      .where(sql`${sessions.startDate} > ${now}`)
      .orderBy(asc(sessions.startDate));
  }

  async getSessionsByInstructor(instructorId: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.instructorId, instructorId))
      .orderBy(asc(sessions.startDate));
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSession(id: string, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Formation Interest methods
  async getFormationInterest(id: string): Promise<FormationInterest | undefined> {
    const [interest] = await db.select().from(formationInterests).where(eq(formationInterests.id, id));
    return interest || undefined;
  }

  async listFormationInterests(filters?: { userId?: string; formationId?: string }): Promise<FormationInterest[]> {
    const conditions = [];
    
    if (filters?.userId) {
      conditions.push(eq(formationInterests.userId, filters.userId));
    }
    
    if (filters?.formationId) {
      conditions.push(eq(formationInterests.formationId, filters.formationId));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(formationInterests)
        .where(and(...conditions))
        .orderBy(desc(formationInterests.expressedAt));
    }
    
    return await db.select().from(formationInterests).orderBy(desc(formationInterests.expressedAt));
  }

  async createFormationInterest(insertInterest: InsertFormationInterest & { status: string }): Promise<FormationInterest> {
    const existingInterest = await db
      .select()
      .from(formationInterests)
      .where(
        and(
          eq(formationInterests.userId, insertInterest.userId),
          eq(formationInterests.formationId, insertInterest.formationId),
          ne(formationInterests.status, "withdrawn")
        )
      )
      .limit(1);

    if (existingInterest.length > 0) {
      throw new Error("Vous avez déjà manifesté votre intérêt pour cette formation");
    }

    const [interest] = await db.insert(formationInterests).values(insertInterest).returning();
    return interest;
  }

  async updateFormationInterest(
    id: string,
    updates: Partial<FormationInterest>
  ): Promise<FormationInterest | undefined> {
    const [interest] = await db
      .update(formationInterests)
      .set(updates)
      .where(eq(formationInterests.id, id))
      .returning();
    return interest || undefined;
  }

  async deleteFormationInterest(id: string): Promise<boolean> {
    const result = await db.delete(formationInterests).where(eq(formationInterests.id, id)).returning();
    return result.length > 0;
  }

  // Registration methods
  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration || undefined;
  }

  async listRegistrations(userId?: string, sessionId?: string): Promise<Registration[]> {
    if (userId && sessionId) {
      return await db
        .select()
        .from(registrations)
        .where(and(eq(registrations.userId, userId), eq(registrations.sessionId, sessionId)))
        .orderBy(desc(registrations.registeredAt));
    } else if (userId) {
      return await db
        .select()
        .from(registrations)
        .where(eq(registrations.userId, userId))
        .orderBy(desc(registrations.registeredAt));
    } else if (sessionId) {
      return await db
        .select()
        .from(registrations)
        .where(eq(registrations.sessionId, sessionId))
        .orderBy(desc(registrations.registeredAt));
    }
    return await db.select().from(registrations).orderBy(desc(registrations.registeredAt));
  }

  async listAllRegistrations(): Promise<Registration[]> {
    return await db.select().from(registrations).orderBy(desc(registrations.registeredAt));
  }

  async createRegistration(insertRegistration: InsertRegistration & { status: string }): Promise<Registration> {
    const [registration] = await db.insert(registrations).values(insertRegistration).returning();
    return registration;
  }

  async updateRegistration(
    id: string,
    updates: Partial<InsertRegistration>
  ): Promise<Registration | undefined> {
    const [registration] = await db
      .update(registrations)
      .set(updates)
      .where(eq(registrations.id, id))
      .returning();
    return registration || undefined;
  }

  async deleteRegistration(id: string): Promise<boolean> {
    const result = await db.delete(registrations).where(eq(registrations.id, id)).returning();
    return result.length > 0;
  }

  async getRegistrationCount(sessionId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(registrations)
      .where(
        and(
          eq(registrations.sessionId, sessionId),
          sql`${registrations.status} != 'cancelled'`
        )
      );
    return result[0]?.count || 0;
  }

  // Instructor Formation methods
  async getInstructorFormations(instructorId: string): Promise<string[]> {
    const result = await db
      .select()
      .from(instructorFormations)
      .where(eq(instructorFormations.instructorId, instructorId));
    return result.map(r => r.formationId);
  }

  async addInstructorFormation(instructorId: string, formationId: string): Promise<InstructorFormation> {
    const [instructorFormation] = await db
      .insert(instructorFormations)
      .values({ instructorId, formationId })
      .returning();
    return instructorFormation;
  }

  async removeInstructorFormation(instructorId: string, formationId: string): Promise<boolean> {
    const result = await db
      .delete(instructorFormations)
      .where(
        and(
          eq(instructorFormations.instructorId, instructorId),
          eq(instructorFormations.formationId, formationId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getAllInstructorFormations(): Promise<InstructorFormation[]> {
    return await db.select().from(instructorFormations);
  }

  async replaceInstructorFormations(
    instructorId: string,
    formationIds: string[]
  ): Promise<string[]> {
    const uniqueFormationIds = Array.from(new Set(formationIds));
    const existingFormationIds = await this.getInstructorFormations(instructorId);

    const formationsToRemove = existingFormationIds.filter(
      (id) => !uniqueFormationIds.includes(id)
    );

    if (formationsToRemove.length > 0) {
      await db
        .delete(instructorFormations)
        .where(
          and(
            eq(instructorFormations.instructorId, instructorId),
            inArray(instructorFormations.formationId, formationsToRemove)
          )
        );

      await db
        .delete(instructorAvailabilities)
        .where(
          and(
            eq(instructorAvailabilities.instructorId, instructorId),
            inArray(instructorAvailabilities.formationId, formationsToRemove)
          )
        );
    }

    const formationsToAdd = uniqueFormationIds.filter(
      (id) => !existingFormationIds.includes(id)
    );

    if (formationsToAdd.length > 0) {
      await db
        .insert(instructorFormations)
        .values(
          formationsToAdd.map((formationId) => ({
            instructorId,
            formationId,
          }))
        )
        .onConflictDoNothing();
    }

    return uniqueFormationIds;
  }

  // Instructor Availability methods
  async getInstructorAvailability(
    instructorId: string,
    formationId: string
  ): Promise<InstructorAvailability | undefined> {
    const [availability] = await db
      .select()
      .from(instructorAvailabilities)
      .where(
        and(
          eq(instructorAvailabilities.instructorId, instructorId),
          eq(instructorAvailabilities.formationId, formationId)
        )
      );
    return availability || undefined;
  }

  async listInstructorAvailabilities(instructorId: string): Promise<InstructorAvailability[]> {
    return await db
      .select()
      .from(instructorAvailabilities)
      .where(eq(instructorAvailabilities.instructorId, instructorId));
  }

  async getAllInstructorAvailabilities(): Promise<InstructorAvailability[]> {
    return await db.select().from(instructorAvailabilities);
  }

  async createInstructorAvailability(
    availability: InsertInstructorAvailability
  ): Promise<InstructorAvailability> {
    const [createdAvailability] = await db
      .insert(instructorAvailabilities)
      .values(availability)
      .returning();
    return createdAvailability;
  }

  async updateInstructorAvailability(
    instructorId: string,
    formationId: string,
    slots: any
  ): Promise<InstructorAvailability | undefined> {
    const [availability] = await db
      .update(instructorAvailabilities)
      .set({ slots })
      .where(
        and(
          eq(instructorAvailabilities.instructorId, instructorId),
          eq(instructorAvailabilities.formationId, formationId)
        )
      )
      .returning();
    return availability || undefined;
  }

  async deleteInstructorAvailability(instructorId: string, formationId: string): Promise<boolean> {
    const result = await db
      .delete(instructorAvailabilities)
      .where(
        and(
          eq(instructorAvailabilities.instructorId, instructorId),
          eq(instructorAvailabilities.formationId, formationId)
        )
      )
      .returning();
    return result.length > 0;
  }

  // Notification methods
  async listNotifications(userId: string): Promise<Notification[]> {
    await ensureNotificationsTable();
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    await ensureNotificationsTable();
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationsRead(
    userId: string,
    filter?: { notificationIds?: string[]; route?: string }
  ): Promise<number> {
    await ensureNotificationsTable();
    const conditions = [eq(notifications.userId, userId), eq(notifications.read, false)];

    if (filter?.notificationIds && filter.notificationIds.length > 0) {
      conditions.push(inArray(notifications.id, filter.notificationIds));
    } else if (filter?.route) {
      conditions.push(eq(notifications.route, filter.route));
    }

    const result = await db
      .update(notifications)
      .set({ read: true, readAt: new Date() })
      .where(and(...conditions))
      .returning({ id: notifications.id });

    return result.length;
  }

  async getUnreadNotificationCounts(
    userId: string
  ): Promise<Array<{ route: string; count: number }>> {
    await ensureNotificationsTable();
    return await db
      .select({ route: notifications.route, count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .groupBy(notifications.route);
  }
}

export const storage = new DatabaseStorage();
