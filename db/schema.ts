// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  data: text("data").notNull(),
  status: text("status").notNull(),
  created: integer("created").notNull(),
  reads: integer("reads").notNull().default(0),
  downloads: integer("downloads").notNull().default(0),
});
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  kind: text("kind").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  filename: text("filename").notNull(),
});
export const shelves = sqliteTable("shelves", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  book: text("book").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  location: text("location").notNull().default(""),
  bookmark: text("bookmark").notNull().default(""),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);
export const authLimits = sqliteTable(
  "auth_limits",
  {
    key: text("key").primaryKey(),
    hits: integer("hits").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("auth_limits_expiry_idx").on(table.expiresAt)],
);
