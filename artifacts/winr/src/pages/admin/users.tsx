import { useAdminListUsers, useAdminUpdateBalance, useAdminSetUserStatus, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MoreHorizontal, Search, Settings2 } from "lucide-react";

const balanceSchema = z.object({
  delta: z.coerce.number().min(-10000000).max(10000000),
  reason: z.string().min(3, "Reason required"),
});

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [debouncedQ, setDebouncedQ] = useState("");

  const { data: users, isLoading } = useAdminListUsers({ 
    q: debouncedQ || undefined, 
    status: status !== "all" ? status : undefined 
  });

  return (
    <SidebarLayout isAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage platform users, balances, and statuses.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle>User Directory</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search email, name, code..." 
                    className="pl-8"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setDebouncedQ(q)}
                    onBlur={() => setDebouncedQ(q)}
                  />
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center animate-pulse">Loading users...</div>
            ) : !users || users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Codes</TableHead>
                      <TableHead>Status / Role</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-bold">{user.fullName || "—"}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">Joined: {formatDate(user.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs"><span className="text-muted-foreground">Ref:</span> <span className="font-mono">{user.referenceCode}</span></div>
                          <div className="text-xs mt-1"><span className="text-muted-foreground">Aff:</span> <span className="font-mono text-primary">{user.referralCode}</span></div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              user.status === "active" ? "bg-green-500/10 text-green-500" :
                              user.status === "suspended" ? "bg-destructive/10 text-destructive" :
                              "bg-amber-500/10 text-amber-500"
                            }`}>
                              {user.status}
                            </span>
                            {user.role === "admin" && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">Admin</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNaira(user.balance)}
                        </TableCell>
                        <TableCell>
                          <UserActions user={user} params={{ q: debouncedQ, status: status !== "all" ? status : undefined }} />
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

function UserActions({ user, params }: { user: any, params: any }) {
  const setStatus = useAdminSetUserStatus();
  const updateBalance = useAdminUpdateBalance();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [balanceOpen, setBalanceOpen] = useState(false);

  const balanceForm = useForm<z.infer<typeof balanceSchema>>({
    resolver: zodResolver(balanceSchema),
    defaultValues: { delta: 0, reason: "" }
  });

  const onStatusChange = (newStatus: "active" | "pending" | "suspended") => {
    setStatus.mutate({ userId: user.id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: "Status updated" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey(params) });
      }
    });
  };

  const onBalanceSubmit = (values: z.infer<typeof balanceSchema>) => {
    updateBalance.mutate({ userId: user.id, data: values }, {
      onSuccess: () => {
        toast({ title: "Balance updated" });
        queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey(params) });
        setBalanceOpen(false);
        balanceForm.reset();
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Update Balance">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Balance for {user.email}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm">Current Balance: <strong className="text-lg">{formatNaira(user.balance)}</strong></p>
            <Form {...balanceForm}>
              <form onSubmit={balanceForm.handleSubmit(onBalanceSubmit)} className="space-y-4">
                <FormField
                  control={balanceForm.control}
                  name="delta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount to Add/Remove (use negative for deduction)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={balanceForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Manual task credit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={updateBalance.isPending}>
                  Update Balance
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onStatusChange("active")} disabled={user.status === "active"}>
            Mark Active
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("pending")} disabled={user.status === "pending"}>
            Mark Pending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("suspended")} disabled={user.status === "suspended"} className="text-destructive">
            Suspend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
