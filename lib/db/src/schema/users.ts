import { pgTable, serial, text, timestamp, numeric, varchar, index } from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkId: varchar("clerk_id", { length: 128 }).notNull().unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    accountName: text("account_name"),
    referralCode: varchar("referral_code", { length: 16 }).notNull().unique(),
    referenceCode: varchar("reference_code", { length: 24 }).notNull().unique(),
    referredByCode: varchar("referred_by_code", { length: 16 }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    role: varchar("role", { length: 16 }).notNull().default("user"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clerkIdx: index("users_clerk_idx").on(t.clerkId),
    refIdx: index("users_ref_idx").on(t.referralCode),
  }),
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
