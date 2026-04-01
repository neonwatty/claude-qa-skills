import { requireAuth } from "@/lib/session";
import { query } from "@/lib/db";
import MarkReadButton from "@/components/MarkReadButton";

interface NotificationRow {
  id: number;
  user_id: number;
  message: string;
  read: number;
  created_at: string;
}

export default async function NotificationsPage() {
  const user = await requireAuth();

  const notifications = query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [user.userId]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No notifications
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.read
                  ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                  : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {n.created_at}
                  </p>
                </div>
                {!n.read && <MarkReadButton notificationId={n.id} />}
                {!!n.read && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    Read
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
