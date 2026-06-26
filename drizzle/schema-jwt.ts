// Updated User Table Schema for JWT Authentication
// This is a reference for the schema changes needed

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: varchar("fullName", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: text("passwordHash"),
    phone: varchar("phone", { length: 20 }),
    avatar: text("avatar"),
    openId: varchar("openId", { length: 64 }).unique(), // Optional for OAuth
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", [
      "admin",
      "doctor",
      "nurse",
      "receptionist",
      "pharmacist",
      "lab_technician",
      "patient",
    ])
      .default("patient")
      .notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    lastLogin: timestamp("lastLogin"),
  },
  (table) => [
    index("idx_email").on(table.email),
    index("idx_role").on(table.role),
    index("idx_isActive").on(table.isActive),
    index("idx_email_password").on(table.email),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
