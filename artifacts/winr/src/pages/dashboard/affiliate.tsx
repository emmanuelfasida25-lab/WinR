import { useGetAffiliateSummary } from "@workspace/api-client-react";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Copy, Gift, CheckCircle2, Clock } from "lucide-react";

export default function AffiliatePage() {
  const { data: summary, isLoading } = useGetAffiliateSummary();
  const { toast } = useToast();

  const handleCopyLink = () => {
    if (summary?.referralLink) {
      navigator.clipboard.writeText(summary.referralLink);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    }
  };

  const handleCopyCode = () => {
    if (summary?.referralCode) {
      navigator.clipboard.writeText(summary.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Affiliate Program</h1>
          <p className="text-muted-foreground mt-1">Earn {formatNaira(summary?.bonusPerReferral || 500)} for every friend who joins and activates.</p>
        </div>

        {isLoading || !summary ? (
          <div className="animate-pulse py-8">Loading affiliate data...</div>
        ) : (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="space-y-2 text-center md:text-left flex-1">
                    <h2 className="text-xl font-bold text-foreground">Your Referral Link</h2>
                    <p className="text-muted-foreground text-sm">Share this link to automatically credit your account when they sign up.</p>
                  </div>
                  <div className="w-full md:w-auto flex gap-2">
                    <div className="bg-background border border-border px-4 py-2 rounded-lg flex-1 md:w-64 truncate text-sm font-medium">
                      {summary.referralLink}
                    </div>
                    <Button onClick={handleCopyLink} className="shrink-0 gap-2">
                      <Copy className="h-4 w-4" /> Copy Link
                    </Button>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-border/50 flex flex-col md:flex-row gap-6 items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Or tell them to enter your code during signup:
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-widest text-primary">{summary.referralCode}</span>
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>Copy</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{summary.totalReferrals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active (Paid)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{summary.activeReferrals}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Bonus Earned</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{formatNaira(summary.totalBonusEarned)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bonus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">{formatNaira(summary.pendingBonus)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Referred Users</CardTitle>
                <CardDescription>Track the status of your invites.</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.referredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>You haven't referred anyone yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Bonus Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.referredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="font-medium">{user.fullName || "Hustler"}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(user.joinedAt)}
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                user.status === "active" ? "bg-green-500/10 text-green-500" :
                                user.status === "pending" ? "bg-amber-500/10 text-amber-500" :
                                "bg-destructive/10 text-destructive"
                              }`}>
                                {user.status}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {user.bonusCredited ? (
                                <div className="inline-flex items-center gap-1 text-green-500 text-sm font-bold">
                                  <CheckCircle2 className="h-4 w-4" /> Paid
                                </div>
                              ) : user.status === "active" ? (
                                <div className="inline-flex items-center gap-1 text-amber-500 text-sm font-bold">
                                  <Clock className="h-4 w-4" /> Pending Payout
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Awaiting Activation
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
