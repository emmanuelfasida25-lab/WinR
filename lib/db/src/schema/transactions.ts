import { pgTable, serial, text, timestamp, numeric, varchar, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description").notNull(),
    balanceAfter: numeric("balance_after", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("transactions_user_idx").on(t.userId, t.createdAt),
  }),
);

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
