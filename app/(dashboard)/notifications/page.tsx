import { requireSession } from "@/lib/auth/session";
import { listNotificationsForUser } from "@/lib/db/notifications";
import { NotificationsList } from "@/components/notifications/NotificationsList";

const PAGE_SIZE = 20;

/** Every notification for the signed-in user (phase-7), the bell's "View all" target. Server
 * renders the first page; the client list then keeps it in sync with the bell (shared TanStack
 * Query keys) and polls for new ones. */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const unreadOnly = params.filter === "unread";

  const initialData = await listNotificationsForUser(session.userId, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    unreadOnly,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Assignments, transfers, and warranty and maintenance alerts.
        </p>
      </div>
      <NotificationsList
        page={page}
        pageSize={PAGE_SIZE}
        unreadOnly={unreadOnly}
        initialData={initialData}
      />
    </div>
  );
}
