import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Circle, Clock, CloudOff, ListTodo, Percent,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { useTasks } from "../context/TaskContext";
import { getStats } from "../services/statsService";
import { formatDate, todayString } from "../utils/dates";
import { sortTasks } from "../utils/taskFilters";

const COLORS = { created: "#6366f1", completed: "#10b981" };
const PRIORITY_COLORS = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
const AXIS = { fill: "#94a3b8", fontSize: 12 };

const tones = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

function StatCard({ label, value, icon: Icon, tone, children }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {children}
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
    </Card>
  );
}

function ActivityChart({ data, xKey }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.15)" }} contentStyle={{ borderRadius: 8 }} />
        <Legend />
        <Bar dataKey="created" name="Created" fill={COLORS.created} radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill={COLORS.completed} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const dayLabel = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-GB", { month: "short" });

function TaskMiniList({ title, tasks, empty, ready }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Link to="/tasks" className="text-xs font-medium text-indigo-500 hover:underline">
          View all
        </Link>
      </div>
      {!ready ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {t.dueDate ? `Due ${formatDate(t.dueDate)}` : "No due date"}
                </p>
              </div>
              <Badge type="priority" value={t.priority} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { tasks, status: taskStatus } = useTasks();
  const [state, setState] = useState({ status: "loading", stats: null });
  const [attempt, setAttempt] = useState(0);

  // পেজ খুললে (বা "Try again" চাপলে) সার্ভার থেকে হিসাব আনে
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", stats: null });
    getStats()
      .then((stats) => !cancelled && setState({ status: "ready", stats }))
      .catch(() => !cancelled && setState({ status: "error", stats: null }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const tasksReady = taskStatus === "ready";

  const recent = useMemo(() => sortTasks(tasks, "newest").slice(0, 5), [tasks]);
  const deadlines = useMemo(() => {
    const today = todayString();
    return tasks
      .filter((t) => t.status !== "completed" && t.dueDate && t.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  const { stats } = state;
  const weekly = stats?.weekly.map((d) => ({ ...d, label: dayLabel(d.date) }));
  const monthly = stats?.monthly.map((m) => ({ ...m, label: monthLabel(m.month) }));
  const priorityData = stats
    ? ["low", "medium", "high"]
        .map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1), value: stats.priority[k] }))
        .filter((p) => p.value > 0)
    : [];

  return (
    <>
      <PageHeader title="Dashboard" description="Your productivity at a glance." />

      {state.status === "error" && (
        <EmptyState
          icon={CloudOff}
          title="Could not load your statistics"
          description="Check that the server is running, then try again."
          action={<Button size="sm" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
        />
      )}

      {state.status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n}>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-4 h-8 w-1/3" />
            </Card>
          ))}
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total tasks" value={stats.totals.total} icon={ListTodo} tone="indigo" />
            <StatCard label="Completed" value={stats.totals.completed} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Pending (todo)" value={stats.totals.todo} icon={Circle} tone="amber" />
            <StatCard label="In progress" value={stats.totals.inProgress} icon={Clock} tone="blue" />
            <StatCard label="Overdue" value={stats.totals.overdue} icon={AlertTriangle} tone="red" />
            <StatCard label="Completion" value={`${stats.totals.completionRate}%`} icon={Percent} tone="emerald">
              <div
                role="progressbar"
                aria-valuenow={stats.totals.completionRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Completion rate"
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${stats.totals.completionRate}%` }}
                />
              </div>
            </StatCard>
          </div>

          {stats.totals.total === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={ListTodo}
                title="No data yet"
                description="Create some tasks and your charts will appear here."
                action={
                  <Link
                    to="/tasks"
                    className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Go to tasks
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Weekly productivity" subtitle="Last 7 days">
                <ActivityChart data={weekly} xKey="label" />
              </ChartCard>
              <ChartCard title="Monthly productivity" subtitle="Last 6 months">
                <ActivityChart data={monthly} xKey="label" />
              </ChartCard>
              <ChartCard title="Priority distribution" subtitle="All your tasks">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} dataKey="value" nameKey="name"
                      innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {priorityData.map((p) => (
                        <Cell key={p.key} fill={PRIORITY_COLORS[p.key]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <div className="grid gap-4">
                <TaskMiniList title="Upcoming deadlines" tasks={deadlines} ready={tasksReady}
                  empty="No unfinished tasks with an upcoming due date." />
              </div>
            </div>
          )}

          <div className="mt-4">
            <TaskMiniList title="Recent tasks" tasks={recent} ready={tasksReady}
              empty="Your newest tasks will show up here." />
          </div>
        </>
      )}
    </>
  );
}