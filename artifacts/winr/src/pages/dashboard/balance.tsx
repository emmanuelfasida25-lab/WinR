import { useGetDashboardOverview } from "@workspace/api-client-react";
import { formatNaira } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowUpRight, ArrowDownRight, Users, Gift } from "lucide-react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

export default function BalancePage() {
  const { data: overview, isLoading } = useGetDashboardOverview();

  if (isLoading || !overview) return <SidebarLayout><div className="animate-pulse space-y-4">Loading...</div></SidebarLayout>;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Balance Breakdown</h1>
          <p className="text-muted-foreground mt-1">Detailed view of your earnings and withdrawals.</p>
        </div>

        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-primary font-medium uppercase tracking-wider text-sm">Available to Withdraw</p>
            <h2 className="text-5xl md:text-7xl font-extrabold text-primary">{formatNaira(overview.balance)}</h2>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(overview.totalEarned)}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime earnings on WINR</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(overview.totalWithdrawn)}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully paid out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <Wallet className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatNaira(overview.pendingWithdrawals)}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently being processed</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
