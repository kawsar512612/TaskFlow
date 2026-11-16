import { Search, X } from "lucide-react";
import { PRIORITIES, STATUSES } from "../utils/constants";
import { DUE_FILTERS, SORTS } from "../utils/taskFilters";

const selectClass =
  "h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950";

export default function TaskToolbar({
  q,
  onQ,
  filters,
  onFilter,
  sort,
  onSort,
  categories,
  hideStatus,
  hasActive,
  onReset,
}) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search title, description or tags..."
          aria-label="Search tasks"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Filter by priority" value={filters.priority}
          onChange={(e) => onFilter("priority", e.target.value)} className={selectClass}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {!hideStatus && (
          <select aria-label="Filter by status" value={filters.status}
            onChange={(e) => onFilter("status", e.target.value)} className={selectClass}>
            <option value="">Any status</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}

        <select aria-label="Filter by category" value={filters.categoryId}
          onChange={(e) => onFilter("categoryId", e.target.value)} className={selectClass}>
          <option value="">Any category</option>
          <option value="none">No category</option>
          {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>

        <select aria-label="Filter by due date" value={filters.due}
          onChange={(e) => onFilter("due", e.target.value)} className={selectClass}>
          {DUE_FILTERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>

        <select aria-label="Sort tasks" value={sort}
          onChange={(e) => onSort(e.target.value)} className={`${selectClass} sm:ml-auto`}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}