// Integration: blueprint:javascript_database
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error(
    "WARNING: DATABASE_URL is not set. Database operations will fail. Please configure DATABASE_URL in your deployment secrets."
  );
  console.error("The server will start but most features will not work without a database connection.");
}

const connectionString = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
