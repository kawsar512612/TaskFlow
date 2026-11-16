import { Circle, CheckCircle2, Pencil, Trash2, CalendarDays, Tag } from "lucide-react";
import Badge from "./Badge";
import classNames from "../utils/classNames";
import { STATUSES } from "../utils/constants";
import { formatDate, isOverdue } from "../utils/dates";

export default function TaskCard({
  task,
  selected = false,
  onSelect,
  onToggle,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  const done = task.status === "completed";
  const overdue = isOverdue(task);

  return (
    <li
      className={classNames(
        "rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900",
        selected
          ? "border-indigo-400 ring-1 ring-indigo-400"
          : "border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(task.id)}
            aria-label={`Select ${task.title}`}
            className="mt-1.5 h-4 w-4 shrink-0 rounded accent-indigo-600"
          />
        )}

        <button
          onClick={() => onToggle(task)}
          aria-label={done ? "Mark as not completed" : "Mark as completed"}
          className={classNames(
            "mt-0.5 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
            done ? "text-emerald-500" : "text-slate-400 hover:text-indigo-500"
          )}
        >
          {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className={classNames("break-words font-semibold", done && "text-slate-400 line-through")}>
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
              {task.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge type="priority" value={task.priority} />
            <Badge type="status" value={task.status} />
            {task.category && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {task.category}
              </span>
            )}
            {task.dueDate && (
              <span
                className={classNames(
                  "inline-flex items-center gap-1 text-xs",
                  overdue ? "font-semibold text-red-500" : "text-slate-500"
                )}
              >
                <CalendarDays size={14} />
                {overdue ? "Overdue: " : "Due "}
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>

          {task.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs text-indigo-500">
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <select
            aria-label={`Change status of ${task.title}`}
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            className="hidden h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs sm:block dark:border-slate-700 dark:bg-slate-950"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={() => onEdit(task)}
            aria-label={`Edit ${task.title}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(task)}
            aria-label={`Delete ${task.title}`}
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </li>
  );
}