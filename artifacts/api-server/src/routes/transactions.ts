import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { num } from "../lib/serialize";

const router: IRouter = Router();

router.get("/transactions", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  const me = req.user!;
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, me.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);
  res.json(
    rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: num(t.amount),
      description: t.description,
      balanceAfter: num(t.balanceAfter),
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    })),
  );
});

export default router;
