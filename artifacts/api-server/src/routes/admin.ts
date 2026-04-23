import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  paymentsTable,
  withdrawalsTable,
  referralsTable,
  transactionsTable,
  notificationsTable,
  supportTicketsTable,
  supportMessagesTable,
  type User,
  type Payment,
  type Withdrawal,
  type Referral,
  type SupportTicket,
  type SupportMessage,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, or, sql, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { num } from "../lib/serialize";
import { ACTIVATION_FEE, REFERRAL_BONUS } from "../lib/config";
import {
  AdminUpdateBalanceBody,
  AdminSetUserStatusBody,
  AdminDecidePaymentBody,
  AdminDecideWithdrawalBody,
  AdminBroadcastBody,
  AdminReplyTicketBody,
} from "@workspace/api-zod";
import { notify } from "../lib/notify";

const router: IRouter = Router();
router.use(requireAuth, requireAdmin);

function serializeUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    referralCode: u.referralCode,
    referenceCode: u.referenceCode,
    status: u.status,
    role: u.role,
    balance: num(u.balance),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  };
}

router.get("/overview", async (_req, res) => {
  const [tu] = await db.select({ c: sql<string>`COUNT(*)::text` }).from(usersTable);
  const [au] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(usersTable)
    .where(eq(usersTable.status, "active"));
  const [pu] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(usersTable)
    .where(eq(usersTable.status, "pending"));
  const [pp] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(paymentsTable)
    .where(eq(paymentsTable.status, "pending"));
  const [pw] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(withdrawalsTable)
    .where(inArray(withdrawalsTable.status, ["pending", "approved"]));
  const [ot] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.status, "open"));
  const [pa] = await db
    .select({ c: sql<string>`COUNT(*)::text` })
    .from(referralsTable)
    .where(eq(referralsTable.status, "pending"));
  const [tb] = await db.select({ v: sql<string>`COALESCE(SUM(balance),0)::text` }).from(usersTable);

  res.json({
    totalUsers: Number(tu?.c ?? 0),
    activeUsers: Number(au?.c ?? 0),
    pendingUsers: Number(pu?.c ?? 0),
    pendingPayments: Number(pp?.c ?? 0),
    pendingWithdrawals: Number(pw?.c ?? 0),
    openTickets: Number(ot?.c ?? 0),
    pendingAffiliatePayouts: Number(pa?.c ?? 0),
    totalBalanceOutstanding: num(tb?.v),
  });
});

router.get("/users", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const status = (req.query.status as string | undefined)?.trim();
  const conds = [] as any[];
  if (q) {
    conds.push(or(ilike(usersTable.email, `%${q}%`), ilike(usersTable.fullName, `%${q}%`), ilike(usersTable.referralCode, `%${q}%`), ilike(usersTable.referenceCode, `%${q}%`)));
  }
  if (status) conds.push(eq(usersTable.status, status));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(usersTable)
    .where(where as any)
    .orderBy(desc(usersTable.createdAt))
    .limit(200);
  res.json(rows.map(serializeUser));
});

router.post("/users/:userId/balance", async (req, res) => {
  const id = Number(req.params.userId);
  const parsed = AdminUpdateBalanceBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!target) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const delta = parsed.data.delta;
  const newBal = num(target.balance) + delta;
  if (newBal < 0) {
    res.status(400).json({ error: "Balance cannot go negative" });
    return;
  }
  const [updated] = await db.update(usersTable).set({ balance: String(newBal) }).where(eq(usersTable.id, id)).returning();
  await db.insert(transactionsTable).values({
    userId: id,
    type: delta >= 0 ? "admin_credit" : "admin_debit",
    amount: String(delta),
    description: parsed.data.reason,
    balanceAfter: String(newBal),
  });
  await notify({
    userId: id,
    title: delta >= 0 ? "Balance credited" : "Balance debited",
    body: `${delta >= 0 ? "+" : ""}₦${delta.toLocaleString("en-NG")} — ${parsed.data.reason}`,
    kind: "balance",
  });
  res.json(serializeUser(updated!));
});

