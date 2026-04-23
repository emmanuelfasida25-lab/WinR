import { Router, type IRouter } from "express";
import { db, usersTable, referralsTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { num } from "../lib/serialize";
import { UpdateMeBody, BootstrapMeBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeMe(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    bankName: u.bankName,
    accountNumber: u.accountNumber,
    accountName: u.accountName,
    referralCode: u.referralCode,
    referenceCode: u.referenceCode,
    referredByCode: u.referredByCode,
    status: u.status,
    role: u.role,
    balance: num(u.balance),
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  };
}

router.get("/me", requireAuth, (req, res) => {
  res.json(serializeMe(req.user!));
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({
      fullName: parsed.data.fullName ?? req.user!.fullName,
      phone: parsed.data.phone ?? req.user!.phone,
      bankName: parsed.data.bankName ?? req.user!.bankName,
      accountNumber: parsed.data.accountNumber ?? req.user!.accountNumber,
      accountName: parsed.data.accountName ?? req.user!.accountName,
    })
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json(serializeMe(updated!));
});

router.post("/me/bootstrap", requireAuth, async (req, res) => {
  const parsed = BootstrapMeBody.safeParse(req.body ?? {});
  const referralCode = parsed.success ? parsed.data.referralCode ?? null : null;

  const me = req.user!;
  if (referralCode && !me.referredByCode && referralCode !== me.referralCode) {
    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode))
      .limit(1);
    if (referrer && referrer.id !== me.id) {
      const [updated] = await db
        .update(usersTable)
        .set({ referredByCode: referralCode })
        .where(eq(usersTable.id, me.id))
        .returning();
      await db
        .insert(referralsTable)
        .values({
          referrerId: referrer.id,
          referredUserId: me.id,
          code: referralCode,
        })
        .onConflictDoNothing();
      res.json(serializeMe(updated!));
      return;
    }
  }
  res.json(serializeMe(me));
});

export default router;
