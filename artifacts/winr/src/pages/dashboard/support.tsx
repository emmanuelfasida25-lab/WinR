import { useListMyTickets, useCreateTicket, useGetTicket, usePostTicketMessage, getListMyTicketsQueryKey, getGetTicketQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";

const createSchema = z.object({
  subject: z.string().min(3, "Subject is required"),
  body: z.string().min(10, "Please provide more details"),
});

const messageSchema = z.object({
  body: z.string().min(1, "Message is required"),
});

export default function SupportPage() {
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Support</h1>
          <p className="text-muted-foreground mt-1">Get help from our team.</p>
        </div>

        {activeTicketId ? (
          <TicketView ticketId={activeTicketId} onBack={() => setActiveTicketId(null)} />
        ) : isCreating ? (
          <CreateTicket onBack={() => setIsCreating(false)} />
        ) : (
          <TicketList onOpenTicket={setActiveTicketId} onCreateNew={() => setIsCreating(true)} />
        )}
      </div>
    </SidebarLayout>
  );
}

function TicketList({ onOpenTicket, onCreateNew }: { onOpenTicket: (id: number) => void, onCreateNew: () => void }) {
  const { data: tickets, isLoading } = useListMyTickets();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>My Tickets</CardTitle>
        <Button onClick={onCreateNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse py-8 text-center">Loading tickets...</div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>You haven't created any support tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                onClick={() => onOpenTicket(ticket.id)}
                className="border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold">{ticket.subject}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.lastMessagePreview || "No messages yet"}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(ticket.updatedAt)}</p>
                </div>
                <div className={`shrink-0 inline-flex px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  ticket.status === "open" ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                }`}>
                  {ticket.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateTicket({ onBack }: { onBack: () => void }) {
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { subject: "", body: "" },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createTicket.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Ticket created", description: "Our support team will respond shortly." });
        queryClient.invalidateQueries({ queryKey: getListMyTicketsQueryKey() });
        onBack();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to create ticket", variant: "destructive" });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <CardTitle>Create New Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief summary of your issue" {...field} />
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Please provide details..." className="min-h-[150px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function TicketView({ ticketId, onBack }: { ticketId: number, onBack: () => void }) {
  const { data, isLoading } = useGetTicket(ticketId, { query: { enabled: !!ticketId, queryKey: getGetTicketQueryKey(ticketId) } });
  const postMessage = usePostTicketMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: { body: "" },
  });

  const onSubmit = (values: z.infer<typeof messageSchema>) => {
    postMessage.mutate({ ticketId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
        queryClient.invalidateQueries({ queryKey: getListMyTicketsQueryKey() });
        form.reset({ body: "" });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to send message", variant: "destructive" });
      }
    });
  };

  if (isLoading || !data) return <Card><CardContent className="p-8 text-center animate-pulse">Loading ticket...</CardContent></Card>;

  const { ticket, messages } = data;

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex flex-row items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <CardTitle className="text-xl">{ticket.subject}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Ticket #{ticket.id} • {ticket.status}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderRole === "user";
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mx-1">{formatDate(msg.createdAt)}</p>
            </div>
          );
        })}
      </CardContent>
      {ticket.status === "open" && (
        <div className="p-4 border-t border-border bg-card rounded-b-xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-0">
                    <FormControl>
                      <Input placeholder="Type your reply..." {...field} autoComplete="off" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={postMessage.isPending}>Send</Button>
            </form>
          </Form>
        </div>
      )}
    </Card>
  );
}
