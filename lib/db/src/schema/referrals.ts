import { pgTable, serial, timestamp, numeric, varchar, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralsTable = pgTable(
  "referrals",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    referredUserId: integer("referred_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull(),
    bonusAmount: numeric("bonus_amount", { precision: 14, scale: 2 }).notNull().default("500"),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    referrerIdx: index("referrals_referrer_idx").on(t.referrerId),
    referredUniq: uniqueIndex("referrals_referred_uniq").on(t.referredUserId),
  }),
);

export type Referral = typeof referralsTable.$inferSelect;
export type NewReferral = typeof referralsTable.$inferInsert;
