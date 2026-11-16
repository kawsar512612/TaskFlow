import { Moon, Sun } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { useTheme } from "../context/ThemeContext";
import classNames from "../utils/classNames";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  const option = (value, label, Icon) => (
    <button
      type="button"
      aria-pressed={theme === value}
      onClick={() => theme !== value && toggleTheme()}
      className={classNames(
        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
        theme === value
          ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <>
      <PageHeader title="Settings" description="Your preferences." />
      <Card className="max-w-lg">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Saved in this browser.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {option("light", "Light", Sun)}
          {option("dark", "Dark", Moon)}
        </div>
      </Card>
    </>
  );
}