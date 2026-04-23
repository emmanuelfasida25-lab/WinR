import { Router, type IRouter } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { num } from "../lib/serialize";
import { REFERRAL_BONUS } from "../lib/config";

const router: IRouter = Router();

router.get("/affiliate/summary", requireAuth, async (req, res) => {
  const me = req.user!;

  const rows = await db
    .select({
      id: referralsTable.id,
      referredUserId: referralsTable.referredUserId,
      bonusAmount: referralsTable.bonusAmount,
      status: referralsTable.status,
      createdAt: referralsTable.createdAt,
      email: usersTable.email,
      fullName: usersTable.fullName,
      userStatus: usersTable.status,
    })
    .from(referralsTable)
    .leftJoin(usersTable, eq(referralsTable.referredUserId, usersTable.id))
    .where(eq(referralsTable.referrerId, me.id))
    .orderBy(desc(referralsTable.createdAt));

  const totalReferrals = rows.length;
  const activeReferrals = rows.filter((r) => r.userStatus === "active").length;
  const totalBonusEarned = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + num(r.bonusAmount), 0);
  const pendingBonus = rows
    .filter((r) => r.status === "pending" && r.userStatus === "active")
    .reduce((s, r) => s + num(r.bonusAmount), 0);

  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  const referralLink = `${proto}://${host}/sign-up?ref=${me.referralCode}`;

  res.json({
    referralCode: me.referralCode,
    referralLink,
    totalReferrals,
    activeReferrals,
    totalBonusEarned,
    pendingBonus,
    bonusPerReferral: REFERRAL_BONUS,
    referredUsers: rows.map((r) => ({
      id: r.referredUserId,
      email: r.email ?? "",
      fullName: r.fullName ?? null,
      status: r.userStatus ?? "pending",
      joinedAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      bonusCredited: r.status === "paid",
    })),
  });
});

export default router;
