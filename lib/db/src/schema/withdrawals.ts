import { pgTable, serial, text, timestamp, numeric, varchar, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const withdrawalsTable = pgTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    bankName: text("bank_name").notNull(),
    accountNumber: text("account_number").notNull(),
    accountName: text("account_name").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    weekKey: varchar("week_key", { length: 16 }).notNull(),
    adminNote: text("admin_note"),
    decidedBy: integer("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("withdrawals_user_idx").on(t.userId),
    statusIdx: index("withdrawals_status_idx").on(t.status),
    activeWeekUniq: uniqueIndex("withdrawals_user_week_uniq")
      .on(t.userId, t.weekKey)
      .where(sql`status <> 'rejected'`),
  }),
);

export type Withdrawal = typeof withdrawalsTable.$inferSelect;
export type NewWithdrawal = typeof withdrawalsTable.$inferInsert;
