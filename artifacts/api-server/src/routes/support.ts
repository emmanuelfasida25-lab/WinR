import { Router, type IRouter } from "express";
import { db, supportTicketsTable, supportMessagesTable, type SupportTicket, type SupportMessage } from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateTicketBody, PostTicketMessageBody } from "@workspace/api-zod";
import { notify } from "../lib/notify";

const router: IRouter = Router();

function serializeTicket(t: SupportTicket, last?: SupportMessage | null, userEmail?: string | null) {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    userEmail: userEmail ?? null,
    lastMessagePreview: last?.body?.slice(0, 140) ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  };
}
function serializeMessage(m: SupportMessage) {
  return {
    id: m.id,
    ticketId: m.ticketId,
    senderRole: m.senderRole,
    body: m.body,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
  };
}

router.get("/support/tickets", requireAuth, async (req, res) => {
  const me = req.user!;
  const tickets = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, me.id))
    .orderBy(desc(supportTicketsTable.updatedAt));
  const out = await Promise.all(
    tickets.map(async (t) => {
      const [last] = await db
        .select()
        .from(supportMessagesTable)
        .where(eq(supportMessagesTable.ticketId, t.id))
        .orderBy(desc(supportMessagesTable.createdAt))
        .limit(1);
      return serializeTicket(t, last, me.email);
    }),
  );
  res.json(out);
});

router.post("/support/tickets", requireAuth, async (req, res) => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const me = req.user!;
  const [t] = await db
    .insert(supportTicketsTable)
    .values({ userId: me.id, subject: parsed.data.subject })
    .returning();
  const [m] = await db
    .insert(supportMessagesTable)
    .values({ ticketId: t!.id, senderRole: "user", senderId: me.id, body: parsed.data.body })
    .returning();
  res.json(serializeTicket(t!, m, me.email));
});

router.get("/support/tickets/:ticketId", requireAuth, async (req, res) => {
  const id = Number(req.params.ticketId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const me = req.user!;
  const [t] = await db
    .select()
    .from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, me.id)))
    .limit(1);
  if (!t) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, id))
    .orderBy(asc(supportMessagesTable.createdAt));
  res.json({
    ticket: serializeTicket(t, messages[messages.length - 1] ?? null, me.email),
    messages: messages.map(serializeMessage),
  });
});

router.post("/support/tickets/:ticketId/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.ticketId);
  const parsed = PostTicketMessageBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const me = req.user!;
  const [t] = await db
    .select()
    .from(supportTicketsTable)
    .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, me.id)))
    .limit(1);
  if (!t) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [m] = await db
    .insert(supportMessagesTable)
    .values({ ticketId: id, senderRole: "user", senderId: me.id, body: parsed.data.body })
    .returning();
  await db
    .update(supportTicketsTable)
    .set({ updatedAt: new Date(), status: "open" })
    .where(eq(supportTicketsTable.id, id));
  res.json(serializeMessage(m!));
});

export default router;
