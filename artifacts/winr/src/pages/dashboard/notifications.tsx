import { useListNotifications, useMarkAllNotificationsRead, useGetDashboardOverview, getListNotificationsQueryKey, getGetDashboardOverviewQueryKey } from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, AlertCircle, Info, Gift } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const eventSource = new EventSource('/api/notifications/stream');
    
    eventSource.addEventListener('notification', (event) => {
      queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
    });

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardOverviewQueryKey() });
        toast({ title: "Notifications marked as read" });
      }
    });
  };

  const getIcon = (kind: string) => {
    switch (kind) {
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "alert": return <AlertCircle className="h-5 w-5 text-destructive" />;
      case "bonus": return <Gift className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-1">Updates and alerts about your account.</p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} disabled={markAllRead.isPending} variant="outline">
              Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center animate-pulse">Loading notifications...</div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 sm:p-6 flex gap-4 ${!notif.read ? 'bg-primary/5' : ''}`}>
                    <div className="mt-1 shrink-0">
                      {getIcon(notif.kind)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h3 className={`font-bold ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm ${!notif.read ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                        {notif.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