router.post("/users/:userId/status", async (req, res) => {
  const id = Number(req.params.userId);
  const parsed = AdminSetUserStatusBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ status: parsed.data.status })
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await notify({
    userId: id,
    title: "Account status updated",
    body: `Your account is now ${parsed.data.status}.`,
    kind: "status",
  });
  res.json(serializeUser(updated));
});

function serializePayment(p: Payment, email: string) {
  return {
    id: p.id,
    userId: p.userId,
    userEmail: email,
    amount: num(p.amount),
    senderName: p.senderName,
    note: p.note,
    narration: p.narration,
    status: p.status,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
  };
}

router.get("/payments", async (req, res) => {
  const status = (req.query.status as string | undefined)?.trim();
  const where = status ? eq(paymentsTable.status, status) : undefined;
  const rows = await db
    .select({ p: paymentsTable, email: usersTable.email })
    .from(paymentsTable)
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .where(where as any)
    .orderBy(desc(paymentsTable.createdAt))
    .limit(200);
  res.json(rows.map((r) => serializePayment(r.p, r.email ?? "")));
});

router.post("/payments/:paymentId/decision", async (req, res) => {
  const id = Number(req.params.paymentId);
  const parsed = AdminDecidePaymentBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [pay] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!pay) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (pay.status !== "pending") {
    res.status(400).json({ error: "Already decided" });
    return;
  }
  const newStatus = parsed.data.decision === "confirm" ? "confirmed" : "rejected";
  const [updated] = await db
    .update(paymentsTable)
    .set({ status: newStatus, decidedBy: req.user!.id, decidedAt: new Date() })
    .where(eq(paymentsTable.id, id))
    .returning();

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, pay.userId)).limit(1);
  if (!target) {
    res.json(serializePayment(updated!, ""));
    return;
  }

  if (newStatus === "confirmed") {
    if (target.status !== "active") {
      await db.update(usersTable).set({ status: "active" }).where(eq(usersTable.id, target.id));
      await db.insert(transactionsTable).values({
        userId: target.id,
        type: "activation",
        amount: String(num(pay.amount)),
        description: `Activation payment confirmed (₦${ACTIVATION_FEE.toLocaleString("en-NG")})`,
        balanceAfter: String(num(target.balance)),
      });

      // Credit referrer if applicable
      if (target.referredByCode) {
        const [referrer] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.referralCode, target.referredByCode))
          .limit(1);
        if (referrer) {
          const [ref] = await db
            .select()
            .from(referralsTable)
            .where(eq(referralsTable.referredUserId, target.id))
            .limit(1);
          if (ref && ref.status === "pending") {
            const newBal = num(referrer.balance) + REFERRAL_BONUS;
            await db.update(usersTable).set({ balance: String(newBal) }).where(eq(usersTable.id, referrer.id));
            await db.insert(transactionsTable).values({
              userId: referrer.id,
              type: "referral_bonus",
              amount: String(REFERRAL_BONUS),
              description: `Referral bonus for ${target.email}`,
              balanceAfter: String(newBal),
            });
            await db
              .update(referralsTable)
              .set({ status: "paid", paidAt: new Date() })
              .where(eq(referralsTable.id, ref.id));
            await notify({
              userId: referrer.id,
              title: "Referral bonus credited",
              body: `+₦${REFERRAL_BONUS.toLocaleString("en-NG")} — ${target.email} just activated.`,
              kind: "referral",
            });
          }
        }
      }
    }
    await notify({
      userId: target.id,
      title: "Payment confirmed",
      body: `Your activation payment was confirmed. Welcome to WINR!`,
      kind: "payment",
    });
  } else {
    await notify({
      userId: target.id,
      title: "Payment rejected",
      body: parsed.data.note || "Your payment claim was rejected. Please contact support.",
      kind: "payment",
    });
  }

  res.json(serializePayment(updated!, target.email));
});

function serializeWithdrawal(w: Withdrawal, email: string) {
  return {
    id: w.id,
    userId: w.userId,
    userEmail: email,
    amount: num(w.amount),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    status: w.status,
    requestedAt: w.requestedAt instanceof Date ? w.requestedAt.toISOString() : String(w.requestedAt),
  };
}

