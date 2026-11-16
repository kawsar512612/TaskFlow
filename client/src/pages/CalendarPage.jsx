import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, CloudOff, Pencil } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import Modal from "../components/Modal";
import TaskForm from "../components/TaskForm";
import { useTasks } from "../context/TaskContext";
import { formatDate, isOverdue, todayString } from "../utils/dates";
import classNames from "../utils/classNames";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

const DOT = { low: "bg-emerald-500", medium: "bg-amber-500", high: "bg-red-500" };

export default function CalendarPage() {
  const { tasks, status, updateTask, reload } = useTasks();

  const today = todayString();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(null);

  const closeForm = useCallback(() => setEditing(null), []);

  const byDate = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      (map[t.dueDate] ??= []).push(t);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const leading = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: days }, (_, i) => i + 1),
    ];
  }, [year, month]);

  const label = new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
    setSelected(today);
  };

  const selectedTasks = byDate[selected] ?? [];

  const handleSubmit = async (data) => {
    await updateTask(editing.id, data);
    toast.success("Task updated");
    closeForm();
  };

  const loading = status === "idle" || status === "loading";

  return (
    <>
      <PageHeader title="Calendar" description="Your tasks by due date." />

      {loading && (
        <Card aria-busy="true">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-64 w-full" />
        </Card>
      )}

      {status === "error" && (
        <EmptyState
          icon={CloudOff}
          title="Could not load your tasks"
          description="Check that the server is running, then try again."
          action={<Button size="sm" onClick={reload}>Try again</Button>}
        />
      )}

      {status === "ready" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold" aria-live="polite">{label}</h2>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="secondary" onClick={goToday}>Today</Button>
                <button
                  onClick={goPrev}
                  aria-label="Previous month"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goNext}
                  aria-label="Next month"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} />;

                const date = ymd(year, month, day);
                const list = byDate[date] ?? [];
                const isToday = date === today;
                const isSelected = date === selected;

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    aria-pressed={isSelected}
                    aria-label={`${formatDate(date)}, ${list.length} ${list.length === 1 ? "task" : "tasks"}`}
                    className={classNames(
                      "flex min-h-14 flex-col items-center rounded-lg border p-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:min-h-20 sm:items-start sm:p-1.5",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <span
                      className={classNames(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                        isToday && "bg-indigo-600 text-white"
                      )}
                    >
                      {day}
                    </span>

                    {list.length > 0 && (
                      <>
                        <span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                          {list.slice(0, 3).map((t) => (
                            <span key={t.id} className={classNames("h-1.5 w-1.5 rounded-full", DOT[t.priority])} />
                          ))}
                        </span>
                        <span className="mt-1 hidden w-full space-y-0.5 sm:block">
                          {list.slice(0, 2).map((t) => (
                            <span
                              key={t.id}
                              className={classNames(
                                "flex items-center gap-1 truncate text-left text-[11px]",
                                t.status === "completed" && "text-slate-400 line-through"
                              )}
                            >
                              <span className={classNames("h-1.5 w-1.5 shrink-0 rounded-full", DOT[t.priority])} />
                              <span className="truncate">{t.title}</span>
                            </span>
                          ))}
                          {list.length > 2 && (
                            <span className="block text-left text-[11px] text-slate-500">
                              +{list.length - 2} more
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Dot colors: <span className="text-emerald-500">low</span>,{" "}
              <span className="text-amber-500">medium</span>,{" "}
              <span className="text-red-500">high</span> priority. Only tasks with a due date appear here.
            </p>
          </Card>

          <Card>
            <h2 className="font-semibold">{formatDate(selected)}</h2>
            <p className="text-xs text-slate-500">
              {selectedTasks.length} {selectedTasks.length === 1 ? "task" : "tasks"} due
            </p>

            {selectedTasks.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Nothing is due on this day.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className={classNames("break-words text-sm font-medium", t.status === "completed" && "text-slate-400 line-through")}>
                        {t.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge type="priority" value={t.priority} />
                        <Badge type="status" value={t.status} />
                        {isOverdue(t) && (
                          <span className="text-xs font-semibold text-red-500">Overdue</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditing(t)}
                      aria-label={`Edit ${t.title}`}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Modal isOpen={Boolean(editing)} onClose={closeForm} title="Edit task">
        {editing && <TaskForm task={editing} onSubmit={handleSubmit} onCancel={closeForm} />}
      </Modal>
    </>
  );
}