import { useGetWithdrawalEligibility, useRequestWithdrawal, useListMyWithdrawals, useGetMe, getListMyWithdrawalsQueryKey, getGetWithdrawalEligibilityQueryKey, getGetDashboardOverviewQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  amount: z.coerce.number().min(1, "Amount is required"),
});

export default function WithdrawPage() {
  const { data: me } = useGetMe();
  const { data: eligibility, isLoading: eligibilityLoading } = useGetWithdrawalEligibility();
  const { data: withdrawals, isLoading: historyLoading } = useListMyWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    requestWithdrawal.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Withdrawal requested", description: "Your request is pending admin approval." });
        queryClient.invalidateQueries({ queryKey: getListMyWithdrawalsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWithdrawalEligibilityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        form.reset({ amount: 0 });
      },
      onError: (err: any) => {
        toast({ title: "Request failed", description: err.message || "Failed to request withdrawal", variant: "destructive" });
      }
    });
  };

  const missingBankInfo = !me?.bankName || !me?.accountNumber || !me?.accountName;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Withdraw Funds</h1>
          <p className="text-muted-foreground mt-1">Request your earnings straight to your bank account.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              {eligibility && <CardDescription>Minimum withdrawal: {formatNaira(eligibility.minAmount)}</CardDescription>}
            </CardHeader>
            <CardContent>
              {eligibilityLoading ? (
                <div className="animate-pulse">Checking eligibility...</div>
              ) : missingBankInfo ? (
                <div className="bg-destructive/10 border border-destructive p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">Missing Bank Information</span>
                  </div>
                  <p className="text-sm text-foreground">You need to set up your bank account details before you can withdraw.</p>
                  <Link href="/dashboard/profile">
                    <Button variant="outline" className="w-full mt-2">Update Profile</Button>
                  </Link>
                </div>
              ) : !eligibility?.canRequest ? (
                <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-lg flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Clock className="h-5 w-5" />
                    <span className="font-bold">Not Eligible Yet</span>
                  </div>
                  <p className="text-sm text-foreground">{eligibility?.reason}</p>
                  {eligibility?.nextEligibleAt && (
                    <p className="text-sm font-bold text-amber-500">Next available: {formatDate(eligibility.nextEligibleAt)}</p>
                  )}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg mb-6">
                      <p className="text-sm text-muted-foreground mb-1">Paying to:</p>
                      <p className="font-bold">{me?.bankName} - {me?.accountNumber}</p>
                      <p className="text-sm">{me?.accountName}</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₦)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter amount" {...field} />
                          </FormControl>
                          <FormDescription>
                            Available balance: {formatNaira(me?.balance || 0)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={requestWithdrawal.isPending}>
                      {requestWithdrawal.isPending ? "Processing..." : "Request Withdrawal"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="animate-pulse text-center py-4">Loading history...</div>
              ) : !withdrawals || withdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No withdrawal requests yet.</div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-lg">{formatNaira(w.amount)}</div>
                        <div className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                          w.status === "paid" ? "bg-green-500/20 text-green-500" :
                          w.status === "rejected" ? "bg-destructive/20 text-destructive" :
                          w.status === "approved" ? "bg-primary/20 text-primary" :
                          "bg-amber-500/20 text-amber-500"
                        }`}>
                          {w.status}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{w.bankName} - {w.accountNumber}</p>
                        <p>Requested: {formatDate(w.requestedAt)}</p>
                        {w.adminNote && <p className="text-amber-500 text-xs mt-2 border border-amber-500/30 bg-amber-500/10 p-2 rounded">Note: {w.adminNote}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