router.get("/withdrawals", async (req, res) => {
  const status = (req.query.status as string | undefined)?.trim();
  const where = status ? eq(withdrawalsTable.status, status) : undefined;
  const rows = await db
    .select({ w: withdrawalsTable, email: usersTable.email })
    .from(withdrawalsTable)
    .leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .where(where as any)
    .orderBy(desc(withdrawalsTable.requestedAt))
    .limit(200);
  res.json(rows.map((r) => serializeWithdrawal(r.w, r.email ?? "")));
});

router.post("/withdrawals/:withdrawalId/decision", async (req, res) => {
  const id = Number(req.params.withdrawalId);
  const parsed = AdminDecideWithdrawalBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [w] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, id)).limit(1);
  if (!w) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  let newStatus: "approved" | "rejected" | "paid" = "approved";
  if (parsed.data.decision === "reject") newStatus = "rejected";
  else if (parsed.data.decision === "paid") newStatus = "paid";

  const [updated] = await db
    .update(withdrawalsTable)
    .set({ status: newStatus, adminNote: parsed.data.note ?? null, decidedBy: req.user!.id, decidedAt: new Date() })
    .where(eq(withdrawalsTable.id, id))
    .returning();

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, w.userId)).limit(1);

  if (newStatus === "rejected") {
    // Refund held amount
    if (target) {
      const newBal = num(target.balance) + num(w.amount);
      await db.update(usersTable).set({ balance: String(newBal) }).where(eq(usersTable.id, target.id));
      await db.insert(transactionsTable).values({
        userId: target.id,
        type: "credit",
        amount: String(num(w.amount)),
        description: `Withdrawal #${w.id} refunded${parsed.data.note ? `: ${parsed.data.note}` : ""}`,
        balanceAfter: String(newBal),
      });
      await notify({
        userId: target.id,
        title: "Withdrawal rejected",
        body: parsed.data.note || "Your withdrawal request was rejected and your balance was refunded.",
        kind: "withdrawal",
      });
    }
  } else if (newStatus === "paid") {
    if (target) {
      await notify({
        userId: target.id,
        title: "Withdrawal paid",
        body: `Your withdrawal of ₦${num(w.amount).toLocaleString("en-NG")} has been paid.`,
        kind: "withdrawal",
      });
    }
  } else if (target) {
    await notify({
      userId: target.id,
      title: "Withdrawal approved",
      body: `Your request of ₦${num(w.amount).toLocaleString("en-NG")} was approved and is being processed.`,
      kind: "withdrawal",
    });
  }

  res.json(serializeWithdrawal(updated!, target?.email ?? ""));
});

