import { useAdminListPayments, useAdminDecidePayment, getAdminListPaymentsQueryKey } from "@workspace/api-client-react";
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
import { Check, X } from "lucide-react";

const decideSchema = z.object({
  note: z.string().optional(),
});

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState<string>("pending");
  const { data: payments, isLoading } = useAdminListPayments({ 
    status: status !== "all" ? status : undefined 
  });

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Review and approve activation payments.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activation Payments</CardTitle>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All Payments</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center animate-pulse">Loading payments...</div>
            ) : !payments || payments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No payments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Payment Details</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-bold">{payment.userEmail}</div>
                          <div className="text-xs text-muted-foreground">ID: {payment.userId}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-primary">{formatNaira(payment.amount)}</div>
                          <div className="text-sm">Sender: {payment.senderName}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</div>
                          {payment.note && <div className="text-xs mt-1 italic text-muted-foreground">"{payment.note}"</div>}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-bold bg-muted px-2 py-1 rounded text-xs">{payment.narration}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            payment.status === "confirmed" ? "bg-green-500/10 text-green-500" :
                            payment.status === "rejected" ? "bg-destructive/10 text-destructive" :
                            "bg-amber-500/10 text-amber-500"
                          }`}>
                            {payment.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === "pending" && (
                            <PaymentActions payment={payment} params={{ status: status !== "all" ? status : undefined }} />
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

function PaymentActions({ payment, params }: { payment: any, params: any }) {
  const decide = useAdminDecidePayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"confirm" | "reject">("confirm");

  const form = useForm<z.infer<typeof decideSchema>>({
    resolver: zodResolver(decideSchema),
    defaultValues: { note: "" }
  });

  const onSubmit = (values: z.infer<typeof decideSchema>) => {
    decide.mutate({ paymentId: payment.id, data: { decision: decisionType, note: values.note } }, {
      onSuccess: () => {
        toast({ title: `Payment ${decisionType}ed` });
        queryClient.invalidateQueries({ queryKey: getAdminListPaymentsQueryKey(params) });
        setOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleOpen = (type: "confirm" | "reject") => {
    setDecisionType(type);
    setOpen(true);
  };

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" className="text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleOpen("confirm")}>
        <Check className="h-4 w-4 mr-1" /> Confirm
      </Button>
      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleOpen("reject")}>
        <X className="h-4 w-4 mr-1" /> Reject
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={decisionType === "confirm" ? "text-green-500" : "text-destructive"}>
              {decisionType === "confirm" ? "Confirm Payment" : "Reject Payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Are you sure you want to {decisionType} this {formatNaira(payment.amount)} payment from {payment.senderName}?
              {decisionType === "confirm" && " This will activate the user's account and credit referrers if applicable."}
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal note..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className={`w-full ${decisionType === "confirm" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-destructive hover:bg-destructive/90 text-white"}`} disabled={decide.isPending}>
                  {decisionType === "confirm" ? "Confirm & Activate" : "Reject Payment"}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
