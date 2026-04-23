import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { addStreamClient, removeStreamClient } from "../lib/notify";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const me = req.user!;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, me.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);
  res.json(
    rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      read: n.read,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    })),
  );
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.userId, req.user!.id), eq(notificationsTable.read, false)));
  res.json({ ok: true });
});

router.get("/notifications/stream", requireAuth, (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write(`event: ping\ndata: {}\n\n`);

  const client = { userId: req.user!.id, res };
  addStreamClient(client);

  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      // ignore
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeStreamClient(client);
  });
});

export default router;
