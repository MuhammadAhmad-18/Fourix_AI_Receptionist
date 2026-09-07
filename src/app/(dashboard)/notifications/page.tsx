import { Bell } from "lucide-react";
import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { notificationController } from "@/modules/notifications/notification.controller";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export default async function NotificationsPage() {
  const ctx = await getActorContextFromSession();
  const notifications = await notificationController.listMine(ctx);
  const unread = notifications.filter((n) => n.status !== "READ").length;

  return (
    <div className="page-shell max-w-3xl">
      <PageHeader
        eyebrow="System"
        title="Notifications"
        description={
          notifications.length === 0
            ? "Alerts addressed to you will collect here."
            : `${notifications.length} message${notifications.length === 1 ? "" : "s"}${unread ? ` · ${unread} unread` : ""}`
        }
      />

      {notifications.length === 0 ? (
        <div className="table-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-plum-surface text-plum ring-1 ring-plum-line/70">
            <Bell className="size-5" />
          </span>
          <span className="font-heading text-lg">You&rsquo;re all caught up</span>
          <span className="max-w-xs text-sm text-muted-foreground">
            Appointment reminders and system alerts will appear here as they are sent.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => {
            const unreadItem = n.status !== "READ";
            return (
              <li
                key={n.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_-1px_oklch(0.29_0.057_338/0.06),0_10px_30px_-24px_oklch(0.29_0.057_338/0.4)]"
              >
                {unreadItem && (
                  <span
                    aria-hidden
                    className="absolute inset-y-3 left-0 w-[3px] rounded-full"
                    style={{ background: "var(--brand-accent)" }}
                  />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {n.subject && (
                      <div className="font-heading text-[1.02rem] font-medium">
                        {n.subject}
                      </div>
                    )}
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      {new Date(n.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                  <StatusBadge status={n.status} className="mt-0.5 shrink-0" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
