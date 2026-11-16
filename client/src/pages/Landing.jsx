import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Organize your work with{" "}
        <span className="text-indigo-500">TaskFlow</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
        A simple, secure task manager with categories, priorities, deadlines
        and a progress dashboard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Get started <ArrowRight size={16} />
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}