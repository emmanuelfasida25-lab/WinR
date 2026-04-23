import { db, notificationsTable, type Notification } from "@workspace/db";
import type { Response } from "express";

type Client = { userId: number; res: Response };
const clients = new Set<Client>();

export function addStreamClient(c: Client) {
  clients.add(c);
}
export function removeStreamClient(c: Client) {
  clients.delete(c);
}

function broadcastToUser(userId: number, payload: Notification) {
  for (const c of clients) {
    if (c.userId === userId) {
      try {
        c.res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // best-effort
      }
    }
  }
}

export async function notify(opts: {
  userId: number;
  title: string;
  body: string;
  kind?: string;
}): Promise<Notification> {
  const [row] = await db
    .insert(notificationsTable)
    .values({
      userId: opts.userId,
      title: opts.title,
      body: opts.body,
      kind: opts.kind ?? "info",
    })
    .returning();
  if (row) broadcastToUser(opts.userId, row);
  return row!;
}
