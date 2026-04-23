import { useAdminListWithdrawals, useAdminDecideWithdrawal, getAdminListWithdrawalsQueryKey } from "@workspace/api-client-react";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Check, X, Copy, Banknote } from "lucide-react";

const decideSchema = z.object({
  note: z.string().optional(),
});

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState<string>("pending");
  const { data: withdrawals, isLoading } = useAdminListWithdrawals({ 
    status: status !== "all" ? status : undefined 
  });
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Withdrawals</h1>
          <p className="text-muted-foreground mt-1">Review and process user withdrawal requests.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Withdrawal Requests</CardTitle>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Withdrawals</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center animate-pulse">Loading withdrawals...</div>
            ) : !withdrawals || withdrawals.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No withdrawals found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>
                          <div className="font-bold">{w.userEmail}</div>
                          <div className="text-xs text-muted-foreground">ID: {w.userId}</div>
                          <div className="text-xs text-muted-foreground mt-1">{formatDate(w.requestedAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">{w.bankName}</div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{w.accountNumber}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(w.accountNumber)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-sm">{w.accountName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-primary text-lg">{formatNaira(w.amount)}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            w.status === "paid" ? "bg-green-500/10 text-green-500" :
                            w.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            w.status === "approved" ? "bg-primary/10 text-primary" :
                            "bg-amber-500/10 text-amber-500"
                          }`}>
                            {w.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {(w.status === "pending" || w.status === "approved") && (
                            <WithdrawalActions withdrawal={w} params={{ status: status !== "all" ? status : undefined }} />
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

function WithdrawalActions({ withdrawal, params }: { withdrawal: any, params: any }) {
  const decide = useAdminDecideWithdrawal();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"approve" | "reject" | "paid">("approve");

  const form = useForm<z.infer<typeof decideSchema>>({
    resolver: zodResolver(decideSchema),
    defaultValues: { note: "" }
  });

  const onSubmit = (values: z.infer<typeof decideSchema>) => {
    decide.mutate({ withdrawalId: withdrawal.id, data: { decision: decisionType, note: values.note } }, {
      onSuccess: () => {
        toast({ title: `Withdrawal ${decisionType}ed` });
        queryClient.invalidateQueries({ queryKey: getAdminListWithdrawalsQueryKey(params) });
        setOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleOpen = (type: "approve" | "reject" | "paid") => {
    setDecisionType(type);
    setOpen(true);
  };

  return (
    <div className="flex justify-end gap-2 flex-wrap">
      {withdrawal.status === "pending" && (
        <>
          <Button size="sm" variant="outline" className="text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleOpen("approve")}>
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleOpen("reject")}>
            <X className="h-4 w-4 mr-1" /> Reject
          </Button>
        </>
      )}
      
      {withdrawal.status === "approved" && (
        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleOpen("paid")}>
          <Banknote className="h-4 w-4 mr-1" /> Mark Paid
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={
              decisionType === "paid" ? "text-green-500" : 
              decisionType === "approve" ? "text-primary" : "text-destructive"
            }>
              {decisionType === "paid" ? "Mark as Paid" : 
               decisionType === "approve" ? "Approve Withdrawal" : "Reject Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              {decisionType === "paid" && "Confirm that you have successfully transferred the funds to the user's bank account."}
              {decisionType === "approve" && "Approve this withdrawal to be processed in the next payment batch."}
              {decisionType === "reject" && "Rejecting will return the funds to the user's available balance."}
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Note (Optional, visible to user)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g. Processed via GTB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className={`w-full ${
                  decisionType === "paid" ? "bg-green-500 hover:bg-green-600 text-white" : 
                  decisionType === "approve" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : 
                  "bg-destructive hover:bg-destructive/90 text-white"
                }`} disabled={decide.isPending}>
                  Confirm Action
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
