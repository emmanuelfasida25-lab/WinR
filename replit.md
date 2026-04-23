# WINR

A Nigerian micro-earnings/affiliate platform. Users pay a one-time activation fee (manually via bank transfer with a unique reference code as the narration), earn balance through admin-credited tasks plus a ₦500 referral bonus per activated referral, and request weekly withdrawals approved manually by an admin.

## Stack

- **Web app** (`artifacts/winr`): React 19 + Vite + Wouter + TanStack Query + Tailwind v4 + shadcn/ui, served at `/`.
- **API server** (`artifacts/api-server`): Express on `/api`, Drizzle ORM over Postgres, Clerk for auth (`@clerk/express` middleware + `clerkProxyMiddleware` at `CLERK_PROXY_PATH`).
- **Shared libraries**: `lib/api-spec` (OpenAPI 3.1), `lib/api-zod` (orval-generated zod request/response validators), `lib/api-client-react` (orval-generated React Query hooks), `lib/db` (Drizzle schema split per domain).
- **Real-time**: Server-Sent Events at `/api/notifications/stream`, in-memory client registry per user (`src/lib/notify.ts`).

## Domain rules

- Activation fee: **₦5,500** (`ACTIVATION_FEE` in `artifacts/api-server/src/lib/config.ts`).
- Referral bonus: **₦500** per referred user, credited automatically when their activation payment is confirmed.
- Minimum withdrawal: **₦1,000**. Bank details on profile required.
- **Weekly withdrawal lock**: enforced via a partial unique index on `withdrawals(user_id, week_key) WHERE status <> 'rejected'` plus an explicit eligibility check. ISO week key (`YYYY-Www`) computed in `src/lib/week.ts`.
- Withdrawal requests immediately deduct (hold) the balance. Rejection refunds the balance with a `credit` transaction; approval/paid does not refund.
- Manual payments: each user has a unique `reference_code` (e.g. `WINR-AB23CDEF`) used as the bank transfer narration. `/api/payment/info` returns bank details + the user's narration. `/api/payment/submit` records a pending claim. Admins confirm at `/api/admin/payments/:id/decision`, which activates the user, writes an `activation` transaction, and credits the referrer if applicable.

## Auth

- Clerk whitelabel (custom `<SignIn>` / `<SignUp>` pages). `<ClerkProvider>` configured per `.local/skills/clerk-auth/references/setup-and-customization.md`.
- `requireAuth` middleware (`src/lib/auth.ts`) lazily creates the local `users` row on first request, generating unique `referral_code` + `reference_code`.
- `POST /api/me/bootstrap` is called by the web app after sign-in to capture a `?ref=CODE` from sign-up; idempotent and only sets `referred_by_code` if not already set.
- Roles: `user` / `admin`. To promote a user, run `UPDATE users SET role = 'admin' WHERE email = '...'` directly against the DB.

## API surface

OpenAPI spec at `lib/api-spec/openapi.yaml`; regenerate clients with `pnpm --filter @workspace/api-spec run codegen`.

User: `GET/PATCH /me`, `POST /me/bootstrap`, `GET /payment/info`, `POST /payment/submit`, `GET /dashboard/overview`, `GET /transactions`, `GET /withdrawals`, `GET /withdrawals/eligibility`, `POST /withdrawals`, `GET /affiliate/summary`, `GET /notifications`, `POST /notifications/read-all`, `GET /notifications/stream` (SSE), `GET/POST /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets/:id/messages`.

Admin (under `/api/admin`, requires `role = 'admin'`): `GET /overview`, `GET /users`, `POST /users/:id/balance`, `POST /users/:id/status`, `GET /payments`, `POST /payments/:id/decision`, `GET /withdrawals`, `POST /withdrawals/:id/decision`, `GET /affiliate/payouts`, `POST /affiliate/payouts/:id/payout`, `GET/POST /tickets`, `POST /tickets/:id/reply`, `POST /notifications/broadcast`.

## Notifications

Every meaningful state change (payment claim, payment decision, withdrawal request/decision, balance change, status change, referral payout, support reply, broadcast) calls `notify()` which inserts a row and pushes an SSE `notification` event to that user's open streams. The web client invalidates `getListNotificationsQueryKey()` and `getGetDashboardOverviewQueryKey()` on each event.

## Environment

- `DATABASE_URL` (Replit Postgres)
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- `SESSION_SECRET`
- Optional manual-payment overrides: `WINR_BANK_NAME`, `WINR_ACCOUNT_NUMBER`, `WINR_ACCOUNT_NAME` (defaults are placeholder Opay values — set these before going live).

## Useful commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/zod after editing `openapi.yaml`.
- `pnpm --filter @workspace/db run push` — push Drizzle schema changes to Postgres.
- `pnpm -w run typecheck:libs` / `pnpm --filter @workspace/api-server run typecheck`.
