import classNames from "../utils/classNames";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={classNames(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}