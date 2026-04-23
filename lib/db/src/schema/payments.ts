import { pgTable, serial, text, timestamp, numeric, varchar, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    senderName: text("sender_name").notNull(),
    note: text("note"),
    narration: varchar("narration", { length: 24 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    decidedBy: integer("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("payments_user_idx").on(t.userId),
    statusIdx: index("payments_status_idx").on(t.status),
  }),
);

export type Payment = typeof paymentsTable.$inferSelect;
export type NewPayment = typeof paymentsTable.$inferInsert;
