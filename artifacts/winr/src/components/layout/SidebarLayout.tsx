import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { useGetMe, useGetDashboardOverview } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowRightLeft, 
  CreditCard, 
  Users, 
  MessageSquare, 
  Bell, 
  User, 
  LogOut,
  Menu,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiskFooter } from "@/components/risk/RiskDisclaimer";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SidebarLayout({ children, isAdmin = false }: { children: React.ReactNode, isAdmin?: boolean }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const { data: overview } = useGetDashboardOverview({ query: { enabled: !isAdmin } });
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = overview?.unreadNotifications || 0;

  const dashboardLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/balance", label: "Balance", icon: Wallet },
    { href: "/dashboard/transactions", label: "Transactions", icon: ArrowRightLeft },
    { href: "/dashboard/withdraw", label: "Withdraw", icon: CreditCard },
    { href: "/dashboard/affiliate", label: "Affiliate", icon: Users },
    { href: "/dashboard/fund", label: "Fund Account", icon: Wallet },
    { href: "/dashboard/support", label: "Support", icon: MessageSquare },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { href: "/dashboard/profile", label: "Profile", icon: User },
  ];

  const adminLinks = [
    { href: "/admin", label: "Admin Overview", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: Wallet },
    { href: "/admin/withdrawals", label: "Withdrawals", icon: CreditCard },
    { href: "/admin/affiliate", label: "Affiliate Payouts", icon: Users },
    { href: "/admin/tickets", label: "Support Tickets", icon: MessageSquare },
    { href: "/admin/notifications", label: "Broadcast", icon: Bell },
  ];

  const links = isAdmin ? adminLinks : dashboardLinks;

  const NavLinks = () => (
    <div className="space-y-1 py-4">
      {links.map((link) => {
        const isActive = location === link.href || (link.href !== (isAdmin ? "/admin" : "/dashboard") && location.startsWith(link.href));
        const Icon = link.icon;
        
        return (
          <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition-colors cursor-pointer ${
              isActive 
                ? "bg-primary text-primary-foreground font-medium" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}>
              <Icon className="h-5 w-5" />
              <span className="flex-1">{link.label}</span>
              {link.badge !== undefined && link.badge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                  {link.badge}
                </span>
              )}
            </div>
          </Link>
        );
      })}
      
      {!isAdmin && me?.role === "admin" && (
        <div className="pt-4 mt-4 border-t border-border/50 px-2">
          <Link href="/admin">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer">
              <ShieldCheck className="h-5 w-5" />
              <span>Admin Panel</span>
            </div>
          </Link>
        </div>
      )}
      
      {isAdmin && (
        <div className="pt-4 mt-4 border-t border-border/50 px-2">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer">
              <LayoutDashboard className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card z-10 sticky top-0">
        <Link href={isAdmin ? "/admin" : "/dashboard"}>
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={`${basePath}/logo.svg`} alt="WINR" className="h-8" />
            <span className="font-bold text-xl tracking-tight text-primary">WINR</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground bg-muted px-3 py-1.5 rounded-lg text-sm">
            {formatNaira(me?.balance || 0)}
          </span>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-card border-r-border">
              <div className="p-6 pb-2">
                <Link href={isAdmin ? "/admin" : "/dashboard"}>
                  <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setIsOpen(false)}>
                    <img src={`${basePath}/logo.svg`} alt="WINR" className="h-8" />
                    <span className="font-bold text-2xl tracking-tight text-primary">WINR</span>
                  </div>
                </Link>
                <div className="bg-muted rounded-xl p-4 mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-foreground">{formatNaira(me?.balance || 0)}</p>
                </div>
              </div>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <NavLinks />
              </ScrollArea>
              <div className="absolute bottom-0 w-full p-4 border-t border-border bg-card">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-72 bg-card border-r border-border fixed h-screen top-0 left-0 z-20">
        <div className="p-6">
          <Link href={isAdmin ? "/admin" : "/dashboard"}>
            <div className="flex items-center gap-3 mb-8 cursor-pointer">
              <img src={`${basePath}/logo.svg`} alt="WINR" className="h-10" />
              <span className="font-bold text-3xl tracking-tight text-primary">WINR</span>
            </div>
          </Link>
          
          <div className="bg-muted rounded-xl p-4 mb-2 shadow-inner">
            <p className="text-sm text-muted-foreground mb-1 font-medium">Available Balance</p>
            <p className="text-3xl font-bold text-foreground tracking-tight">{formatNaira(me?.balance || 0)}</p>
            {isAdmin && <p className="text-xs text-amber-500 mt-2 font-medium uppercase tracking-wider">ADMIN MODE</p>}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <NavLinks />
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-background border border-border">
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              {me?.fullName?.charAt(0) || me?.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-foreground truncate">{me?.fullName || "Hustler"}</p>
              <p className="text-xs text-muted-foreground truncate">{me?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-72 min-h-screen pb-20 md:pb-0 flex flex-col">
        <div className="max-w-6xl mx-auto p-4 md:p-8 w-full flex-1">
          {children}
        </div>
        <RiskFooter />
      </div>
    </div>
  );
}
