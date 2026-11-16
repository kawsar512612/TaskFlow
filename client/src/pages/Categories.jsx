import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import FormField from "../components/FormField";
import { useTasks } from "../context/TaskContext";
import { getErrorMessage, getFieldErrors } from "../utils/apiError";

function CategoryForm({ category, onSubmit, onCancel }) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "#6366f1");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setErrors({ name: "Name is required." });
    if (trimmed.length > 50) return setErrors({ name: "Name must be 50 characters or less." });

    setErrors({});
    setFormError("");
    setSubmitting(true);
    try {
      await onSubmit({ name: trimmed, color });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label="Name" id="cat-name" maxLength={50} value={name}
        onChange={(e) => setName(e.target.value)} error={errors.name} />

      <div>
        <label htmlFor="cat-color" className="mb-1.5 block text-sm font-medium">Color</label>
        <input id="cat-color" type="color" value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-11 w-20 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950" />
        {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}

export default function Categories() {
  const { categories, tasks, status, addCategory, updateCategory, deleteCategory } = useTasks();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);
  const closeConfirm = useCallback(() => setDeleteTarget(null), []);

  const countFor = (id) => tasks.filter((t) => t.categoryId === id).length;

  const handleSubmit = async (data) => {
    if (editing) {
      await updateCategory(editing.id, data);
      toast.success("Category updated");
    } else {
      await addCategory(data);
      toast.success("Category created");
    }
    closeForm();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success("Category deleted");
      closeConfirm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const ready = status === "ready";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Categories" description="Group your tasks with your own categories." />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={!ready}>
          <Plus size={18} /> New category
        </Button>
      </div>

      {ready && categories.length === 0 && (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Create a category to organize your tasks."
        />
      )}

      {ready && categories.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const count = countFor(c.id);
            return (
              <li key={c.id}>
                <Card className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {count} {count === 1 ? "task" : "tasks"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditing(c); setFormOpen(true); }}
                    aria-label={`Edit ${c.name}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    aria-label={`Delete ${c.name}`}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={formOpen} onClose={closeForm} title={editing ? "Edit category" : "New category"}>
        <CategoryForm category={editing} onSubmit={handleSubmit} onCancel={closeForm} />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={closeConfirm}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete category?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" will be deleted. Its tasks are kept, but they will have no category.`
            : ""
        }
      />
    </>
  );
}