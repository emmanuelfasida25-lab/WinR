import { useAdminOverview } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, CreditCard, MessageSquare, Gift, ArrowRightLeft } from "lucide-react";

export default function AdminOverviewPage() {
  const { data: overview, isLoading } = useAdminOverview();

  if (isLoading || !overview) return <SidebarLayout isAdmin><div className="animate-pulse py-8">Loading overview...</div></SidebarLayout>;

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Overview</h1>
          <p className="text-muted-foreground mt-1">Platform statistics and pending actions.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Pending Payments</CardTitle>
              <Wallet className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{overview.pendingPayments}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Pending Withdrawals</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{overview.pendingWithdrawals}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Open Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{overview.openTickets}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Pending Payouts</CardTitle>
              <Gift className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{overview.pendingAffiliatePayouts}</div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4">Platform Stats</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalUsers}</div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="text-green-500 font-medium">{overview.activeUsers} Active</span>
                <span className="text-amber-500 font-medium">{overview.pendingUsers} Pending</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance Outstanding</CardTitle>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNaira(overview.totalBalanceOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-2">Sum of all user balances</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
