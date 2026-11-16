import { useState } from "react";
import FormField from "./FormField";
import Button from "./Button";
import { PRIORITIES, STATUSES } from "../utils/constants";
import { useTasks } from "../context/TaskContext";
import { getErrorMessage, getFieldErrors } from "../utils/apiError";

const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950";

function parseTags(text) {
  const list = text.split(",").map((t) => t.trim()).filter(Boolean);
  return [...new Set(list)];
}

export default function TaskForm({ task, onSubmit, onCancel }) {
  const { categories } = useTasks();

  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    categoryId: task?.categoryId ? String(task.categoryId) : "",
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    startDate: task?.startDate ?? "",
    dueDate: task?.dueDate ?? "",
    tags: task?.tags?.join(", ") ?? "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const next = {};
    const title = form.title.trim();
    if (!title) next.title = "Title is required.";
    else if (title.length > 100) next.title = "Title must be 100 characters or less.";
    if (form.description.length > 500)
      next.description = "Description must be 500 characters or less.";
    if (form.startDate && form.dueDate && form.startDate > form.dueDate)
      next.dueDate = "Due date cannot be before the start date.";
    const tags = parseTags(form.tags);
    if (tags.length > 5) next.tags = "Use at most 5 tags.";
    else if (tags.some((t) => t.length > 20)) next.tags = "Each tag must be 20 characters or less.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        priority: form.priority,
        status: form.status,
        startDate: form.startDate,
        dueDate: form.dueDate,
        tags: parseTags(form.tags),
      });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField label="Title" id="title" name="title" maxLength={100}
        value={form.title} onChange={handleChange} error={errors.title} />

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} maxLength={500}
          value={form.description} onChange={handleChange} className={`${fieldClass} py-2`} />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium">Category</label>
          <select id="categoryId" name="categoryId" value={form.categoryId}
            onChange={handleChange} className={`${fieldClass} h-11`}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>
          )}
        </div>
        <div>
          <label htmlFor="priority" className="mb-1.5 block text-sm font-medium">Priority</label>
          <select id="priority" name="priority" value={form.priority}
            onChange={handleChange} className={`${fieldClass} h-11`}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Status</label>
          <select id="status" name="status" value={form.status}
            onChange={handleChange} className={`${fieldClass} h-11`}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Start date (optional)" id="startDate" name="startDate"
          type="date" value={form.startDate} onChange={handleChange} error={errors.startDate} />
        <FormField label="Due date (optional)" id="dueDate" name="dueDate"
          type="date" value={form.dueDate} onChange={handleChange} error={errors.dueDate} />
      </div>

      <FormField label="Tags (optional, separated by commas)" id="tags" name="tags"
        placeholder="design, urgent" value={form.tags}
        onChange={handleChange} error={errors.tags} />

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
          {task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}