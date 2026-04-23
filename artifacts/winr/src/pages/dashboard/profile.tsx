import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, ShieldCheck } from "lucide-react";
import { useEffect } from "react";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone number is required").optional().or(z.literal("")),
  bankName: z.string().min(2, "Bank name is required").optional().or(z.literal("")),
  accountNumber: z.string().min(10, "Account number is required").optional().or(z.literal("")),
  accountName: z.string().min(2, "Account name is required").optional().or(z.literal("")),
});

export default function ProfilePage() {
  const { data: me, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      bankName: "",
      accountNumber: "",
      accountName: "",
    },
  });

  useEffect(() => {
    if (me) {
      form.reset({
        fullName: me.fullName || "",
        phone: me.phone || "",
        bankName: me.bankName || "",
        accountNumber: me.accountNumber || "",
        accountName: me.accountName || "",
      });
    }
  }, [me, form]);

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateMe.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Profile updated", description: "Your details have been saved successfully." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err.message || "Failed to update profile", variant: "destructive" });
      }
    });
  };

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal and banking information.</p>
        </div>

        {isLoading ? (
          <div className="animate-pulse py-8">Loading profile...</div>
        ) : (
          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-2xl">
                    {me?.fullName?.charAt(0) || me?.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{me?.fullName || "WINR User"}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{me?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        me?.status === "active" ? "bg-green-500/20 text-green-500" :
                        me?.status === "pending" ? "bg-amber-500/20 text-amber-500" :
                        "bg-destructive/20 text-destructive"
                      }`}>
                        {me?.status}
                      </div>
                      {me?.role === "admin" && (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Update your contact information.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="08012345678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="font-bold text-lg mb-4">Bank Information</h3>
                      <p className="text-sm text-muted-foreground mb-4">Required for withdrawals. Ensure these details match your real bank account.</p>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Guarantee Trust Bank" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="0123456789" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Account Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Exact name on the account" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={updateMe.isPending}>
                      {updateMe.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
