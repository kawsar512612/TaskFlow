import { isOverdue, todayString } from "./dates";

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export const DUE_FILTERS = [
  { value: "", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Next 7 days" },
  { value: "none", label: "No due date" },
];

export const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "due", label: "Due soonest" },
  { value: "priority", label: "Priority (high first)" },
  { value: "title", label: "Title (A to Z)" },
];

export const DEFAULT_FILTERS = { priority: "", status: "", categoryId: "", due: "" };

// ---------- পেজের ভিত্তি (কোন পেজে কোন টাস্ক দেখাবে) ----------
export const allTasks = () => true;
export const isCompleted = (t) => t.status === "completed";
export const isImportant = (t) => t.priority === "high" && t.status !== "completed";
export const isUpcoming = (t) => t.status !== "completed" && Boolean(t.dueDate) && t.dueDate > todayString();
export const isTodayOrOverdue = (t) =>
  t.dueDate === todayString() || isOverdue(t);

// ---------- filter ----------
export function applyFilters(tasks, f) {
  const today = todayString();
  const weekEnd = addDays(today, 7);
  const q = (f.q || "").trim().toLowerCase();

  return tasks.filter((t) => {
    if (q) {
      const haystack = [t.title, t.description, ...t.tags].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.priority && t.priority !== f.priority) return false;
    if (f.status && t.status !== f.status) return false;

    if (f.categoryId === "none") {
      if (t.categoryId !== null) return false;
    } else if (f.categoryId && String(t.categoryId) !== f.categoryId) {
      return false;
    }

    switch (f.due) {
      case "overdue":
        if (!isOverdue(t)) return false;
        break;
      case "today":
        if (t.dueDate !== today) return false;
        break;
      case "week":
        if (!t.dueDate || t.dueDate < today || t.dueDate > weekEnd) return false;
        break;
      case "none":
        if (t.dueDate) return false;
        break;
      default:
        break;
    }
    return true;
  });
}

// ---------- sort (মূল array বদলায় না) ----------
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

export function sortTasks(tasks, sort) {
  const list = [...tasks];
  const byNewest = (a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id;

  switch (sort) {
    case "oldest":
      return list.sort((a, b) => -byNewest(a, b));
    case "due":
      // due date নেই এমন টাস্ক সবার শেষে
      return list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return byNewest(a, b);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate) || byNewest(a, b);
      });
    case "priority":
      return list.sort(
        (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byNewest(a, b)
      );
    case "title":
      return list.sort((a, b) => a.title.localeCompare(b.title) || byNewest(a, b));
    default:
      return list.sort(byNewest);
  }
}