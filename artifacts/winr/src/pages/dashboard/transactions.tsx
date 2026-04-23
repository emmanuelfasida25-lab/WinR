import { useListTransactions } from "@workspace/api-client-react";
import { formatNaira, formatDate } from "@/lib/format";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useListTransactions({ limit: 100 });

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">Your complete earning and spending history.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center animate-pulse">Loading transactions...</div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isCredit = tx.amount > 0;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${isCredit ? "text-green-500" : "text-destructive"}`}>
                              {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              <span className="capitalize text-xs font-bold bg-muted px-2 py-1 rounded">
                                {tx.type.replace(/_/g, " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{tx.description}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(tx.createdAt)}</TableCell>
                          <TableCell className={`text-right font-bold ${isCredit ? "text-green-500" : "text-destructive"}`}>
                            {isCredit ? "+" : ""}{formatNaira(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground font-medium">
                            {formatNaira(tx.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
