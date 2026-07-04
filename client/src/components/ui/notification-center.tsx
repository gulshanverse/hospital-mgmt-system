import * as React from "react";
import { Bell, Activity, Check, ShieldAlert, Sparkles, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/lib/feature-flags";

export function NotificationCenter() {
  const { data: notifications, refetch } = trpc.analytics.getNotifications.useQuery();

  if (!isFeatureEnabled("ENABLE_NOTIFICATION_CENTER")) return null;

  const unreadCount = notifications?.length || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-all outline-hidden cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="h-4.5 w-4.5 text-foreground/80 hover:text-foreground transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden shadow-xl border border-border/80 bg-popover z-50">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-secondary/15">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif: any) => (
              <div
                key={notif.id}
                className="flex items-start gap-3 p-3.5 hover:bg-secondary/20 transition-colors duration-100"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-primary/5 text-primary shrink-0 mt-0.5">
                  <Activity className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight truncate">
                    {notif.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-normal mt-1 break-words">
                    {notif.message}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Inbox className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium">All caught up!</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">No new notifications.</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
