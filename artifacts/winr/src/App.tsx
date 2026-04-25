import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { useEffect, useRef, useState } from "react";
import { useBootstrapMe, useGetMe } from "@workspace/api-client-react";
import { RiskAcknowledgmentDialog } from "@/components/risk/RiskAcknowledgmentDialog";
import { RiskFooter } from "@/components/risk/RiskDisclaimer";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ActivatePage from "@/pages/activate";
import DashboardOverview from "@/pages/dashboard/overview";
import BalancePage from "@/pages/dashboard/balance";
import TransactionsPage from "@/pages/dashboard/transactions";
import WithdrawPage from "@/pages/dashboard/withdraw";
import AffiliatePage from "@/pages/dashboard/affiliate";
import SupportPage from "@/pages/dashboard/support";
import NotificationsPage from "@/pages/dashboard/notifications";
import ProfilePage from "@/pages/dashboard/profile";

import AdminOverviewPage from "@/pages/admin/overview";
import AdminUsersPage from "@/pages/admin/users";
import AdminPaymentsPage from "@/pages/admin/payments";
import AdminWithdrawalsPage from "@/pages/admin/withdrawals";
import AdminAffiliatePayoutsPage from "@/pages/admin/affiliate";
import AdminTicketsPage from "@/pages/admin/tickets";
import AdminBroadcastPage from "@/pages/admin/notifications";

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(43 100% 50%)",
    colorForeground: "hsl(147 20% 95%)",
    colorMutedForeground: "hsl(147 15% 70%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(147 60% 7%)",
    colorInput: "hsl(147 40% 15%)",
    colorInputForeground: "hsl(147 20% 95%)",
    colorNeutral: "hsl(147 40% 15%)",
    fontFamily: "var(--app-font-sans)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-background border border-border rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/90",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-primary",
    alertText: "text-destructive-foreground",
    logoBox: "flex justify-center",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-border hover:bg-muted",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
    formFieldInput: "bg-input border-border text-foreground focus:ring-ring",
    footerAction: "text-center",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive",
    otpCodeFieldInput: "bg-input border-border text-foreground",
    formFieldRow: "space-y-4",
    main: "space-y-6",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Bootstrapper() {
  const { isLoaded, isSignedIn } = useUser();
  const bootstrap = useBootstrapMe();
  const bootstrapRef = useRef(false);

  useEffect(() => {
    if (isLoaded && isSignedIn && !bootstrapRef.current) {
      bootstrapRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const ref =
        params.get("ref") ||
        (typeof window !== "undefined" ? window.localStorage.getItem("winr.ref") : null);
      bootstrap.mutate({ data: { referralCode: ref || null } });
      if (typeof window !== "undefined") window.localStorage.removeItem("winr.ref");
    }
  }, [isLoaded, isSignedIn]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
      <RiskFooter />
    </div>
  );
}

function SignUpPage() {
  const [refCode, setRefCode] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    return (fromUrl || window.localStorage.getItem("winr.ref") || "").toUpperCase();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = refCode.trim().toUpperCase();
    if (trimmed) window.localStorage.setItem("winr.ref", trimmed);
    else window.localStorage.removeItem("winr.ref");
  }, [refCode]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
          <label htmlFor="winr-ref" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Referral code (optional)
          </label>
          <input
            id="winr-ref"
            type="text"
            value={refCode}
            onChange={(e) => setRefCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC1234"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm tracking-wider text-foreground placeholder:text-muted-foreground/50 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            data-testid="input-referral-code"
            maxLength={16}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Got a referral code from a friend? Enter it here so they get their bonus when you activate.
          </p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
      </div>
      <RiskFooter />
    </div>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { data: me, isLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && me) {
      if (me.status === "suspended") {
        setLocation("/suspended");
      } else if (me.status === "pending" && !adminOnly && window.location.pathname !== `${basePath}/activate`) {
        setLocation("/activate");
      } else if (adminOnly && me.role !== "admin") {
        setLocation("/dashboard");
      }
    }
  }, [me, isLoading, adminOnly, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse">Loading...</div></div>;
  }

  if (!me) return null;

  return <Component />;
}

function SuspendedStub() {
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8 text-center">
      <div className="max-w-md border border-destructive/20 bg-destructive/5 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-destructive mb-4">Account Suspended</h1>
        <p className="mb-8 text-muted-foreground">Your account has been suspended by an administrator. Please contact support if you believe this is an error.</p>
        <button onClick={() => signOut()} className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-bold border border-border w-full hover:bg-secondary/80">Sign Out</button>
      </div>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to access WINR" } },
        signUp: { start: { title: "Create WINR account", subtitle: "Start earning today" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Bootstrapper />
        <RiskAcknowledgmentDialog />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/activate">
            <Show when="signed-in"><ProtectedRoute component={ActivatePage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          
          <Route path="/suspended">
            <Show when="signed-in"><SuspendedStub /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>

          <Route path="/dashboard">
            <Show when="signed-in"><ProtectedRoute component={DashboardOverview} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/balance">
            <Show when="signed-in"><ProtectedRoute component={BalancePage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/transactions">
            <Show when="signed-in"><ProtectedRoute component={TransactionsPage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/withdraw">
            <Show when="signed-in"><ProtectedRoute component={WithdrawPage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/affiliate">
            <Show when="signed-in"><ProtectedRoute component={AffiliatePage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/fund">
            {/* Same form as activate, so we can reuse ActivatePage since it works for re-funding too */}
            <Show when="signed-in"><ProtectedRoute component={ActivatePage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/support">
            <Show when="signed-in"><ProtectedRoute component={SupportPage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/notifications">
            <Show when="signed-in"><ProtectedRoute component={NotificationsPage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/dashboard/profile">
            <Show when="signed-in"><ProtectedRoute component={ProfilePage} /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin">
            <Show when="signed-in"><ProtectedRoute component={AdminOverviewPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/users">
            <Show when="signed-in"><ProtectedRoute component={AdminUsersPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/payments">
            <Show when="signed-in"><ProtectedRoute component={AdminPaymentsPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/withdrawals">
            <Show when="signed-in"><ProtectedRoute component={AdminWithdrawalsPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/affiliate">
            <Show when="signed-in"><ProtectedRoute component={AdminAffiliatePayoutsPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/tickets">
            <Show when="signed-in"><ProtectedRoute component={AdminTicketsPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>
          <Route path="/admin/notifications">
            <Show when="signed-in"><ProtectedRoute component={AdminBroadcastPage} adminOnly /></Show>
            <Show when="signed-out"><Redirect to="/sign-in" /></Show>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
