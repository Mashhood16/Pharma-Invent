import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const rawDbUrl = process.env.DATABASE_URL?.trim();

// A real database is configured if DATABASE_URL is provided and not pointing to localhost on Vercel
const isLocalhost =
  !rawDbUrl ||
  rawDbUrl.includes("localhost") ||
  rawDbUrl.includes("127.0.0.1") ||
  rawDbUrl.startsWith("postgres://postgres:postgres@localhost");

export const isDbConfigured: boolean = Boolean(
  rawDbUrl && (!process.env.VERCEL || !isLocalhost)
);

const connectionString = isDbConfigured
  ? rawDbUrl!
  : "postgres://postgres:postgres@localhost:5432/pharma_invent";

// Connection pool options optimized for high-speed local POS environments
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: isDbConfigured ? 4 : 1,
  onnotice: () => {}, // silence routine notices
});

export const db = drizzle(client, { schema });

export { schema };
