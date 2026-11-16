import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ListTodo, Plus, CloudOff, SearchX, Trash2 } from "lucide-react";
import PageHeader from "./PageHeader";
import Button from "./Button";
import EmptyState from "./EmptyState";
import Skeleton from "./Skeleton";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";
import TaskToolbar from "./TaskToolbar";
import { useTasks } from "../context/TaskContext";
import { getErrorMessage } from "../utils/apiError";
import { STATUSES } from "../utils/constants";
import { DEFAULT_FILTERS, applyFilters, sortTasks } from "../utils/taskFilters";

// baseFilter অবশ্যই কম্পোনেন্টের বাইরে বানানো ফাংশন হতে হবে (useMemo ঠিক রাখতে)
export default function TaskList({
  title,
  baseFilter,
  emptyTitle,
  emptyDescription,
  hideStatus = false,
  hideCreate = false,
}) {
  const {
    tasks, categories, status,
    addTask, updateTask, setTaskStatus, deleteTask,
    bulkSetStatus, bulkDelete, reload,
  } = useTasks();

  // search লেখা URL-এ থাকে (?q=...), তাই Topbar থেকেও আসতে পারে
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const setQ = (value) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true }
    );

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState("newest");
  const [selectedIds, setSelectedIds] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingTask(null);
  }, []);
  const closeConfirm = useCallback(() => setDeleteTarget(null), []);
  const closeBulkDelete = useCallback(() => setBulkDeleteOpen(false), []);

  const base = useMemo(() => tasks.filter(baseFilter), [tasks, baseFilter]);
  const visible = useMemo(
    () => sortTasks(applyFilters(base, { q, ...filters }), sort),
    [base, q, filters, sort]
  );

  // শুধু এই মুহূর্তে দেখা টাস্কই "নির্বাচিত" ধরা হয়
  const selectedSet = new Set(selectedIds);
  const selected = visible.filter((t) => selectedSet.has(t.id));
  const allSelected = visible.length > 0 && selected.length === visible.length;

  const hasActive = q !== "" || Object.values(filters).some((v) => v !== "");

  const setFilter = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setQ("");
  };

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelectedIds(allSelected ? [] : visible.map((t) => t.id));

  const openCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };
  const openEdit = (task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  // error ছুড়লে TaskForm নিজে ধরে ফর্মে দেখায়
  const handleSubmit = async (data) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
      toast.success("Task updated");
    } else {
      await addTask(data);
      toast.success("Task created");
    }
    closeForm();
  };

  const handleToggle = async (task) => {
    try {
      await setTaskStatus(task.id, task.status === "completed" ? "todo" : "completed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await setTaskStatus(id, newStatus);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      toast.success("Task deleted");
      closeConfirm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const report = (result, doneText) => {
    if (result.failed === 0) toast.success(`${result.ok} ${doneText}`);
    else toast.error(`${result.ok} ${doneText}, ${result.failed} failed`);
  };

  const handleBulkStatus = async (newStatus) => {
    if (!newStatus || selected.length === 0) return;
    setBulkBusy(true);
    try {
      report(await bulkSetStatus(selected.map((t) => t.id), newStatus), "updated");
      setSelectedIds([]);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkBusy(true);
    try {
      report(await bulkDelete(selected.map((t) => t.id)), "deleted");
      setSelectedIds([]);
      closeBulkDelete();
    } finally {
      setBulkBusy(false);
    }
  };

  const loading = status === "idle" || status === "loading";
  const description =
    status === "ready"
      ? hasActive
        ? `${visible.length} of ${base.length} ${base.length === 1 ? "task" : "tasks"} shown`
        : `${base.length} ${base.length === 1 ? "task" : "tasks"}`
      : "Loading your tasks...";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={title} description={description} />
        {!hideCreate && (
          <Button onClick={openCreate} disabled={status !== "ready"}>
            <Plus size={18} /> New task
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-3 h-4 w-1/4" />
            </div>
          ))}
        </div>
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
        <>
          {base.length > 0 && (
            <TaskToolbar
              q={q}
              onQ={setQ}
              filters={filters}
              onFilter={setFilter}
              sort={sort}
              onSort={setSort}
              categories={categories}
              hideStatus={hideStatus}
              hasActive={hasActive}
              onReset={resetFilters}
            />
          )}

          {selected.length > 0 && (
            <div
              role="region"
              aria-label="Bulk actions"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm dark:border-indigo-500/30 dark:bg-indigo-500/10"
            >
              <span className="font-medium">{selected.length} selected</span>
              <select
                aria-label="Set status for selected tasks"
                value=""
                disabled={bulkBusy}
                onChange={(e) => handleBulkStatus(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Set status...</option>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <Button size="sm" variant="danger" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={14} /> Delete
              </Button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="ml-auto text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Clear selection
              </button>
            </div>
          )}

          {base.length === 0 && (
            <EmptyState
              icon={ListTodo}
              title={emptyTitle}
              description={emptyDescription}
              action={
                !hideCreate && <Button size="sm" onClick={openCreate}>Create task</Button>
              }
            />
          )}

          {base.length > 0 && visible.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No matching tasks"
              description="Try a different search or clear the filters."
              action={<Button size="sm" variant="secondary" onClick={resetFilters}>Clear filters</Button>}
            />
          )}

          {visible.length > 0 && (
            <>
              <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded accent-indigo-600"
                />
                Select all shown ({visible.length})
              </label>
              <ul className="space-y-3">
                {visible.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selectedSet.has(task.id)}
                    onSelect={toggleSelect}
                    onToggle={handleToggle}
                    onStatusChange={handleStatusChange}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Modal isOpen={formOpen} onClose={closeForm} title={editingTask ? "Edit task" : "New task"}>
        <TaskForm task={editingTask} onSubmit={handleSubmit} onCancel={closeForm} />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={closeConfirm}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete task?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : ""}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={closeBulkDelete}
        onConfirm={handleBulkDelete}
        loading={bulkBusy}
        title={`Delete ${selected.length} ${selected.length === 1 ? "task" : "tasks"}?`}
        message="The selected tasks will be permanently deleted. This cannot be undone."
        confirmText="Delete all"
      />
    </>
  );
}