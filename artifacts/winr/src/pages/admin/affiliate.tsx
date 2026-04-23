import { useAdminListAffiliatePayouts, useAdminPayoutAffiliate, getAdminListAffiliatePayoutsQueryKey } from "@workspace/api-client-react";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

export default function AdminAffiliatePayoutsPage() {
  const { data: payouts, isLoading } = useAdminListAffiliatePayouts();
  const markPaid = useAdminPayoutAffiliate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMarkPaid = (payoutId: number) => {
    markPaid.mutate({ payoutId }, {
      onSuccess: () => {
        toast({ title: "Payout marked as paid", description: "The referrer's balance has been credited." });
        queryClient.invalidateQueries({ queryKey: getAdminListAffiliatePayoutsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Affiliate Payouts</h1>
          <p className="text-muted-foreground mt-1">Credit referrers for successfully referring active users.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center animate-pulse">Loading payouts...</div>
            ) : !payouts || payouts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No pending payouts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-bold">{p.referrerEmail}</div>
                          <div className="text-xs text-muted-foreground">ID: {p.referrerId}</div>
                          <div className="text-xs text-muted-foreground mt-1">{formatDate(p.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{p.referredUserEmail}</div>
                          <div className="text-xs text-muted-foreground">ID: {p.referredUserId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-primary">{formatNaira(p.amount)}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            p.status === "paid" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                          }`}>
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.status === "pending" && (
                            <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" disabled={markPaid.isPending} onClick={() => handleMarkPaid(p.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                            </Button>
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
      </div>
    </SidebarLayout>
  );
}
