import { requireAuth } from "@/lib/session";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Profile
      </h1>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <dl className="space-y-3 mb-6">
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-100">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Role
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-100">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {user.role}
              </span>
            </dd>
          </div>
        </dl>

        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Edit Profile
          </h2>
          <ProfileForm userId={user.userId} currentName={user.name} />
        </div>
      </div>
    </div>
  );
}
