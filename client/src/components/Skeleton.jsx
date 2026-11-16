import classNames from "../utils/classNames";

// আকার className দিয়ে ঠিক হবে, যেমন <Skeleton className="h-4 w-32" />
export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden="true"
      className={classNames(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-800",
        className
      )}
    />
  );
}