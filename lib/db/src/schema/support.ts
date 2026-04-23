import { pgTable, serial, text, timestamp, varchar, integer, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("tickets_user_idx").on(t.userId),
    statusIdx: index("tickets_status_idx").on(t.status),
  }),
);

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").notNull().references(() => supportTicketsTable.id, { onDelete: "cascade" }),
    senderRole: varchar("sender_role", { length: 16 }).notNull(),
    senderId: integer("sender_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index("ticket_msgs_idx").on(t.ticketId, t.createdAt),
  }),
);

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
