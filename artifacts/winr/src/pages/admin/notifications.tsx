import { useAdminBroadcast } from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const broadcastSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(10, "Message must be at least 10 characters"),
  userId: z.coerce.number().optional().or(z.literal("")),
});

export default function AdminBroadcastPage() {
  const broadcast = useAdminBroadcast();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof broadcastSchema>>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", body: "", userId: "" },
  });

  const onSubmit = (values: z.infer<typeof broadcastSchema>) => {
    const payload = {
      title: values.title,
      body: values.body,
      userId: values.userId ? Number(values.userId) : null
    };

    broadcast.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Broadcast sent successfully" });
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Error sending broadcast", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Broadcast</h1>
          <p className="text-muted-foreground mt-1">Send notifications to all users or a specific user.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Notification</CardTitle>
            <CardDescription>
              Leave User ID blank to send to ALL active users. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. System Maintenance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Body</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details of the notification..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target User ID (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Leave blank for all users" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={broadcast.isPending} className="w-full">
                  {broadcast.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
