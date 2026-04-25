import { Router, type IRouter } from "express";
import { db, paymentsTable, type Payment } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { ACTIVATION_FEE, MIN_FUND_AMOUNT, PAYMENT_INFO, PAYMENT_INSTRUCTIONS } from "../lib/config";
import { num } from "../lib/serialize";
import { SubmitPaymentClaimBody } from "@workspace/api-zod";
import { notify } from "../lib/notify";

const router: IRouter = Router();

function serializePayment(p: Payment) {
  return {
    id: p.id,
    amount: num(p.amount),
    senderName: p.senderName,
    note: p.note,
    narration: p.narration,
    status: p.status,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    decidedAt: p.decidedAt
      ? p.decidedAt instanceof Date
        ? p.decidedAt.toISOString()
        : String(p.decidedAt)
      : null,
  };
}

router.get("/payment/info", requireAuth, async (req, res) => {
  const me = req.user!;
  const [latest] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.userId, me.id))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(1);

  res.json({
    amount: ACTIVATION_FEE,
    currency: "NGN",
    bankName: PAYMENT_INFO.bankName,
    accountNumber: PAYMENT_INFO.accountNumber,
    accountName: PAYMENT_INFO.accountName,
    narration: me.referenceCode,
    instructions: PAYMENT_INSTRUCTIONS,
    latestClaim: latest ? serializePayment(latest) : null,
  });
});

router.post("/payment/submit", requireAuth, async (req, res) => {
  const parsed = SubmitPaymentClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const me = req.user!;
  const amt = Number(parsed.data.amount);
  if (me.status === "active") {
    if (!Number.isFinite(amt) || amt < MIN_FUND_AMOUNT) {
      res.status(400).json({ error: `Minimum funding amount is ₦${MIN_FUND_AMOUNT.toLocaleString("en-NG")}` });
      return;
    }
  } else {
    if (amt !== ACTIVATION_FEE) {
      res.status(400).json({ error: `Activation fee is exactly ₦${ACTIVATION_FEE.toLocaleString("en-NG")}` });
      return;
    }
  }
  const [created] = await db
    .insert(paymentsTable)
    .values({
      userId: me.id,
      amount: String(parsed.data.amount),
      senderName: parsed.data.senderName,
      note: parsed.data.note ?? null,
      narration: me.referenceCode,
      status: "pending",
    })
    .returning();

  await notify({
    userId: me.id,
    title: "Payment claim received",
    body: `We received your payment claim of ₦${num(parsed.data.amount).toLocaleString("en-NG")}. An admin will confirm shortly.`,
    kind: "payment",
  });

  res.json(serializePayment(created!));
});

export default router;