router.get("/affiliate/payouts", async (_req, res) => {
  const rows = await db
    .select({
      r: referralsTable,
      referrerEmail: sql<string>`(SELECT email FROM users WHERE id = ${referralsTable.referrerId})`,
      referredEmail: sql<string>`(SELECT email FROM users WHERE id = ${referralsTable.referredUserId})`,
    })
    .from(referralsTable)
    .orderBy(desc(referralsTable.createdAt))
    .limit(200);
  res.json(
    rows.map(({ r, referrerEmail, referredEmail }) => ({
      id: r.id,
      referrerId: r.referrerId,
      referrerEmail: referrerEmail ?? "",
      referredUserId: r.referredUserId,
      referredUserEmail: referredEmail ?? "",
      amount: num(r.bonusAmount),
      status: r.status,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
  );
});

router.post("/affiliate/payouts/:referralId/payout", async (req, res) => {
  const id = Number(req.params.referralId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [ref] = await db.select().from(referralsTable).where(eq(referralsTable.id, id)).limit(1);
  if (!ref) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (ref.status === "paid") {
    res.status(400).json({ error: "Already paid" });
    return;
  }
  const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, ref.referrerId)).limit(1);
  if (!referrer) {
    res.status(404).json({ error: "Referrer not found" });
    return;
  }
  const newBal = num(referrer.balance) + num(ref.bonusAmount);
  await db.update(usersTable).set({ balance: String(newBal) }).where(eq(usersTable.id, referrer.id));
  await db.insert(transactionsTable).values({
    userId: referrer.id,
    type: "referral_bonus",
    amount: String(num(ref.bonusAmount)),
    description: `Referral bonus payout (#${ref.id})`,
    balanceAfter: String(newBal),
  });
  await db.update(referralsTable).set({ status: "paid", paidAt: new Date() }).where(eq(referralsTable.id, ref.id));
  await notify({
    userId: referrer.id,
    title: "Referral bonus paid",
    body: `+₦${num(ref.bonusAmount).toLocaleString("en-NG")} credited to your balance.`,
    kind: "referral",
  });

  const [referred] = await db.select().from(usersTable).where(eq(usersTable.id, ref.referredUserId)).limit(1);

  res.json({
    id: ref.id,
    referrerId: ref.referrerId,
    referrerEmail: referrer.email,
    referredUserId: ref.referredUserId,
    referredUserEmail: referred?.email ?? "",
    amount: num(ref.bonusAmount),
    status: "paid",
    createdAt: ref.createdAt instanceof Date ? ref.createdAt.toISOString() : String(ref.createdAt),
  });
});

function serializeTicket(t: SupportTicket, email: string | null, last?: SupportMessage | null) {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    userEmail: email,
    lastMessagePreview: last?.body?.slice(0, 140) ?? null,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
  };
}

router.get("/tickets", async (req, res) => {
  const status = (req.query.status as string | undefined)?.trim();
  const where = status ? eq(supportTicketsTable.status, status) : undefined;
  const rows = await db
    .select({ t: supportTicketsTable, email: usersTable.email })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(where as any)
    .orderBy(desc(supportTicketsTable.updatedAt))
    .limit(200);
  const out = await Promise.all(
    rows.map(async ({ t, email }) => {
      const [last] = await db
        .select()
        .from(supportMessagesTable)
        .where(eq(supportMessagesTable.ticketId, t.id))
        .orderBy(desc(supportMessagesTable.createdAt))
        .limit(1);
      return serializeTicket(t, email, last);
    }),
  );
  res.json(out);
});

router.get("/tickets/:ticketId", async (req, res) => {
  const id = Number(req.params.ticketId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({ t: supportTicketsTable, email: usersTable.email })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(eq(supportTicketsTable.id, id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, id))
    .orderBy(asc(supportMessagesTable.createdAt));
  res.json({
    ticket: serializeTicket(row.t, row.email, messages[messages.length - 1] ?? null),
    messages: messages.map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    })),
  });
});

router.post("/tickets/:ticketId/reply", async (req, res) => {
  const id = Number(req.params.ticketId);
  const parsed = AdminReplyTicketBody.safeParse(req.body);
  if (!Number.isFinite(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [t] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id)).limit(1);
  if (!t) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [m] = await db
    .insert(supportMessagesTable)
    .values({ ticketId: id, senderRole: "admin", senderId: req.user!.id, body: parsed.data.body })
    .returning();
  await db.update(supportTicketsTable).set({ updatedAt: new Date() }).where(eq(supportTicketsTable.id, id));
  await notify({
    userId: t.userId,
    title: "Support replied",
    body: parsed.data.body.slice(0, 200),
    kind: "support",
  });
  res.json({
    id: m!.id,
    ticketId: m!.ticketId,
    senderRole: m!.senderRole,
    body: m!.body,
    createdAt: m!.createdAt instanceof Date ? m!.createdAt.toISOString() : String(m!.createdAt),
  });
});

router.post("/notifications/broadcast", async (req, res) => {
  const parsed = AdminBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  if (parsed.data.userId) {
    await notify({
      userId: parsed.data.userId,
      title: parsed.data.title,
      body: parsed.data.body,
      kind: "broadcast",
    });
  } else {
    const all = await db.select({ id: usersTable.id }).from(usersTable);
    for (const u of all) {
      await notify({
        userId: u.id,
        title: parsed.data.title,
        body: parsed.data.body,
        kind: "broadcast",
      });
    }
  }
  res.json({ ok: true });
});

export default router;
