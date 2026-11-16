import classNames from "../utils/classNames";

const styles = {
  priority: {
    low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    high: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
  status: {
    todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
};

const labels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function Badge({ type, value }) {
  const style = styles[type]?.[value] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style
      )}
    >
      {labels[value] ?? value}
    </span>
  );
}