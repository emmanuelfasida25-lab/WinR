import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateReferralCode, generateReferenceCode } from "./codes";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

async function getOrCreateUser(clerkId: string): Promise<User> {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (existing[0]) return existing[0];

  const cu = await clerkClient.users.getUser(clerkId);
  const email =
    cu.primaryEmailAddress?.emailAddress ||
    cu.emailAddresses[0]?.emailAddress ||
    `${clerkId}@unknown.local`;
  const fullName = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || null;

  const referralCode = await uniqueReferralCode();
  const referenceCode = await uniqueReferenceCode();

  const inserted = await db
    .insert(usersTable)
    .values({
      clerkId,
      email,
      fullName,
      referralCode,
      referenceCode,
    })
    .onConflictDoNothing({ target: usersTable.clerkId })
    .returning();

  if (inserted[0]) return inserted[0];

  const reread = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return reread[0]!;
}

async function uniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode();
    const taken = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code))
      .limit(1);
    if (!taken[0]) return code;
  }
  return generateReferralCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

async function uniqueReferenceCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateReferenceCode();
    const taken = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referenceCode, code))
      .limit(1);
    if (!taken[0]) return code;
  }
  return generateReferenceCode() + Date.now().toString(36).slice(-3).toUpperCase();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = await getOrCreateUser(clerkId);
    next();
  } catch (err) {
    req.log.error({ err }, "Failed to load user");
    res.status(500).json({ error: "Failed to load user" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

export function requireActive(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.status !== "active") {
    res.status(403).json({ error: "Account not active" });
    return;
  }
  next();
}
