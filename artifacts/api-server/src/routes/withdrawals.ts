import { Router, type IRouter } from "express";
import { db, usersTable, withdrawalsTable, type Withdrawal } from "@workspace/db";
import { and, desc, eq, ne } from "drizzle-orm";
import { requireAuth, requireActive } from "../lib/auth";
import { num } from "../lib/serialize";
import { weekKey, nextMondayUtc } from "../lib/week";
import { MIN_WITHDRAWAL } from "../lib/config";
import { RequestWithdrawalBody } from "@workspace/api-zod";
import { notify } from "../lib/notify";

const router: IRouter = Router();

function serializeWithdrawal(w: Withdrawal) {
  return {
    id: w.id,
    amount: num(w.amount),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    requestedAt: w.requestedAt instanceof Date ? w.requestedAt.toISOString() : String(w.requestedAt),
    decidedAt: w.decidedAt
      ? w.decidedAt instanceof Date
        ? w.decidedAt.toISOString()
        : String(w.decidedAt)
      : null,
    adminNote: w.adminNote ?? null,
  };
}

router.get("/withdrawals", requireAuth, async (req, res) => {
  const me = req.user!;
  const rows = await db
    .select()
    .from(withdrawalsTable)
    .where(eq(withdrawalsTable.userId, me.id))
    .orderBy(desc(withdrawalsTable.requestedAt));
  res.json(rows.map(serializeWithdrawal));
});

router.get("/withdrawals/eligibility", requireAuth, async (req, res) => {
  const me = req.user!;
  const wk = weekKey();
  const [active] = await db
    .select()
    .from(withdrawalsTable)
    .where(
      and(
        eq(withdrawalsTable.userId, me.id),
        eq(withdrawalsTable.weekKey, wk),
        ne(withdrawalsTable.status, "rejected"),
      ),
    )
    .limit(1);

  if (active) {
    res.json({
      canRequest: false,
      reason: "You already requested a withdrawal this week. Try again next Monday.",
      nextEligibleAt: nextMondayUtc().toISOString(),
      weekKey: wk,
      minAmount: MIN_WITHDRAWAL,
    });
    return;
  }

  if (me.status !== "active") {
    res.json({
      canRequest: false,
      reason: "Activate your account before requesting a withdrawal.",
      nextEligibleAt: null,
      weekKey: wk,
      minAmount: MIN_WITHDRAWAL,
    });
    return;
  }

  if (!me.bankName || !me.accountNumber || !me.accountName) {
    res.json({
      canRequest: false,
      reason: "Complete your bank details on the profile page first.",
      nextEligibleAt: null,
      weekKey: wk,
      minAmount: MIN_WITHDRAWAL,
    });
    return;
  }

  if (num(me.balance) < MIN_WITHDRAWAL) {
    res.json({
      canRequest: false,
      reason: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString("en-NG")}.`,
      nextEligibleAt: null,
      weekKey: wk,
      minAmount: MIN_WITHDRAWAL,
    });
    return;
  }

  res.json({ canRequest: true, reason: null, nextEligibleAt: null, weekKey: wk, minAmount: MIN_WITHDRAWAL });
});

router.post("/withdrawals", requireAuth, requireActive, async (req, res) => {
  const parsed = RequestWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const me = req.user!;
  const amount = parsed.data.amount;
  if (amount < MIN_WITHDRAWAL) {
    res.status(400).json({ error: `Minimum is ₦${MIN_WITHDRAWAL}` });
    return;
  }
  if (num(me.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }
  if (!me.bankName || !me.accountNumber || !me.accountName) {
    res.status(400).json({ error: "Complete your bank details first" });
    return;
  }

  const wk = weekKey();
  const [existing] = await db
    .select()
    .from(withdrawalsTable)
    .where(
      and(
        eq(withdrawalsTable.userId, me.id),
        eq(withdrawalsTable.weekKey, wk),
        ne(withdrawalsTable.status, "rejected"),
      ),
    )
    .limit(1);
  if (existing) {
    res.status(400).json({ error: "Already requested this week" });
    return;
  }

  // Hold balance: deduct immediately
  const newBal = num(me.balance) - amount;
  await db.update(usersTable).set({ balance: String(newBal) }).where(eq(usersTable.id, me.id));

  const [w] = await db
    .insert(withdrawalsTable)
    .values({
      userId: me.id,
      amount: String(amount),
      bankName: me.bankName,
      accountNumber: me.accountNumber,
      accountName: me.accountName,
      status: "pending",
      weekKey: wk,
    })
    .returning();

  await db.insert((await import("@workspace/db")).transactionsTable).values({
    userId: me.id,
    type: "withdrawal",
    amount: String(-amount),
    description: `Withdrawal request #${w!.id} (held)`,
    balanceAfter: String(newBal),
  });

  await notify({
    userId: me.id,
    title: "Withdrawal requested",
    body: `Your request of ₦${amount.toLocaleString("en-NG")} is pending review.`,
    kind: "withdrawal",
  });

  res.json(serializeWithdrawal(w!));
});

export default router;
