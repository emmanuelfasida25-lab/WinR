import { useGetPaymentInfo, useSubmitPaymentClaim, useGetMe, getGetPaymentInfoQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle2, Clock } from "lucide-react";
import { useClerk } from "@clerk/react";

const claimSchema = z.object({
  senderName: z.string().min(2, "Sender name is required"),
  amount: z.coerce.number().min(100, "Amount must be valid"),
  note: z.string().optional(),
});

export default function ActivatePage() {
  const { data: me } = useGetMe();
  const { data: paymentInfo, isLoading } = useGetPaymentInfo();
  const submitClaim = useSubmitPaymentClaim();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useClerk();

  const form = useForm<z.infer<typeof claimSchema>>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      senderName: "",
      amount: 5500,
      note: "",
    },
  });

  if (isLoading || !paymentInfo || !me) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse">Loading...</div></div>;
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const onSubmit = (values: z.infer<typeof claimSchema>) => {
    submitClaim.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Payment claim submitted", description: "Your activation is pending admin review." });
        queryClient.invalidateQueries({ queryKey: getGetPaymentInfoQueryKey() });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error.message || "Failed to submit claim", variant: "destructive" });
      }
    });
  };

  const latestClaim = paymentInfo.latestClaim;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="WINR" className="h-8" />
            <span className="font-bold text-xl text-primary">WINR</span>
          </div>
          <Button variant="ghost" onClick={() => signOut()}>Sign Out</Button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Activate Your Account</h1>
          <p className="text-muted-foreground">Complete the payment to unlock your WINR dashboard.</p>
        </div>

        {latestClaim && latestClaim.status === "pending" ? (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="text-center">
              <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <CardTitle className="text-amber-500 text-2xl">Payment Pending Verification</CardTitle>
              <CardDescription className="text-base mt-2 text-foreground/80">
                We've received your claim of {formatNaira(latestClaim.amount)}. 
                Please wait while our team verifies the transfer. This usually takes a few hours.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Instructions</CardTitle>
                <CardDescription>Send exactly {formatNaira(paymentInfo.amount)} to the account below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                    <p className="font-bold">{paymentInfo.bankName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                    <p className="font-bold">{paymentInfo.accountName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                    <div className="flex items-center justify-between bg-background px-3 py-2 rounded border border-border">
                      <span className="font-bold text-lg">{paymentInfo.accountNumber}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleCopy(paymentInfo.accountNumber, "Account Number")}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border border-primary/30 bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2 font-bold text-primary">CRITICAL INSTRUCTION</p>
                  <p className="text-sm mb-3">You MUST use this exact code as your transfer narration/remark. Without it, your account will not be activated.</p>
                  <div className="flex items-center justify-between bg-background px-3 py-2 rounded border border-primary/50">
                    <span className="font-mono font-bold text-lg text-primary">{paymentInfo.narration}</span>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(paymentInfo.narration, "Reference Code")} className="text-primary border-primary hover:bg-primary/10">
                      Copy Code
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>I Have Paid</CardTitle>
                <CardDescription>Submit this form only AFTER you have made the transfer.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="senderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sender Account Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Sent (₦)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Note (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any other details..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={submitClaim.isPending}>
                      {submitClaim.isPending ? "Submitting..." : "Submit Payment Claim"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
