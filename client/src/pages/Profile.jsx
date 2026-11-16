import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dates";

export default function Profile() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />
      <Card className="max-w-lg">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="mt-0.5 break-words font-medium">{user.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="mt-0.5 break-words font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
            <dd className="mt-0.5 font-medium">{formatDate(String(user.createdAt).slice(0, 10))}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs text-slate-500">
          Editing your profile and changing your password are not built yet.
        </p>
      </Card>
    </>
  );
}