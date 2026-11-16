export default function FormField({ label, id, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2 dark:bg-slate-950 ${
          error
            ? "border-red-400 focus:ring-red-400/30"
            : "border-slate-300 focus:border-indigo-400 focus:ring-indigo-400/30 dark:border-slate-700"
        }`}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}