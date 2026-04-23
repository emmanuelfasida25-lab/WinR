import { Router, type IRouter } from "express";
import { db, transactionsTable, withdrawalsTable, referralsTable, notificationsTable } from "@workspace/db";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { num } from "../lib/serialize";

const router: IRouter = Router();

router.get("/dashboard/overview", requireAuth, async (req, res) => {
  const me = req.user!;
  const balance = num(me.balance);

  const [earnedRow] = await db
    .select({
      v: sql<string>`COALESCE(SUM(amount), 0)::text`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, me.id),
        inArray(transactionsTable.type, ["credit", "referral_bonus", "admin_credit"]),
      ),
    );

  const [withdrawnRow] = await db
    .select({
      v: sql<string>`COALESCE(SUM(amount), 0)::text`,
    })
    .from(withdrawalsTable)
    .where(and(eq(withdrawalsTable.userId, me.id), eq(withdrawalsTable.status, "paid")));

  const [pendingRow] = await db
    .select({
      v: sql<string>`COALESCE(SUM(amount), 0)::text`,
    })
    .from(withdrawalsTable)
    .where(
      and(
        eq(withdrawalsTable.userId, me.id),
        inArray(withdrawalsTable.status, ["pending", "approved"]),
      ),
    );

  const [referralRow] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, me.id));

  const [unreadRow] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, me.id), eq(notificationsTable.read, false)));

  const recent = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, me.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(8);

  res.json({
    balance,
    totalEarned: num(earnedRow?.v),
    totalWithdrawn: num(withdrawnRow?.v),
    pendingWithdrawals: num(pendingRow?.v),
    referralCount: Number(referralRow?.c ?? 0),
    unreadNotifications: Number(unreadRow?.c ?? 0),
    status: me.status,
    recentTransactions: recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: num(t.amount),
      description: t.description,
      balanceAfter: num(t.balanceAfter),
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    })),
  });
});

export default router;
