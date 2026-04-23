import { useAdminListTickets, useAdminGetTicket, useAdminReplyTicket, getAdminListTicketsQueryKey, getAdminGetTicketQueryKey } from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

const replySchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
  close: z.boolean().default(false),
});

export default function AdminTicketsPage() {
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to user inquiries.</p>
        </div>

        {activeTicketId ? (
          <AdminTicketView ticketId={activeTicketId} onBack={() => setActiveTicketId(null)} />
        ) : (
          <AdminTicketList onOpenTicket={setActiveTicketId} />
        )}
      </div>
    </SidebarLayout>
  );
}

function AdminTicketList({ onOpenTicket }: { onOpenTicket: (id: number) => void }) {
  const [status, setStatus] = useState<string>("open");
  const { data: tickets, isLoading } = useAdminListTickets({ 
    status: status !== "all" ? status : undefined 
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ticket Queue</CardTitle>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="all">All Tickets</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center animate-pulse">Loading tickets...</div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No tickets found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subject & Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="font-bold">{ticket.userEmail || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{ticket.subject}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">{ticket.lastMessagePreview || "No messages"}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        ticket.status === "open" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {ticket.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onOpenTicket(ticket.id)}>
                        <MessageSquare className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminTicketView({ ticketId, onBack }: { ticketId: number, onBack: () => void }) {
  const { data, isLoading } = useAdminGetTicket(ticketId, { query: { enabled: !!ticketId, queryKey: getAdminGetTicketQueryKey(ticketId) } });
  const reply = useAdminReplyTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: "", close: false },
  });

  const onSubmit = (values: z.infer<typeof replySchema>) => {
    reply.mutate({ ticketId, data: values }, {
      onSuccess: () => {
        toast({ title: "Reply sent" });
        queryClient.invalidateQueries({ queryKey: getAdminGetTicketQueryKey(ticketId) });
        queryClient.invalidateQueries({ queryKey: getAdminListTicketsQueryKey() });
        form.reset({ body: "", close: false });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading || !data) return <Card><CardContent className="p-8 text-center animate-pulse">Loading ticket details...</CardContent></Card>;

  const { ticket, messages } = data;

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex flex-row items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <CardTitle className="text-xl">{ticket.subject}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Ticket #{ticket.id} • User: {ticket.userEmail} • Status: {ticket.status}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isAdmin = msg.senderRole === "admin";
          return (
            <div key={msg.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"
              }`}>
                <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mx-1">{formatDate(msg.createdAt)} • {msg.senderRole}</p>
            </div>
          );
        })}
      </CardContent>
      {ticket.status === "open" && (
        <div className="p-4 border-t border-border bg-card rounded-b-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Type your reply..." {...field} autoComplete="off" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...form.register("close")} className="rounded border-border text-primary focus:ring-primary" />
                  Close ticket after replying
                </label>
                <Button type="submit" disabled={reply.isPending}>Send Reply</Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </Card>
  );
}
